/**
 * PiPilot — Admin Dashboard
 * ---------------------------------------------------------------------------
 * A standalone, feature-rich admin console for the PiPilot build hub.
 *
 *   • Multi-tab: Overview · Projects · Users · API Keys · Usage · Deployments
 *                · Models · Settings
 *   • Collapsible IDE-style activity rail (desktop) + slide-in drawer (mobile)
 *   • Command palette (⌘K / Ctrl-K), toasts, skeletons, empty & error states
 *   • Charts via Recharts, icons via lucide-react, layout via Tailwind + a
 *     fully self-contained, scoped <style> block (works even without the host
 *     Tailwind theme).
 *
 * REAL DATA — everything the UI shows comes from a single injectable
 * `AdminDataAdapter`. Pass your own to wire it to a live backend:
 *
 *     import Admin, { AdminDataAdapter } from "./Admin";
 *
 *     const adapter: AdminDataAdapter = {
 *       getStats:   (r)   => fetch(`/api/admin/stats?range=${r}`).then(x => x.json()),
 *       listProjects: (q) => fetch(`/api/admin/projects?...`).then(x => x.json()),
 *       // ...see api.md for the full contract
 *     };
 *
 *     <Admin adapter={adapter} onSignOut={() => auth.signOut()} />
 *
 * With no adapter it falls back to a deterministic mock so you can drop it in
 * and see it working immediately. See ./api.md for the complete API reference.
 *
 * Dependencies:  react ^18 · recharts ^2 · lucide-react
 * License:       MIT — ship it.
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  createContext,
  useContext,
} from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ChevronLeft,
  Command,
  Copy,
  Cpu as CpuIcon,
  CreditCard,
  Download,
  FolderKanban,
  Globe,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  Moon,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Settings as SettingsIcon,
  Smartphone,
  Sun,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════════
 *  1 · TYPES  —  the shape of everything the dashboard renders
 * ════════════════════════════════════════════════════════════════════════ */

export type TimeRange = "24h" | "7d" | "30d" | "90d";

export type AppKind = "web" | "mobile" | "desktop" | "api" | "package";

export type Trend = "up" | "down" | "flat";

export interface StatCard {
  id: string;
  label: string;
  value: number;
  /** e.g. "$", "%" or "" — rendered before/after value per `unitSide` */
  unit?: string;
  unitSide?: "prefix" | "suffix";
  /** percentage change vs previous period, e.g. 12.4 or -3.1 */
  delta?: number;
  trend?: Trend;
  /** short sparkline series (raw values) */
  spark?: number[];
  /** accent key: orange | green | blue | purple | amber | red */
  accent?: AccentKey;
}

export type AccentKey = "orange" | "green" | "blue" | "purple" | "amber" | "red";

export interface SeriesPoint {
  /** x-axis label, e.g. "Mon" or "12:00" or "Jan 4" */
  t: string;
  [key: string]: string | number;
}

export interface Segment {
  name: string;
  value: number;
  accent?: AccentKey;
}

export type ProjectStatus = "building" | "live" | "failed" | "paused" | "queued";

export interface Project {
  id: string;
  name: string;
  kind: AppKind;
  framework: string;
  owner: string;
  status: ProjectStatus;
  /** ISO timestamp of last activity */
  updatedAt: string;
  /** tokens consumed by this project this period */
  tokens: number;
}

export type UserPlan = "free" | "pro" | "team" | "enterprise";
export type UserRole = "owner" | "admin" | "member" | "viewer";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: UserPlan;
  role: UserRole;
  projects: number;
  /** ISO timestamp */
  lastActive: string;
  status: "active" | "invited" | "suspended";
}

export interface ApiKey {
  id: string;
  name: string;
  /** masked, e.g. "pk_live_••••••4f2a" */
  masked: string;
  scopes: string[];
  createdAt: string;
  lastUsed: string | null;
  status: "active" | "revoked";
}

export type DeployState = "success" | "building" | "failed" | "canceled";

export interface Deployment {
  id: string;
  project: string;
  env: "production" | "preview" | "development";
  state: DeployState;
  commit: string;
  branch: string;
  author: string;
  /** ISO timestamp */
  createdAt: string;
  /** seconds */
  duration: number;
}

export interface ModelHealth {
  id: string;
  provider: "kilo" | "openrouter" | string;
  /** context window in tokens */
  context: number;
  maxTokens: number;
  status: "healthy" | "degraded" | "down";
  /** requests routed to this model this period */
  requests: number;
  /** success rate 0..100 */
  successRate: number;
  /** median latency ms */
  latencyMs: number;
  isFallback: boolean;
}

export interface ActivityEvent {
  id: string;
  kind: "deploy" | "build" | "user" | "billing" | "key" | "system";
  title: string;
  meta?: string;
  /** ISO timestamp */
  at: string;
}

export interface Settings {
  platformName: string;
  supportEmail: string;
  defaultModel: string;
  allowSignups: boolean;
  requireEmailVerify: boolean;
  maintenanceMode: boolean;
  monthlyTokenBudget: number;
}

export interface Query {
  search?: string;
  status?: string;
  kind?: string;
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

/* The single seam between UI and your backend. Implement it, pass it in. */
export interface AdminDataAdapter {
  getStats(range: TimeRange): Promise<StatCard[]>;
  getBuildSeries(range: TimeRange): Promise<SeriesPoint[]>;
  getAppTypeBreakdown(): Promise<Segment[]>;
  getTokenUsage(range: TimeRange): Promise<SeriesPoint[]>;
  listProjects(q: Query): Promise<Paginated<Project>>;
  listUsers(q: Query): Promise<Paginated<AdminUser>>;
  listApiKeys(): Promise<ApiKey[]>;
  createApiKey(name: string): Promise<ApiKey>;
  revokeApiKey(id: string): Promise<void>;
  listDeployments(q: Query): Promise<Paginated<Deployment>>;
  getModelHealth(): Promise<ModelHealth[]>;
  getActivity(): Promise<ActivityEvent[]>;
  getSettings(): Promise<Settings>;
  saveSettings(patch: Partial<Settings>): Promise<Settings>;
}

export interface AdminProps {
  /** Wire this to your API. Omit to run against the built-in mock adapter. */
  adapter?: AdminDataAdapter;
  /** Signed-in operator, shown in the top bar. */
  operator?: { name: string; email: string; avatarUrl?: string };
  /** Default color scheme. */
  defaultTheme?: "dark" | "light";
  onSignOut?: () => void;
  /** Called when a nav tab changes — useful for URL sync. */
  onTabChange?: (tab: TabId) => void;
}

/* ══════════════════════════════════════════════════════════════════════════
 *  2 · MOCK ADAPTER  —  deterministic data so it renders with zero wiring
 * ════════════════════════════════════════════════════════════════════════ */

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const rnd = seeded(42);
const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
const iso = (minsAgo: number) =>
  new Date(Date.now() - minsAgo * 60_000).toISOString();

const RANGE_POINTS: Record<TimeRange, number> = { "24h": 24, "7d": 7, "30d": 30, "90d": 30 };
const RANGE_LABEL = (range: TimeRange, i: number, n: number): string => {
  if (range === "24h") return `${String((i) % 24).padStart(2, "0")}:00`;
  const d = new Date(Date.now() - (n - 1 - i) * 86_400_000);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const FRAMEWORKS = ["Next.js", "Vite + React", "Expo", "SvelteKit", "Tauri", "FastAPI", "Hono", "Remix"];
const KINDS: AppKind[] = ["web", "mobile", "desktop", "api", "package"];
const P_STATUS: ProjectStatus[] = ["building", "live", "failed", "paused", "queued"];
const NAMES = ["Nova Commerce", "Atlas CRM", "Pixel Notes", "Ledger API", "Orbit Chat", "Drift Docs", "Sonar Analytics", "Comet Wallet", "Prism UI Kit", "Relay Gateway", "Harbor Deploy", "Quill Editor", "Vertex Store", "Ember Mobile", "Cascade Auth"];
const PEOPLE = ["Hans Ade", "Mara Okoro", "Yuki Tanaka", "Leon Weiss", "Priya Nair", "Diego Santos", "Amina Bello", "Tom Fischer"];

function mockProjects(): Project[] {
  return Array.from({ length: 47 }, (_, i) => ({
    id: `proj_${1000 + i}`,
    name: `${pick(NAMES)}${i > 14 ? " " + (i % 9) : ""}`,
    kind: pick(KINDS),
    framework: pick(FRAMEWORKS),
    owner: pick(PEOPLE),
    status: pick(P_STATUS),
    updatedAt: iso(Math.floor(rnd() * 4000)),
    tokens: Math.floor(rnd() * 900_000) + 12_000,
  }));
}
function mockUsers(): AdminUser[] {
  const plans: UserPlan[] = ["free", "pro", "team", "enterprise"];
  const roles: UserRole[] = ["owner", "admin", "member", "viewer"];
  return Array.from({ length: 38 }, (_, i) => {
    const name = pick(PEOPLE) + (i > 7 ? ` ${i}` : "");
    return {
      id: `usr_${2000 + i}`,
      name,
      email: name.toLowerCase().replace(/[^a-z]+/g, ".") + "@pipilot.dev",
      plan: pick(plans),
      role: pick(roles),
      projects: Math.floor(rnd() * 24),
      lastActive: iso(Math.floor(rnd() * 5000)),
      status: rnd() > 0.85 ? "invited" : rnd() > 0.05 ? "active" : "suspended",
    };
  });
}
function mockDeploys(): Deployment[] {
  const states: DeployState[] = ["success", "building", "failed", "canceled"];
  const envs: Deployment["env"][] = ["production", "preview", "development"];
  return Array.from({ length: 42 }, (_, i) => ({
    id: `dpl_${3000 + i}`,
    project: pick(NAMES),
    env: pick(envs),
    state: rnd() > 0.75 ? pick(states) : "success",
    commit: Math.random().toString(16).slice(2, 9),
    branch: pick(["main", "develop", "feat/ui", "fix/api", "release"]),
    author: pick(PEOPLE),
    createdAt: iso(Math.floor(rnd() * 3000)),
    duration: Math.floor(rnd() * 240) + 12,
  }));
}
let MOCK_KEYS: ApiKey[] = [
  { id: "key_1", name: "Production Server", masked: "pk_live_••••••4f2a", scopes: ["builds:write", "deploy:write"], createdAt: iso(60 * 24 * 40), lastUsed: iso(14), status: "active" },
  { id: "key_2", name: "CI Pipeline", masked: "pk_live_••••••9b71", scopes: ["builds:read", "deploy:write"], createdAt: iso(60 * 24 * 18), lastUsed: iso(220), status: "active" },
  { id: "key_3", name: "Local Dev", masked: "pk_test_••••••1c04", scopes: ["builds:read"], createdAt: iso(60 * 24 * 6), lastUsed: null, status: "active" },
  { id: "key_4", name: "Old Webhook", masked: "pk_live_••••••e8d3", scopes: ["events:read"], createdAt: iso(60 * 24 * 120), lastUsed: iso(60 * 24 * 90), status: "revoked" },
];

function paginate<T>(rows: T[], q: Query): Paginated<T> {
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 8;
  const start = (page - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), total: rows.length, page, pageSize };
}
const wait = <T,>(v: T, ms = 380): Promise<T> => new Promise((r) => setTimeout(() => r(v), ms));

export function createMockAdapter(): AdminDataAdapter {
  const projects = mockProjects();
  const users = mockUsers();
  const deploys = mockDeploys();
  let settings: Settings = {
    platformName: "PiPilot",
    supportEmail: "support@pipilot.dev",
    defaultModel: "kilo-auto/free",
    allowSignups: true,
    requireEmailVerify: true,
    maintenanceMode: false,
    monthlyTokenBudget: 500_000_000,
  };

  const filterProjects = (q: Query) =>
    projects.filter(
      (p) =>
        (!q.search || (p.name + p.owner + p.framework).toLowerCase().includes(q.search.toLowerCase())) &&
        (!q.status || q.status === "all" || p.status === q.status) &&
        (!q.kind || q.kind === "all" || p.kind === q.kind)
    );
  const filterUsers = (q: Query) =>
    users.filter(
      (u) =>
        (!q.search || (u.name + u.email).toLowerCase().includes(q.search.toLowerCase())) &&
        (!q.status || q.status === "all" || u.plan === q.status)
    );
  const filterDeploys = (q: Query) =>
    deploys.filter(
      (d) =>
        (!q.search || (d.project + d.branch + d.author).toLowerCase().includes(q.search.toLowerCase())) &&
        (!q.status || q.status === "all" || d.state === q.status)
    );

  return {
    getStats: (range) =>
      wait([
        { id: "builds", label: "Active builds", value: 312 + Math.floor(rnd() * 40), delta: 12.4, trend: "up", accent: "orange", spark: sparkFor("orange") },
        { id: "users", label: "Total users", value: 8420, delta: 4.8, trend: "up", accent: "blue", spark: sparkFor("blue") },
        { id: "api", label: "API calls", value: 1_284_902, delta: 23.1, trend: "up", accent: "green", spark: sparkFor("green"), unit: "", },
        { id: "mrr", label: "MRR", value: 48_250, unit: "$", unitSide: "prefix", delta: -2.3, trend: "down", accent: "amber", spark: sparkFor("amber") },
      ] as StatCard[]),
    getBuildSeries: (range) => {
      const n = RANGE_POINTS[range];
      return wait(
        Array.from({ length: n }, (_, i) => ({
          t: RANGE_LABEL(range, i, n),
          builds: Math.floor(120 + rnd() * 220 + Math.sin(i / 2) * 40),
          deploys: Math.floor(40 + rnd() * 90),
        }))
      );
    },
    getAppTypeBreakdown: () =>
      wait([
        { name: "Web", value: 3120, accent: "orange" },
        { name: "Mobile", value: 1840, accent: "blue" },
        { name: "API", value: 1290, accent: "green" },
        { name: "Desktop", value: 620, accent: "purple" },
        { name: "Package", value: 410, accent: "amber" },
      ]),
    getTokenUsage: (range) => {
      const n = RANGE_POINTS[range];
      return wait(
        Array.from({ length: n }, (_, i) => ({
          t: RANGE_LABEL(range, i, n),
          tokens: Math.floor(2_000_000 + rnd() * 6_000_000),
        }))
      );
    },
    listProjects: (q) => wait(paginate(filterProjects(q), q)),
    listUsers: (q) => wait(paginate(filterUsers(q), q)),
    listApiKeys: () => wait([...MOCK_KEYS]),
    createApiKey: (name) => {
      const k: ApiKey = {
        id: "key_" + Math.random().toString(16).slice(2, 8),
        name,
        masked: "pk_live_••••••" + Math.random().toString(16).slice(2, 6),
        scopes: ["builds:read"],
        createdAt: new Date().toISOString(),
        lastUsed: null,
        status: "active",
      };
      MOCK_KEYS = [k, ...MOCK_KEYS];
      return wait(k, 500);
    },
    revokeApiKey: (id) => {
      MOCK_KEYS = MOCK_KEYS.map((k) => (k.id === id ? { ...k, status: "revoked" } : k));
      return wait(undefined as void, 300);
    },
    listDeployments: (q) => wait(paginate(filterDeploys(q), q)),
    getModelHealth: () =>
      wait([
        { id: "kilo-auto/free", provider: "kilo", context: 256_000, maxTokens: 10_000, status: "healthy", requests: 842_100, successRate: 99.2, latencyMs: 640, isFallback: false },
        { id: "nvidia/nemotron-3-super-120b-a12b:free", provider: "kilo", context: 1_000_000, maxTokens: 262_144, status: "healthy", requests: 210_400, successRate: 98.1, latencyMs: 910, isFallback: true },
        { id: "nvidia/nemotron-3-ultra-550b-a55b:free", provider: "kilo", context: 1_000_000, maxTokens: 65_536, status: "degraded", requests: 41_200, successRate: 91.7, latencyMs: 1720, isFallback: true },
        { id: "poolside/laguna-xs-2.1:free", provider: "kilo", context: 262_144, maxTokens: 32_768, status: "healthy", requests: 66_050, successRate: 97.4, latencyMs: 780, isFallback: true },
        { id: "qwen/qwen3-coder:free", provider: "openrouter", context: 1_048_576, maxTokens: 262_000, status: "healthy", requests: 122_300, successRate: 96.9, latencyMs: 1130, isFallback: true },
        { id: "minimax/minimax-m2.5:free", provider: "openrouter", context: 200_000, maxTokens: 40_000, status: "down", requests: 0, successRate: 0, latencyMs: 0, isFallback: true },
      ]),
    getActivity: () =>
      wait([
        { id: "a1", kind: "deploy", title: "Nova Commerce deployed to production", meta: "main · 42s", at: iso(3) },
        { id: "a2", kind: "user", title: "Priya Nair upgraded to Team", meta: "Billing", at: iso(19) },
        { id: "a3", kind: "build", title: "Ledger API build failed", meta: "type error · api/routes.ts", at: iso(37) },
        { id: "a4", kind: "key", title: "New API key created — CI Pipeline", meta: "builds:read", at: iso(66) },
        { id: "a5", kind: "system", title: "Model fallback: minimax-m2.5 marked down", meta: "auto-routed to nemotron-3-super", at: iso(88) },
        { id: "a6", kind: "billing", title: "Invoice #2043 paid — $1,200", meta: "Enterprise", at: iso(140) },
      ]),
    getSettings: () => wait(settings),
    saveSettings: (patch) => {
      settings = { ...settings, ...patch };
      return wait(settings, 400);
    },
  };
}

function sparkFor(_k: AccentKey): number[] {
  return Array.from({ length: 16 }, (_, i) => 20 + Math.round(rnd() * 60 + Math.sin(i / 2) * 12));
}

/* ══════════════════════════════════════════════════════════════════════════
 *  3 · SCOPED STYLES  —  tokens, components, fonts, motion (all under .pp-admin)
 * ════════════════════════════════════════════════════════════════════════ */

const STYLE_ID = "pp-admin-styles";
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

.pp-admin{
  --pp-bg:#0a0b0d; --pp-surface:#101319; --pp-surface-2:#161a21; --pp-elev:#1c212a;
  --pp-border:#232833; --pp-border-2:#2c3340;
  --pp-text:#e9ecf1; --pp-text-2:#aab2bf; --pp-muted:#727c8a;
  --pp-orange:#f97316; --pp-orange-2:#ea580c; --pp-amber:#f99c00;
  --pp-green:#00d294; --pp-blue:#2e9bf0; --pp-purple:#a685ff; --pp-red:#fb2c36;
  --pp-ring: color-mix(in oklab, var(--pp-orange) 55%, transparent);
  --pp-font: 'Hanken Grotesk', ui-sans-serif, system-ui, sans-serif;
  --pp-display: 'Bricolage Grotesque', var(--pp-font);
  --pp-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
  --pp-shadow: 0 1px 2px rgba(0,0,0,.4), 0 8px 24px -12px rgba(0,0,0,.6);
  font-family:var(--pp-font); color:var(--pp-text); background:var(--pp-bg);
  -webkit-font-smoothing:antialiased; line-height:1.5;
}
.pp-admin[data-theme="light"]{
  --pp-bg:#f6f7f9; --pp-surface:#ffffff; --pp-surface-2:#f2f4f7; --pp-elev:#ffffff;
  --pp-border:#e5e8ee; --pp-border-2:#d7dce4;
  --pp-text:#141821; --pp-text-2:#485162; --pp-muted:#7a8494;
  --pp-shadow: 0 1px 2px rgba(16,24,40,.06), 0 12px 28px -14px rgba(16,24,40,.18);
}
.pp-admin *,.pp-admin *::before,.pp-admin *::after{ box-sizing:border-box; }
.pp-admin :focus-visible{ outline:2px solid var(--pp-ring); outline-offset:2px; border-radius:8px; }
.pp-admin ::-webkit-scrollbar{ width:10px; height:10px; }
.pp-admin ::-webkit-scrollbar-thumb{ background:var(--pp-border-2); border-radius:99px; border:2px solid transparent; background-clip:content-box; }
.pp-admin ::-webkit-scrollbar-thumb:hover{ background:var(--pp-muted); background-clip:content-box; }

.pp-mono{ font-family:var(--pp-mono); font-variant-numeric:tabular-nums; letter-spacing:-.01em; }
.pp-display{ font-family:var(--pp-display); letter-spacing:-.02em; }

/* shell */
.pp-shell{ min-height:100vh; min-height:100dvh; display:flex; background:var(--pp-bg); }
.pp-rail{
  position:sticky; top:0; height:100vh; height:100dvh; flex:0 0 auto; width:248px;
  background:linear-gradient(180deg, var(--pp-surface) 0%, var(--pp-bg) 140%);
  border-right:1px solid var(--pp-border); display:flex; flex-direction:column;
  transition:width .22s cubic-bezier(.4,0,.2,1); z-index:40;
}
.pp-rail[data-collapsed="true"]{ width:72px; }
.pp-brand{ display:flex; align-items:center; gap:10px; padding:18px 16px 14px; min-height:64px; }
.pp-brand-mark{ width:34px; height:34px; border-radius:10px; flex:0 0 auto; display:grid; place-items:center;
  background:linear-gradient(135deg, var(--pp-orange), var(--pp-orange-2)); color:#fff; font-weight:800;
  box-shadow:0 6px 16px -6px color-mix(in oklab, var(--pp-orange) 70%, transparent); font-family:var(--pp-display); }
.pp-brand-name{ font-family:var(--pp-display); font-weight:800; font-size:18px; white-space:nowrap; }
.pp-brand-sub{ font-size:11px; color:var(--pp-muted); white-space:nowrap; margin-top:-3px; }
.pp-nav{ padding:8px; display:flex; flex-direction:column; gap:2px; overflow-y:auto; flex:1; }
.pp-nav-group{ font-size:10.5px; text-transform:uppercase; letter-spacing:.09em; color:var(--pp-muted);
  padding:14px 12px 6px; font-weight:700; }
.pp-navitem{
  position:relative; display:flex; align-items:center; gap:11px; padding:9px 11px; border-radius:10px;
  color:var(--pp-text-2); font-size:14px; font-weight:500; cursor:pointer; border:1px solid transparent;
  width:100%; text-align:left; background:none; transition:background .14s, color .14s; white-space:nowrap;
}
.pp-navitem:hover{ background:var(--pp-surface-2); color:var(--pp-text); }
.pp-navitem[data-active="true"]{ color:var(--pp-text); background:color-mix(in oklab, var(--pp-orange) 12%, transparent);
  border-color:color-mix(in oklab, var(--pp-orange) 26%, transparent); }
.pp-navitem[data-active="true"]::before{ content:""; position:absolute; left:-8px; top:50%; transform:translateY(-50%);
  width:3px; height:20px; border-radius:99px; background:var(--pp-orange);
  box-shadow:0 0 14px 1px color-mix(in oklab, var(--pp-orange) 80%, transparent); }
.pp-navitem svg{ flex:0 0 auto; }
.pp-navitem .pp-badge{ margin-left:auto; }
.pp-rail[data-collapsed="true"] .pp-navlabel,
.pp-rail[data-collapsed="true"] .pp-brand-text,
.pp-rail[data-collapsed="true"] .pp-nav-group,
.pp-rail[data-collapsed="true"] .pp-navitem .pp-badge{ display:none; }
.pp-rail[data-collapsed="true"] .pp-navitem{ justify-content:center; }

.pp-rail-foot{ padding:10px; border-top:1px solid var(--pp-border); display:flex; flex-direction:column; gap:2px; }

/* main column */
.pp-main{ flex:1; min-width:0; display:flex; flex-direction:column; }
.pp-topbar{
  position:sticky; top:0; z-index:30; display:flex; align-items:center; gap:12px;
  padding:0 20px; min-height:64px; border-bottom:1px solid var(--pp-border);
  background:color-mix(in oklab, var(--pp-bg) 82%, transparent); backdrop-filter:blur(10px);
  overflow:hidden;
}
.pp-topbar::after{ /* signature: ambient orange aurora */
  content:""; position:absolute; right:-40px; top:-90px; width:340px; height:200px; pointer-events:none;
  background:radial-gradient(closest-side, color-mix(in oklab, var(--pp-orange) 26%, transparent), transparent);
  filter:blur(8px); opacity:.7;
}
.pp-topbar > *{ position:relative; z-index:1; }
.pp-page-title{ font-family:var(--pp-display); font-weight:700; font-size:19px; }
.pp-page-sub{ font-size:12.5px; color:var(--pp-muted); }
.pp-cmd{ display:inline-flex; align-items:center; gap:8px; padding:7px 12px; border-radius:10px;
  border:1px solid var(--pp-border); background:var(--pp-surface); color:var(--pp-muted); font-size:13px;
  cursor:pointer; transition:border-color .14s, color .14s; }
.pp-cmd:hover{ border-color:var(--pp-border-2); color:var(--pp-text-2); }
.pp-kbd{ font-family:var(--pp-mono); font-size:11px; padding:1px 6px; border-radius:6px;
  background:var(--pp-surface-2); border:1px solid var(--pp-border); color:var(--pp-text-2); }

.pp-content{ padding:22px; max-width:1440px; width:100%; margin:0 auto; flex:1; }

/* buttons */
.pp-btn{ display:inline-flex; align-items:center; justify-content:center; gap:8px; font-family:var(--pp-font);
  font-size:13.5px; font-weight:600; padding:8px 14px; border-radius:10px; cursor:pointer; border:1px solid var(--pp-border);
  background:var(--pp-surface); color:var(--pp-text); transition:transform .08s, background .14s, border-color .14s; white-space:nowrap; }
.pp-btn:hover{ background:var(--pp-surface-2); border-color:var(--pp-border-2); }
.pp-btn:active{ transform:translateY(1px); }
.pp-btn--primary{ background:linear-gradient(180deg, var(--pp-orange), var(--pp-orange-2)); border-color:transparent; color:#fff;
  box-shadow:0 6px 16px -8px color-mix(in oklab, var(--pp-orange) 80%, transparent); }
.pp-btn--primary:hover{ filter:brightness(1.06); background:linear-gradient(180deg, var(--pp-orange), var(--pp-orange-2)); }
.pp-btn--ghost{ background:transparent; border-color:transparent; color:var(--pp-text-2); }
.pp-btn--ghost:hover{ background:var(--pp-surface-2); color:var(--pp-text); }
.pp-btn--danger{ color:var(--pp-red); border-color:color-mix(in oklab, var(--pp-red) 30%, transparent); background:color-mix(in oklab, var(--pp-red) 8%, transparent); }
.pp-btn--sm{ padding:6px 10px; font-size:12.5px; border-radius:8px; }
.pp-iconbtn{ width:38px; height:38px; padding:0; border-radius:10px; display:grid; place-items:center; }

/* cards */
.pp-card{ background:var(--pp-surface); border:1px solid var(--pp-border); border-radius:16px; box-shadow:var(--pp-shadow); }
.pp-card-h{ display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 18px 0; }
.pp-card-title{ font-family:var(--pp-display); font-weight:700; font-size:15px; }
.pp-card-b{ padding:16px 18px; }

/* stat card */
.pp-stat{ position:relative; overflow:hidden; padding:18px; border-radius:16px; }
.pp-stat-top{ display:flex; align-items:center; gap:10px; }
.pp-stat-ico{ width:38px; height:38px; border-radius:11px; display:grid; place-items:center; }
.pp-stat-label{ font-size:13px; color:var(--pp-text-2); font-weight:500; }
.pp-stat-val{ font-family:var(--pp-mono); font-weight:600; font-size:30px; letter-spacing:-.03em; margin-top:12px; }
.pp-delta{ display:inline-flex; align-items:center; gap:3px; font-family:var(--pp-mono); font-size:12px; font-weight:600;
  padding:2px 7px; border-radius:99px; }
.pp-delta[data-t="up"]{ color:var(--pp-green); background:color-mix(in oklab, var(--pp-green) 12%, transparent); }
.pp-delta[data-t="down"]{ color:var(--pp-red); background:color-mix(in oklab, var(--pp-red) 12%, transparent); }
.pp-delta[data-t="flat"]{ color:var(--pp-muted); background:var(--pp-surface-2); }

/* badges & dots */
.pp-badge{ display:inline-flex; align-items:center; gap:6px; font-size:11.5px; font-weight:600; padding:3px 9px;
  border-radius:99px; border:1px solid var(--pp-border-2); color:var(--pp-text-2); background:var(--pp-surface-2); white-space:nowrap; }
.pp-badge[data-tone="green"]{ color:var(--pp-green); border-color:color-mix(in oklab,var(--pp-green) 34%,transparent); background:color-mix(in oklab,var(--pp-green) 10%,transparent); }
.pp-badge[data-tone="orange"]{ color:var(--pp-orange); border-color:color-mix(in oklab,var(--pp-orange) 34%,transparent); background:color-mix(in oklab,var(--pp-orange) 10%,transparent); }
.pp-badge[data-tone="blue"]{ color:var(--pp-blue); border-color:color-mix(in oklab,var(--pp-blue) 34%,transparent); background:color-mix(in oklab,var(--pp-blue) 10%,transparent); }
.pp-badge[data-tone="amber"]{ color:var(--pp-amber); border-color:color-mix(in oklab,var(--pp-amber) 34%,transparent); background:color-mix(in oklab,var(--pp-amber) 10%,transparent); }
.pp-badge[data-tone="purple"]{ color:var(--pp-purple); border-color:color-mix(in oklab,var(--pp-purple) 34%,transparent); background:color-mix(in oklab,var(--pp-purple) 10%,transparent); }
.pp-badge[data-tone="red"]{ color:var(--pp-red); border-color:color-mix(in oklab,var(--pp-red) 34%,transparent); background:color-mix(in oklab,var(--pp-red) 10%,transparent); }
.pp-badge[data-tone="muted"]{ color:var(--pp-muted); }
.pp-dot{ width:7px; height:7px; border-radius:99px; background:currentColor; flex:0 0 auto; }
.pp-dot--pulse{ position:relative; }
.pp-dot--pulse::after{ content:""; position:absolute; inset:-3px; border-radius:99px; background:currentColor; opacity:.5;
  animation:pp-pulse 1.6s ease-out infinite; }
@keyframes pp-pulse{ 0%{ transform:scale(.6); opacity:.5;} 70%{ transform:scale(2.2); opacity:0;} 100%{opacity:0;} }

/* tables */
.pp-tablewrap{ overflow-x:auto; }
.pp-table{ width:100%; border-collapse:collapse; font-size:13.5px; min-width:640px; }
.pp-table th{ text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--pp-muted);
  font-weight:700; padding:0 14px 10px; border-bottom:1px solid var(--pp-border); }
.pp-table td{ padding:13px 14px; border-bottom:1px solid var(--pp-border); vertical-align:middle; }
.pp-table tbody tr{ transition:background .12s; }
.pp-table tbody tr:hover{ background:var(--pp-surface-2); }
.pp-table tbody tr:last-child td{ border-bottom:none; }
.pp-cellname{ font-weight:600; color:var(--pp-text); }
.pp-cellsub{ font-size:12px; color:var(--pp-muted); }

.pp-avatar{ width:30px; height:30px; border-radius:99px; display:grid; place-items:center; font-size:12px; font-weight:700;
  color:#fff; flex:0 0 auto; font-family:var(--pp-display); }

/* inputs */
.pp-field{ display:flex; align-items:center; gap:9px; padding:8px 12px; border-radius:10px; border:1px solid var(--pp-border);
  background:var(--pp-surface); color:var(--pp-text); }
.pp-field:focus-within{ border-color:var(--pp-ring); }
.pp-input{ background:none; border:none; outline:none; color:var(--pp-text); font-family:var(--pp-font); font-size:13.5px; width:100%; }
.pp-input::placeholder{ color:var(--pp-muted); }
.pp-select{ appearance:none; background:var(--pp-surface); border:1px solid var(--pp-border); color:var(--pp-text);
  font-family:var(--pp-font); font-size:13.5px; padding:8px 30px 8px 12px; border-radius:10px; cursor:pointer;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23727c8a' stroke-width='2'><path d='M4 6l4 4 4-4'/></svg>");
  background-repeat:no-repeat; background-position:right 9px center; }

.pp-seg{ display:inline-flex; padding:3px; gap:2px; background:var(--pp-surface-2); border:1px solid var(--pp-border); border-radius:10px; }
.pp-seg button{ border:none; background:none; color:var(--pp-text-2); font-family:var(--pp-mono); font-size:12px; font-weight:600;
  padding:5px 11px; border-radius:7px; cursor:pointer; transition:background .12s,color .12s; }
.pp-seg button[data-active="true"]{ background:var(--pp-surface); color:var(--pp-text); box-shadow:var(--pp-shadow); }

/* switch */
.pp-switch{ width:40px; height:23px; border-radius:99px; background:var(--pp-border-2); position:relative; cursor:pointer;
  border:none; transition:background .16s; flex:0 0 auto; }
.pp-switch[data-on="true"]{ background:var(--pp-orange); }
.pp-switch::after{ content:""; position:absolute; top:2px; left:2px; width:19px; height:19px; border-radius:99px; background:#fff;
  transition:transform .16s; }
.pp-switch[data-on="true"]::after{ transform:translateX(17px); }

/* skeleton */
.pp-sk{ background:linear-gradient(90deg, var(--pp-surface-2) 25%, var(--pp-elev) 37%, var(--pp-surface-2) 63%);
  background-size:400% 100%; animation:pp-shimmer 1.4s ease infinite; border-radius:8px; }
@keyframes pp-shimmer{ 0%{background-position:100% 0;} 100%{background-position:-100% 0;} }

/* toasts */
.pp-toasts{ position:fixed; bottom:20px; right:20px; z-index:100; display:flex; flex-direction:column; gap:10px; max-width:360px; }
.pp-toast{ display:flex; align-items:flex-start; gap:11px; padding:13px 15px; border-radius:12px; background:var(--pp-elev);
  border:1px solid var(--pp-border-2); box-shadow:0 12px 40px -12px rgba(0,0,0,.7); animation:pp-slidein .22s cubic-bezier(.2,.9,.3,1); }
@keyframes pp-slidein{ from{ transform:translateX(20px); opacity:0;} to{ transform:none; opacity:1; } }
.pp-toast-title{ font-weight:600; font-size:13.5px; }
.pp-toast-msg{ font-size:12.5px; color:var(--pp-text-2); }

/* command palette + drawer overlays */
.pp-overlay{ position:fixed; inset:0; z-index:90; background:rgba(2,4,8,.62); backdrop-filter:blur(3px);
  animation:pp-fade .16s ease; }
@keyframes pp-fade{ from{opacity:0;} to{opacity:1;} }
.pp-palette{ position:fixed; z-index:95; left:50%; top:12vh; transform:translateX(-50%); width:min(560px,92vw);
  background:var(--pp-elev); border:1px solid var(--pp-border-2); border-radius:16px; box-shadow:0 30px 80px -20px rgba(0,0,0,.8);
  overflow:hidden; animation:pp-pop .18s cubic-bezier(.2,.9,.3,1); }
@keyframes pp-pop{ from{ transform:translateX(-50%) translateY(-8px) scale(.98); opacity:0;} to{ transform:translateX(-50%) translateY(0) scale(1); opacity:1; } }
.pp-palette-in{ display:flex; align-items:center; gap:11px; padding:15px 17px; border-bottom:1px solid var(--pp-border); }
.pp-palette-in input{ background:none; border:none; outline:none; color:var(--pp-text); font-size:15px; width:100%; font-family:var(--pp-font); }
.pp-palette-list{ max-height:min(360px,54vh); overflow-y:auto; padding:8px; }
.pp-palette-item{ display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:10px; cursor:pointer; color:var(--pp-text-2); }
.pp-palette-item[data-active="true"]{ background:var(--pp-surface-2); color:var(--pp-text); }

/* mobile drawer */
.pp-drawer{ position:fixed; z-index:95; left:0; top:0; bottom:0; width:264px; background:var(--pp-surface);
  border-right:1px solid var(--pp-border); animation:pp-drawin .22s cubic-bezier(.2,.9,.3,1); display:flex; flex-direction:column; }
@keyframes pp-drawin{ from{ transform:translateX(-100%);} to{ transform:none; } }

.pp-hamb{ display:none; }
.pp-grid{ display:grid; gap:16px; }
.pp-empty{ text-align:center; padding:48px 20px; color:var(--pp-muted); }
.pp-empty-ico{ width:52px; height:52px; border-radius:14px; display:grid; place-items:center; margin:0 auto 14px;
  background:var(--pp-surface-2); color:var(--pp-text-2); }

/* recharts polish */
.pp-admin .recharts-cartesian-axis-tick text{ fill:var(--pp-muted); font-size:11px; font-family:var(--pp-mono); }
.pp-admin .recharts-cartesian-grid line{ stroke:var(--pp-border); }
.pp-tt{ background:var(--pp-elev); border:1px solid var(--pp-border-2); border-radius:10px; padding:9px 12px; box-shadow:var(--pp-shadow); }
.pp-tt-t{ font-size:11px; color:var(--pp-muted); font-family:var(--pp-mono); margin-bottom:4px; }
.pp-tt-row{ display:flex; align-items:center; gap:8px; font-size:12.5px; }
.pp-tt-v{ font-family:var(--pp-mono); font-weight:600; margin-left:auto; }

@media (max-width: 960px){
  .pp-rail{ display:none; }
  .pp-hamb{ display:grid; }
  .pp-content{ padding:16px; }
  .pp-cmd .pp-cmd-text, .pp-page-sub{ display:none; }
}
@media (prefers-reduced-motion: reduce){
  .pp-admin *{ animation-duration:.001ms !important; transition-duration:.001ms !important; }
}
`;

function useInjectStyles() {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);
}

/* ══════════════════════════════════════════════════════════════════════════
 *  4 · SMALL UTILITIES & PRIMITIVES
 * ════════════════════════════════════════════════════════════════════════ */

const ACCENT_VAR: Record<AccentKey, string> = {
  orange: "var(--pp-orange)", green: "var(--pp-green)", blue: "var(--pp-blue)",
  purple: "var(--pp-purple)", amber: "var(--pp-amber)", red: "var(--pp-red)",
};
const AVATAR_COLORS = ["#f97316", "#2e9bf0", "#00d294", "#a685ff", "#f99c00", "#fb2c36"];
const avatarColor = (s: string) => AVATAR_COLORS[s.charCodeAt(0) % AVATAR_COLORS.length];
const initials = (s: string) => s.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + "k";
  return n.toLocaleString();
}
function ago(isoStr: string): string {
  const s = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const Badge: React.FC<{ tone?: string; children: React.ReactNode; dot?: boolean; pulse?: boolean }> = ({ tone = "muted", children, dot, pulse }) => (
  <span className="pp-badge" data-tone={tone}>
    {dot && <span className={"pp-dot" + (pulse ? " pp-dot--pulse" : "")} />}
    {children}
  </span>
);

const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger"; sm?: boolean }> = ({ variant, sm, className = "", children, ...rest }) => (
  <button {...rest} className={["pp-btn", variant ? `pp-btn--${variant}` : "", sm ? "pp-btn--sm" : "", className].join(" ")}>{children}</button>
);

const Card: React.FC<{ title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean }> = ({ title, action, children, className = "", pad = true }) => (
  <section className={`pp-card ${className}`}>
    {(title || action) && (
      <div className="pp-card-h">
        {title && <h3 className="pp-card-title">{title}</h3>}
        {action}
      </div>
    )}
    <div className={pad ? "pp-card-b" : ""}>{children}</div>
  </section>
);

const Skeleton: React.FC<{ w?: string | number; h?: number; r?: number; className?: string }> = ({ w = "100%", h = 14, r = 8, className = "" }) => (
  <div className={`pp-sk ${className}`} style={{ width: w, height: h, borderRadius: r }} />
);

const Empty: React.FC<{ icon?: React.ReactNode; title: string; msg?: string; action?: React.ReactNode }> = ({ icon, title, msg, action }) => (
  <div className="pp-empty">
    <div className="pp-empty-ico">{icon ?? <Search size={22} />}</div>
    <div style={{ fontWeight: 600, color: "var(--pp-text)", fontSize: 15 }}>{title}</div>
    {msg && <div style={{ marginTop: 4, fontSize: 13 }}>{msg}</div>}
    {action && <div style={{ marginTop: 16 }}>{action}</div>}
  </div>
);

/* Sparkline (tiny inline SVG) */
const Sparkline: React.FC<{ data: number[]; color: string; w?: number; h?: number }> = ({ data, color, w = 88, h = 32 }) => {
  if (!data?.length) return null;
  const min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / span) * (h - 4) - 2}`);
  const id = useRef("sp" + Math.random().toString(36).slice(2, 8)).current;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill={`url(#${id})`} />
    </svg>
  );
};

/* Toast system */
interface Toast { id: number; title: string; msg?: string; tone?: AccentKey }
const ToastCtx = createContext<(t: Omit<Toast, "id">) => void>(() => {});
const useToast = () => useContext(ToastCtx);

const ToastHost: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { ...t, id }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 3600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pp-toasts">
        {toasts.map((t) => (
          <div key={t.id} className="pp-toast">
            <span style={{ color: ACCENT_VAR[t.tone ?? "green"], marginTop: 1 }}>
              {t.tone === "red" ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}
            </span>
            <div>
              <div className="pp-toast-title">{t.title}</div>
              {t.msg && <div className="pp-toast-msg">{t.msg}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="pp-tt">
      <div className="pp-tt-t">{label}</div>
      {payload.map((p: any, i: number) => (
        <div className="pp-tt-row" key={i}>
          <span className="pp-dot" style={{ color: p.color || p.fill }} />
          <span style={{ textTransform: "capitalize", color: "var(--pp-text-2)" }}>{p.name}</span>
          <span className="pp-tt-v">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
 *  5 · NAV MODEL
 * ════════════════════════════════════════════════════════════════════════ */

export type TabId = "overview" | "projects" | "users" | "keys" | "usage" | "deployments" | "models" | "settings";

interface NavDef { id: TabId; label: string; icon: LucideIcon; group: string; }
const NAV: NavDef[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "Monitor" },
  { id: "projects", label: "Projects", icon: FolderKanban, group: "Monitor" },
  { id: "deployments", label: "Deployments", icon: Rocket, group: "Monitor" },
  { id: "users", label: "Users", icon: Users, group: "Manage" },
  { id: "keys", label: "API Keys", icon: KeyRound, group: "Manage" },
  { id: "usage", label: "Usage & Billing", icon: CreditCard, group: "Manage" },
  { id: "models", label: "Models", icon: CpuIcon, group: "Platform" },
  { id: "settings", label: "Settings", icon: SettingsIcon, group: "Platform" },
];
const TAB_META: Record<TabId, { title: string; sub: string }> = {
  overview: { title: "Overview", sub: "Platform health at a glance" },
  projects: { title: "Projects", sub: "Every app, API & package being built" },
  deployments: { title: "Deployments", sub: "Build & release pipeline activity" },
  users: { title: "Users", sub: "Accounts, roles & plans" },
  keys: { title: "API Keys", sub: "Programmatic access to the build hub" },
  usage: { title: "Usage & Billing", sub: "Token consumption & revenue" },
  models: { title: "Models", sub: "Free model fallback chain health" },
  settings: { title: "Settings", sub: "Platform configuration" },
};

const KIND_ICON: Record<AppKind, LucideIcon> = {
  web: Globe, mobile: Smartphone, desktop: Monitor, api: Zap, package: Package,
};
const STATUS_TONE: Record<ProjectStatus, string> = {
  building: "amber", live: "green", failed: "red", paused: "muted", queued: "blue",
};
const DEPLOY_TONE: Record<DeployState, string> = {
  success: "green", building: "amber", failed: "red", canceled: "muted",
};
const PLAN_TONE: Record<UserPlan, string> = { free: "muted", pro: "blue", team: "purple", enterprise: "orange" };

/* ══════════════════════════════════════════════════════════════════════════
 *  6 · TAB PANELS
 * ════════════════════════════════════════════════════════════════════════ */

/* ── Overview ─────────────────────────────────────────────────────────── */
const OverviewTab: React.FC<{ adapter: AdminDataAdapter; range: TimeRange }> = ({ adapter, range }) => {
  const [stats, setStats] = useState<StatCard[] | null>(null);
  const [builds, setBuilds] = useState<SeriesPoint[] | null>(null);
  const [breakdown, setBreakdown] = useState<Segment[] | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[] | null>(null);

  useEffect(() => {
    let live = true;
    setStats(null); setBuilds(null);
    adapter.getStats(range).then((d) => live && setStats(d));
    adapter.getBuildSeries(range).then((d) => live && setBuilds(d));
    adapter.getAppTypeBreakdown().then((d) => live && setBreakdown(d));
    adapter.getActivity().then((d) => live && setActivity(d));
    return () => { live = false; };
  }, [adapter, range]);

  return (
    <div className="pp-grid" style={{ gridTemplateColumns: "1fr" }}>
      {/* KPI row */}
      <div className="pp-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))" }}>
        {(stats ?? Array.from({ length: 4 })).map((s: any, i) => <StatTile key={s?.id ?? i} s={s} />)}
      </div>

      {/* charts */}
      <div className="pp-grid" style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)" }}>
        <Card title="Build & deploy volume" action={<Badge tone="orange" dot pulse>live</Badge>}>
          <div style={{ height: 260 }}>
            {!builds ? <Skeleton h={240} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={builds} margin={{ left: -18, right: 6, top: 6 }}>
                  <defs>
                    <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--pp-orange)" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="var(--pp-orange)" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--pp-blue)" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="var(--pp-blue)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="t" tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={fmt} />
                  <RTooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="builds" stroke="var(--pp-orange)" strokeWidth={2} fill="url(#gB)" />
                  <Area type="monotone" dataKey="deploys" stroke="var(--pp-blue)" strokeWidth={2} fill="url(#gD)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card title="Apps by type">
          <div style={{ height: 260, display: "flex", flexDirection: "column" }}>
            {!breakdown ? <Skeleton h={240} /> : (
              <>
                <ResponsiveContainer width="100%" height="70%">
                  <PieChart>
                    <Pie data={breakdown} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={3} stroke="none">
                      {breakdown.map((s, i) => <Cell key={i} fill={ACCENT_VAR[s.accent ?? "orange"]} />)}
                    </Pie>
                    <RTooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", justifyContent: "center", marginTop: 4 }}>
                  {breakdown.map((s) => (
                    <span key={s.name} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--pp-text-2)" }}>
                      <span className="pp-dot" style={{ color: ACCENT_VAR[s.accent ?? "orange"] }} />{s.name}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* activity feed */}
      <Card title="Recent activity" action={<Btn variant="ghost" sm><RefreshCw size={14} /> Refresh</Btn>}>
        {!activity ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h={18} />)}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {activity.map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid var(--pp-border)" }}>
                <span className="pp-stat-ico" style={{ width: 34, height: 34, background: `color-mix(in oklab, ${activityColor(e.kind)} 12%, transparent)`, color: activityColor(e.kind) }}>
                  {activityIcon(e.kind)}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                  {e.meta && <div className="pp-cellsub pp-mono">{e.meta}</div>}
                </div>
                <span className="pp-cellsub pp-mono" style={{ whiteSpace: "nowrap" }}>{ago(e.at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

function activityColor(k: ActivityEvent["kind"]): string {
  return { deploy: "var(--pp-green)", build: "var(--pp-orange)", user: "var(--pp-blue)", billing: "var(--pp-amber)", key: "var(--pp-purple)", system: "var(--pp-red)" }[k];
}
function activityIcon(k: ActivityEvent["kind"]) {
  const M = { deploy: Rocket, build: Activity, user: Users, billing: CreditCard, key: KeyRound, system: CpuIcon }[k];
  return <M size={16} />;
}

const StatTile: React.FC<{ s?: StatCard }> = ({ s }) => {
  if (!s) return (
    <div className="pp-card pp-stat">
      <Skeleton w={38} h={38} r={11} /><Skeleton w={90} h={12} className="" /><Skeleton w={120} h={28} />
    </div>
  );
  const accent = s.accent ?? "orange";
  const val = (s.unitSide === "prefix" ? s.unit ?? "" : "") + fmt(s.value) + (s.unitSide === "suffix" ? s.unit ?? "" : "");
  return (
    <div className="pp-card pp-stat">
      <div style={{ position: "absolute", right: 14, top: 14 }}>
        <Sparkline data={s.spark ?? []} color={ACCENT_VAR[accent]} />
      </div>
      <div className="pp-stat-top">
        <span className="pp-stat-ico" style={{ background: `color-mix(in oklab, ${ACCENT_VAR[accent]} 14%, transparent)`, color: ACCENT_VAR[accent] }}>
          {statIcon(s.id)}
        </span>
      </div>
      <div className="pp-stat-label" style={{ marginTop: 12 }}>{s.label}</div>
      <div className="pp-stat-val">{val}</div>
      {s.delta != null && (
        <div style={{ marginTop: 8 }}>
          <span className="pp-delta" data-t={s.trend ?? "flat"}>
            {s.trend === "down" ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
            {Math.abs(s.delta)}%
          </span>
          <span className="pp-cellsub" style={{ marginLeft: 8 }}>vs prev</span>
        </div>
      )}
    </div>
  );
};
function statIcon(id: string) {
  const M: Record<string, LucideIcon> = { builds: Activity, users: Users, api: Zap, mrr: CreditCard };
  const C = M[id] ?? Activity; return <C size={19} />;
}

/* ── Generic paginated table hook ─────────────────────────────────────── */
function usePaged<T>(loader: (q: Query) => Promise<Paginated<T>>, q: Query, deps: any[]) {
  const [data, setData] = useState<Paginated<T> | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true; setLoading(true);
    loader(q).then((d) => { if (live) { setData(d); setLoading(false); } });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading };
}

const Pager: React.FC<{ page: number; pageSize: number; total: number; onPage: (p: number) => void }> = ({ page, pageSize, total, onPage }) => {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
      <span className="pp-cellsub pp-mono">{total === 0 ? "0" : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <Btn sm variant="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</Btn>
        <span className="pp-badge pp-mono">{page} / {pages}</span>
        <Btn sm variant="ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Btn>
      </div>
    </div>
  );
};

const Toolbar: React.FC<{ search: string; onSearch: (v: string) => void; placeholder: string; children?: React.ReactNode }> = ({ search, onSearch, placeholder, children }) => (
  <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
    <div className="pp-field" style={{ flex: 1, minWidth: 200 }}>
      <Search size={16} style={{ color: "var(--pp-muted)", flex: "0 0 auto" }} />
      <input className="pp-input" placeholder={placeholder} value={search} onChange={(e) => onSearch(e.target.value)} />
    </div>
    {children}
  </div>
);

/* ── Projects ─────────────────────────────────────────────────────────── */
const ProjectsTab: React.FC<{ adapter: AdminDataAdapter }> = ({ adapter }) => {
  const [search, setSearch] = useState(""); const [status, setStatus] = useState("all");
  const [kind, setKind] = useState("all"); const [page, setPage] = useState(1);
  const q = { search, status, kind, page, pageSize: 8 };
  const { data, loading } = usePaged(adapter.listProjects, q, [adapter, search, status, kind, page]);
  useEffect(() => setPage(1), [search, status, kind]);

  return (
    <Card pad>
      <Toolbar search={search} onSearch={setSearch} placeholder="Search projects, owners, frameworks…">
        <select className="pp-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          {["all", "building", "live", "failed", "paused", "queued"].map((s) => <option key={s} value={s}>{s === "all" ? "All status" : s}</option>)}
        </select>
        <select className="pp-select" value={kind} onChange={(e) => setKind(e.target.value)}>
          {["all", "web", "mobile", "desktop", "api", "package"].map((s) => <option key={s} value={s}>{s === "all" ? "All types" : s}</option>)}
        </select>
        <Btn variant="primary"><Plus size={15} /> New project</Btn>
      </Toolbar>
      <div className="pp-tablewrap">
        <table className="pp-table">
          <thead><tr><th>Project</th><th>Type</th><th>Framework</th><th>Owner</th><th>Status</th><th>Tokens</th><th>Updated</th></tr></thead>
          <tbody>
            {loading ? Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j}><Skeleton h={16} /></td>)}</tr>
            )) : data?.rows.length === 0 ? (
              <tr><td colSpan={7}><Empty icon={<FolderKanban size={22} />} title="No projects match" msg="Try clearing filters or a different search." /></td></tr>
            ) : data?.rows.map((p) => {
              const KI = KIND_ICON[p.kind];
              return (
                <tr key={p.id}>
                  <td><div className="pp-cellname">{p.name}</div><div className="pp-cellsub pp-mono">{p.id}</div></td>
                  <td><span style={{ display: "inline-flex", alignItems: "center", gap: 7, textTransform: "capitalize" }}><KI size={15} />{p.kind}</span></td>
                  <td className="pp-mono" style={{ fontSize: 12.5, color: "var(--pp-text-2)" }}>{p.framework}</td>
                  <td>{p.owner}</td>
                  <td><Badge tone={STATUS_TONE[p.status]} dot pulse={p.status === "building"}>{p.status}</Badge></td>
                  <td className="pp-mono">{fmt(p.tokens)}</td>
                  <td className="pp-cellsub pp-mono">{ago(p.updatedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
    </Card>
  );
};

/* ── Users ────────────────────────────────────────────────────────────── */
const UsersTab: React.FC<{ adapter: AdminDataAdapter }> = ({ adapter }) => {
  const [search, setSearch] = useState(""); const [plan, setPlan] = useState("all"); const [page, setPage] = useState(1);
  const q = { search, status: plan, page, pageSize: 8 };
  const { data, loading } = usePaged(adapter.listUsers, q, [adapter, search, plan, page]);
  useEffect(() => setPage(1), [search, plan]);

  return (
    <Card pad>
      <Toolbar search={search} onSearch={setSearch} placeholder="Search users by name or email…">
        <select className="pp-select" value={plan} onChange={(e) => setPlan(e.target.value)}>
          {["all", "free", "pro", "team", "enterprise"].map((s) => <option key={s} value={s}>{s === "all" ? "All plans" : s}</option>)}
        </select>
        <Btn variant="primary"><Plus size={15} /> Invite user</Btn>
      </Toolbar>
      <div className="pp-tablewrap">
        <table className="pp-table">
          <thead><tr><th>User</th><th>Plan</th><th>Role</th><th>Projects</th><th>Status</th><th>Last active</th><th></th></tr></thead>
          <tbody>
            {loading ? Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j}><Skeleton h={16} /></td>)}</tr>
            )) : data?.rows.length === 0 ? (
              <tr><td colSpan={7}><Empty icon={<Users size={22} />} title="No users found" /></td></tr>
            ) : data?.rows.map((u) => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <span className="pp-avatar" style={{ background: avatarColor(u.name) }}>{initials(u.name)}</span>
                    <div><div className="pp-cellname">{u.name}</div><div className="pp-cellsub">{u.email}</div></div>
                  </div>
                </td>
                <td><Badge tone={PLAN_TONE[u.plan]}>{u.plan}</Badge></td>
                <td style={{ textTransform: "capitalize", color: "var(--pp-text-2)" }}>{u.role}</td>
                <td className="pp-mono">{u.projects}</td>
                <td><Badge tone={u.status === "active" ? "green" : u.status === "invited" ? "blue" : "red"} dot>{u.status}</Badge></td>
                <td className="pp-cellsub pp-mono">{ago(u.lastActive)}</td>
                <td style={{ textAlign: "right" }}><Btn variant="ghost" sm className="pp-iconbtn" aria-label="More"><MoreHorizontal size={16} /></Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
    </Card>
  );
};

/* ── API Keys ─────────────────────────────────────────────────────────── */
const KeysTab: React.FC<{ adapter: AdminDataAdapter }> = ({ adapter }) => {
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [newName, setNewName] = useState(""); const [creating, setCreating] = useState(false);
  const toast = useToast();
  const reload = useCallback(() => adapter.listApiKeys().then(setKeys), [adapter]);
  useEffect(() => { reload(); }, [reload]);

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const k = await adapter.createApiKey(newName.trim());
    setCreating(false); setNewName(""); reload();
    toast({ title: "API key created", msg: k.masked, tone: "green" });
  };
  const revoke = async (id: string) => { await adapter.revokeApiKey(id); reload(); toast({ title: "Key revoked", tone: "red" }); };
  const copy = (m: string) => { navigator.clipboard?.writeText(m); toast({ title: "Copied to clipboard", tone: "blue" }); };

  return (
    <div className="pp-grid" style={{ gridTemplateColumns: "1fr" }}>
      <Card title="Create a new key" action={<KeyRound size={18} style={{ color: "var(--pp-orange)" }} />}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div className="pp-field" style={{ flex: 1, minWidth: 220 }}>
            <input className="pp-input" placeholder="Key name, e.g. Production Server" value={newName}
              onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} />
          </div>
          <Btn variant="primary" onClick={create} disabled={creating || !newName.trim()}>
            {creating ? <RefreshCw size={15} className="pp-sk" /> : <Plus size={15} />} Generate key
          </Btn>
        </div>
      </Card>
      <Card title="Active keys" pad>
        {!keys ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={44} />)}</div>
        ) : keys.length === 0 ? <Empty icon={<KeyRound size={22} />} title="No API keys yet" msg="Generate one above to start using the API." /> : (
          <div className="pp-tablewrap">
            <table className="pp-table">
              <thead><tr><th>Name</th><th>Key</th><th>Scopes</th><th>Last used</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} style={{ opacity: k.status === "revoked" ? 0.5 : 1 }}>
                    <td><div className="pp-cellname">{k.name}</div><div className="pp-cellsub pp-mono">created {ago(k.createdAt)}</div></td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <code className="pp-mono" style={{ fontSize: 12.5 }}>{k.masked}</code>
                        <button className="pp-btn pp-btn--ghost pp-btn--sm pp-iconbtn" style={{ width: 28, height: 28 }} onClick={() => copy(k.masked)} aria-label="Copy"><Copy size={13} /></button>
                      </span>
                    </td>
                    <td><div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{k.scopes.map((s) => <span key={s} className="pp-badge pp-mono" style={{ fontSize: 10.5 }}>{s}</span>)}</div></td>
                    <td className="pp-cellsub pp-mono">{k.lastUsed ? ago(k.lastUsed) : "never"}</td>
                    <td><Badge tone={k.status === "active" ? "green" : "muted"} dot>{k.status}</Badge></td>
                    <td style={{ textAlign: "right" }}>
                      {k.status === "active" && <Btn variant="danger" sm onClick={() => revoke(k.id)}><Trash2 size={13} /> Revoke</Btn>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

/* ── Usage & Billing ──────────────────────────────────────────────────── */
const UsageTab: React.FC<{ adapter: AdminDataAdapter; range: TimeRange }> = ({ adapter, range }) => {
  const [tokens, setTokens] = useState<SeriesPoint[] | null>(null);
  const [breakdown, setBreakdown] = useState<Segment[] | null>(null);
  useEffect(() => {
    let live = true; setTokens(null);
    adapter.getTokenUsage(range).then((d) => live && setTokens(d));
    adapter.getAppTypeBreakdown().then((d) => live && setBreakdown(d));
    return () => { live = false; };
  }, [adapter, range]);

  const total = tokens?.reduce((a, p) => a + (p.tokens as number), 0) ?? 0;
  const plans = [
    { name: "Free", value: 6120, accent: "muted" as const, price: "$0" },
    { name: "Pro", value: 1840, accent: "blue" as const, price: "$20" },
    { name: "Team", value: 410, accent: "purple" as const, price: "$99" },
    { name: "Enterprise", value: 50, accent: "orange" as const, price: "Custom" },
  ];

  return (
    <div className="pp-grid" style={{ gridTemplateColumns: "1fr" }}>
      <div className="pp-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
        <MiniStat label="Tokens used" value={fmt(total)} sub="this period" accent="orange" icon={<Zap size={18} />} />
        <MiniStat label="Est. cost" value={"$" + fmt(Math.round(total / 1_000_000 * 4))} sub="at $4 / 1M" accent="amber" icon={<CreditCard size={18} />} />
        <MiniStat label="Budget used" value={Math.min(99, Math.round(total / 5_000_000)) + "%"} sub="of monthly cap" accent="green" icon={<Activity size={18} />} />
        <MiniStat label="Paying accounts" value={fmt(2300)} sub="+128 this month" accent="blue" icon={<Users size={18} />} />
      </div>
      <Card title="Token consumption" action={<Badge tone="orange">{range}</Badge>}>
        <div style={{ height: 260 }}>
          {!tokens ? <Skeleton h={240} /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tokens} margin={{ left: -14, right: 6, top: 6 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="t" tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} width={46} tickFormatter={fmt} />
                <RTooltip content={<ChartTip />} cursor={{ fill: "color-mix(in oklab, var(--pp-orange) 8%, transparent)" }} />
                <Bar dataKey="tokens" fill="var(--pp-orange)" radius={[5, 5, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
      <Card title="Plan distribution" pad>
        <div className="pp-tablewrap">
          <table className="pp-table" style={{ minWidth: 480 }}>
            <thead><tr><th>Plan</th><th>Price</th><th>Accounts</th><th>Share</th></tr></thead>
            <tbody>
              {plans.map((p) => {
                const totalAcc = plans.reduce((a, x) => a + x.value, 0);
                const pct = Math.round((p.value / totalAcc) * 100);
                return (
                  <tr key={p.name}>
                    <td><Badge tone={p.accent}>{p.name}</Badge></td>
                    <td className="pp-mono">{p.price}</td>
                    <td className="pp-mono">{fmt(p.value)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1, height: 7, borderRadius: 99, background: "var(--pp-surface-2)", overflow: "hidden", minWidth: 80 }}>
                          <div style={{ width: pct + "%", height: "100%", background: ACCENT_VAR[p.accent === "muted" ? "blue" : p.accent], borderRadius: 99 }} />
                        </div>
                        <span className="pp-mono" style={{ fontSize: 12 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
const MiniStat: React.FC<{ label: string; value: string; sub: string; accent: AccentKey; icon: React.ReactNode }> = ({ label, value, sub, accent, icon }) => (
  <div className="pp-card pp-stat">
    <div className="pp-stat-top">
      <span className="pp-stat-ico" style={{ background: `color-mix(in oklab, ${ACCENT_VAR[accent]} 14%, transparent)`, color: ACCENT_VAR[accent] }}>{icon}</span>
      <span className="pp-stat-label">{label}</span>
    </div>
    <div className="pp-stat-val" style={{ fontSize: 26 }}>{value}</div>
    <div className="pp-cellsub">{sub}</div>
  </div>
);

/* ── Deployments ──────────────────────────────────────────────────────── */
const DeploymentsTab: React.FC<{ adapter: AdminDataAdapter }> = ({ adapter }) => {
  const [search, setSearch] = useState(""); const [state, setState] = useState("all"); const [page, setPage] = useState(1);
  const q = { search, status: state, page, pageSize: 9 };
  const { data, loading } = usePaged(adapter.listDeployments, q, [adapter, search, state, page]);
  useEffect(() => setPage(1), [search, state]);

  return (
    <Card pad>
      <Toolbar search={search} onSearch={setSearch} placeholder="Search by project, branch, author…">
        <select className="pp-select" value={state} onChange={(e) => setState(e.target.value)}>
          {["all", "success", "building", "failed", "canceled"].map((s) => <option key={s} value={s}>{s === "all" ? "All states" : s}</option>)}
        </select>
        <Btn variant="ghost"><Download size={15} /> Export</Btn>
      </Toolbar>
      <div className="pp-tablewrap">
        <table className="pp-table">
          <thead><tr><th>Project</th><th>Env</th><th>Branch</th><th>Commit</th><th>Author</th><th>State</th><th>Duration</th><th>When</th></tr></thead>
          <tbody>
            {loading ? Array.from({ length: 9 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j}><Skeleton h={16} /></td>)}</tr>
            )) : data?.rows.length === 0 ? (
              <tr><td colSpan={8}><Empty icon={<Rocket size={22} />} title="No deployments" /></td></tr>
            ) : data?.rows.map((d) => (
              <tr key={d.id}>
                <td className="pp-cellname">{d.project}</td>
                <td><Badge tone={d.env === "production" ? "orange" : d.env === "preview" ? "blue" : "muted"}>{d.env}</Badge></td>
                <td className="pp-mono" style={{ fontSize: 12.5, color: "var(--pp-text-2)" }}>{d.branch}</td>
                <td className="pp-mono" style={{ fontSize: 12.5 }}>{d.commit}</td>
                <td>{d.author}</td>
                <td><Badge tone={DEPLOY_TONE[d.state]} dot pulse={d.state === "building"}>{d.state}</Badge></td>
                <td className="pp-mono">{d.duration}s</td>
                <td className="pp-cellsub pp-mono">{ago(d.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
    </Card>
  );
};

/* ── Models ───────────────────────────────────────────────────────────── */
const ModelsTab: React.FC<{ adapter: AdminDataAdapter }> = ({ adapter }) => {
  const [models, setModels] = useState<ModelHealth[] | null>(null);
  useEffect(() => { adapter.getModelHealth().then(setModels); }, [adapter]);
  const tone = (s: ModelHealth["status"]) => (s === "healthy" ? "green" : s === "degraded" ? "amber" : "red");

  return (
    <div className="pp-grid" style={{ gridTemplateColumns: "1fr" }}>
      <Card title="Free model fallback chain" action={<Badge tone="green" dot pulse>auto-routing</Badge>} pad>
        <p style={{ fontSize: 13, color: "var(--pp-text-2)", margin: "0 0 4px", maxWidth: 640 }}>
          Requests route to the default model first, then cascade down the fallback chain on error or empty response. Degraded and down models are skipped automatically.
        </p>
        {!models ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h={54} />)}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            {models.map((m, i) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: "1px solid var(--pp-border)", borderRadius: 12, background: "var(--pp-surface-2)", flexWrap: "wrap" }}>
                <span className="pp-mono" style={{ fontSize: 12, color: "var(--pp-muted)", width: 22 }}>{i === 0 ? "→" : String(i).padStart(2, "0")}</span>
                <span className="pp-stat-ico" style={{ width: 34, height: 34, background: `color-mix(in oklab, ${m.provider === "kilo" ? "var(--pp-orange)" : "var(--pp-purple)"} 12%, transparent)`, color: m.provider === "kilo" ? "var(--pp-orange)" : "var(--pp-purple)" }}>
                  <CpuIcon size={16} />
                </span>
                <div style={{ minWidth: 180, flex: 1 }}>
                  <div className="pp-mono" style={{ fontWeight: 600, fontSize: 13 }}>{m.id}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    <span className="pp-badge" data-tone={m.provider === "kilo" ? "orange" : "purple"} style={{ fontSize: 10.5 }}>{m.provider}</span>
                    {!m.isFallback && <span className="pp-badge" data-tone="green" style={{ fontSize: 10.5 }}>default</span>}
                    <span className="pp-badge pp-mono" style={{ fontSize: 10.5 }}>ctx {fmt(m.context)}</span>
                    <span className="pp-badge pp-mono" style={{ fontSize: 10.5 }}>max {fmt(m.maxTokens)}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}><div className="pp-cellsub">requests</div><div className="pp-mono" style={{ fontWeight: 600 }}>{fmt(m.requests)}</div></div>
                <div style={{ textAlign: "right", minWidth: 64 }}><div className="pp-cellsub">success</div><div className="pp-mono" style={{ fontWeight: 600, color: m.successRate > 95 ? "var(--pp-green)" : m.successRate > 85 ? "var(--pp-amber)" : "var(--pp-red)" }}>{m.successRate}%</div></div>
                <div style={{ textAlign: "right", minWidth: 64 }}><div className="pp-cellsub">latency</div><div className="pp-mono" style={{ fontWeight: 600 }}>{m.latencyMs ? m.latencyMs + "ms" : "—"}</div></div>
                <Badge tone={tone(m.status)} dot pulse={m.status !== "down"}>{m.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

/* ── Settings ─────────────────────────────────────────────────────────── */
const SettingsTab: React.FC<{ adapter: AdminDataAdapter }> = ({ adapter }) => {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  useEffect(() => { adapter.getSettings().then(setS); }, [adapter]);
  if (!s) return <div className="pp-grid" style={{ gridTemplateColumns: "1fr" }}><Card><Skeleton h={280} /></Card></div>;

  const set = (patch: Partial<Settings>) => setS({ ...s, ...patch });
  const save = async () => { setSaving(true); const next = await adapter.saveSettings(s); setS(next); setSaving(false); toast({ title: "Settings saved", tone: "green" }); };

  const Row: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 0", borderBottom: "1px solid var(--pp-border)", flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 200 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>{hint && <div className="pp-cellsub">{hint}</div>}</div>
      <div>{children}</div>
    </div>
  );

  return (
    <div className="pp-grid" style={{ gridTemplateColumns: "1fr" }}>
      <Card title="General" pad>
        <Row label="Platform name"><div className="pp-field" style={{ width: 260 }}><input className="pp-input" value={s.platformName} onChange={(e) => set({ platformName: e.target.value })} /></div></Row>
        <Row label="Support email"><div className="pp-field" style={{ width: 260 }}><input className="pp-input" value={s.supportEmail} onChange={(e) => set({ supportEmail: e.target.value })} /></div></Row>
        <Row label="Default model" hint="Primary model before the fallback chain"><div className="pp-field" style={{ width: 260 }}><input className="pp-input pp-mono" value={s.defaultModel} onChange={(e) => set({ defaultModel: e.target.value })} /></div></Row>
        <Row label="Monthly token budget" hint="Soft cap across all accounts"><div className="pp-field" style={{ width: 260 }}><input className="pp-input pp-mono" type="number" value={s.monthlyTokenBudget} onChange={(e) => set({ monthlyTokenBudget: +e.target.value })} /></div></Row>
      </Card>
      <Card title="Access" pad>
        <Row label="Allow new signups" hint="Let anyone create an account"><button className="pp-switch" data-on={s.allowSignups} onClick={() => set({ allowSignups: !s.allowSignups })} aria-label="Allow signups" /></Row>
        <Row label="Require email verification" hint="Verify address before first build"><button className="pp-switch" data-on={s.requireEmailVerify} onClick={() => set({ requireEmailVerify: !s.requireEmailVerify })} aria-label="Require verification" /></Row>
        <Row label="Maintenance mode" hint="Pause builds & show a banner"><button className="pp-switch" data-on={s.maintenanceMode} onClick={() => set({ maintenanceMode: !s.maintenanceMode })} aria-label="Maintenance mode" /></Row>
      </Card>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Btn variant="ghost" onClick={() => adapter.getSettings().then(setS)}>Reset</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Btn>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
 *  7 · COMMAND PALETTE
 * ════════════════════════════════════════════════════════════════════════ */
const CommandPalette: React.FC<{ open: boolean; onClose: () => void; onGo: (t: TabId) => void }> = ({ open, onClose, onGo }) => {
  const [q, setQ] = useState(""); const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const items = useMemo(() => NAV.filter((n) => n.label.toLowerCase().includes(q.toLowerCase())), [q]);
  useEffect(() => { if (open) { setQ(""); setActive(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);
  useEffect(() => { setActive(0); }, [q]);
  if (!open) return null;
  const go = (t: TabId) => { onGo(t); onClose(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && items[active]) go(items[active].id);
    else if (e.key === "Escape") onClose();
  };
  return (
    <>
      <div className="pp-overlay" onClick={onClose} />
      <div className="pp-palette" role="dialog" aria-label="Command palette">
        <div className="pp-palette-in">
          <Command size={18} style={{ color: "var(--pp-muted)" }} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Jump to…" />
          <span className="pp-kbd">esc</span>
        </div>
        <div className="pp-palette-list">
          {items.length === 0 ? <div className="pp-empty" style={{ padding: 28 }}>No matches</div> : items.map((n, i) => {
            const I = n.icon;
            return (
              <div key={n.id} className="pp-palette-item" data-active={i === active} onMouseEnter={() => setActive(i)} onClick={() => go(n.id)}>
                <I size={17} /><span style={{ flex: 1 }}>{n.label}</span><span className="pp-cellsub">{n.group}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
 *  8 · NAV RENDERER (shared by rail + drawer)
 * ════════════════════════════════════════════════════════════════════════ */
const NavList: React.FC<{ active: TabId; onGo: (t: TabId) => void; collapsed?: boolean }> = ({ active, onGo, collapsed }) => {
  let lastGroup = "";
  return (
    <nav className="pp-nav">
      {NAV.map((n) => {
        const I = n.icon; const showGroup = n.group !== lastGroup; lastGroup = n.group;
        return (
          <React.Fragment key={n.id}>
            {showGroup && !collapsed && <div className="pp-nav-group">{n.group}</div>}
            <button className="pp-navitem" data-active={active === n.id} onClick={() => onGo(n.id)} title={n.label}>
              <I size={18} />
              <span className="pp-navlabel">{n.label}</span>
              {n.id === "deployments" && <span className="pp-badge" data-tone="green" style={{ fontSize: 10 }}><span className="pp-dot pp-dot--pulse" />6</span>}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
 *  9 · ROOT COMPONENT
 * ════════════════════════════════════════════════════════════════════════ */

const Inner: React.FC<AdminProps> = ({ adapter: adapterProp, operator, defaultTheme = "dark", onSignOut, onTabChange }) => {
  useInjectStyles();
  const adapter = useMemo(() => adapterProp ?? createMockAdapter(), [adapterProp]);
  const [tab, setTab] = useState<TabId>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(defaultTheme);
  const [range, setRange] = useState<TimeRange>("7d");
  const op = operator ?? { name: "Hans Ade", email: "hans@pipilot.dev" };

  const go = useCallback((t: TabId) => { setTab(t); setDrawer(false); onTabChange?.(t); }, [onTabChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const meta = TAB_META[tab];
  const showRange = tab === "overview" || tab === "usage";

  const panel = () => {
    switch (tab) {
      case "overview": return <OverviewTab adapter={adapter} range={range} />;
      case "projects": return <ProjectsTab adapter={adapter} />;
      case "users": return <UsersTab adapter={adapter} />;
      case "keys": return <KeysTab adapter={adapter} />;
      case "usage": return <UsageTab adapter={adapter} range={range} />;
      case "deployments": return <DeploymentsTab adapter={adapter} />;
      case "models": return <ModelsTab adapter={adapter} />;
      case "settings": return <SettingsTab adapter={adapter} />;
    }
  };

  return (
    <div className="pp-admin" data-theme={theme}>
      <div className="pp-shell">
        {/* Desktop rail */}
        <aside className="pp-rail" data-collapsed={collapsed}>
          <div className="pp-brand">
            <div className="pp-brand-mark">P</div>
            <div className="pp-brand-text">
              <div className="pp-brand-name">PiPilot</div>
              <div className="pp-brand-sub">Admin Console</div>
            </div>
          </div>
          <NavList active={tab} onGo={go} collapsed={collapsed} />
          <div className="pp-rail-foot">
            <button className="pp-navitem" onClick={() => setCollapsed((c) => !c)} title="Collapse">
              <ChevronLeft size={18} style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
              <span className="pp-navlabel">Collapse</span>
            </button>
            <button className="pp-navitem" onClick={onSignOut} title="Sign out">
              <LogOut size={18} /><span className="pp-navlabel">Sign out</span>
            </button>
          </div>
        </aside>

        {/* Mobile drawer */}
        {drawer && (
          <>
            <div className="pp-overlay" onClick={() => setDrawer(false)} />
            <aside className="pp-drawer">
              <div className="pp-brand">
                <div className="pp-brand-mark">P</div>
                <div className="pp-brand-text"><div className="pp-brand-name">PiPilot</div><div className="pp-brand-sub">Admin Console</div></div>
                <button className="pp-btn pp-btn--ghost pp-iconbtn" style={{ marginLeft: "auto" }} onClick={() => setDrawer(false)} aria-label="Close"><X size={18} /></button>
              </div>
              <NavList active={tab} onGo={go} />
              <div className="pp-rail-foot"><button className="pp-navitem" onClick={onSignOut}><LogOut size={18} /><span>Sign out</span></button></div>
            </aside>
          </>
        )}

        {/* Main */}
        <div className="pp-main">
          <header className="pp-topbar">
            <button className="pp-btn pp-btn--ghost pp-iconbtn pp-hamb" onClick={() => setDrawer(true)} aria-label="Menu"><Menu size={19} /></button>
            <div style={{ minWidth: 0 }}>
              <div className="pp-page-title">{meta.title}</div>
              <div className="pp-page-sub">{meta.sub}</div>
            </div>
            <div style={{ flex: 1 }} />
            {showRange && (
              <div className="pp-seg" role="tablist" aria-label="Time range">
                {(["24h", "7d", "30d", "90d"] as TimeRange[]).map((r) => (
                  <button key={r} data-active={range === r} onClick={() => setRange(r)}>{r}</button>
                ))}
              </div>
            )}
            <button className="pp-cmd" onClick={() => setPalette(true)}>
              <Search size={15} /><span className="pp-cmd-text">Search…</span><span className="pp-kbd">⌘K</span>
            </button>
            <button className="pp-btn pp-btn--ghost pp-iconbtn" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="pp-btn pp-btn--ghost pp-iconbtn" aria-label="Notifications" style={{ position: "relative" }}>
              <Bell size={18} />
              <span style={{ position: "absolute", top: 8, right: 9, width: 7, height: 7, borderRadius: 99, background: "var(--pp-orange)" }} />
            </button>
            <span className="pp-avatar" style={{ background: avatarColor(op.name), width: 34, height: 34 }} title={op.email}>{initials(op.name)}</span>
          </header>

          <main className="pp-content">{panel()}</main>
        </div>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} onGo={go} />
    </div>
  );
};

const Admin: React.FC<AdminProps> = (props) => (
  <ToastHost><Inner {...props} /></ToastHost>
);

export default Admin;
