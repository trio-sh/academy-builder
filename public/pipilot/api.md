# PiPilot Admin — API Reference

The `Admin` component renders entirely from a single injectable seam: the
**`AdminDataAdapter`**. Implement its methods against your backend and every
tab — stats, charts, tables, keys, models, settings — fills with live data.
No adapter? It falls back to a deterministic in-memory mock so it renders the
moment you drop it in.

- **File:** `Admin.tsx` (single file, no local imports)
- **Peer deps:** `react ^18`, `recharts ^2`, `lucide-react`
- **Styling:** Tailwind utility classes for layout **plus** a self-contained,
  scoped `<style>` block injected at runtime (all rules live under `.pp-admin`,
  so it looks correct even without your host Tailwind theme and never leaks
  into the rest of your app).
- **Fonts:** Bricolage Grotesque (display), Hanken Grotesk (body), JetBrains
  Mono (data) — pulled from Google Fonts by the injected stylesheet.

---

## 1. Quick start

```tsx
import Admin from "./Admin";

// Zero-config: renders against the built-in mock adapter
export default function AdminPage() {
  return <Admin />;
}
```

Wire it to a real backend by passing an adapter:

```tsx
import Admin, { AdminDataAdapter } from "./Admin";

const api = (path: string) =>
  fetch(`/api/admin${path}`, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  });

const adapter: AdminDataAdapter = {
  getStats:            (range) => api(`/stats?range=${range}`),
  getBuildSeries:      (range) => api(`/series/builds?range=${range}`),
  getAppTypeBreakdown: ()      => api(`/breakdown/app-types`),
  getTokenUsage:       (range) => api(`/series/tokens?range=${range}`),
  listProjects:        (q)     => api(`/projects?${qs(q)}`),
  listUsers:           (q)     => api(`/users?${qs(q)}`),
  listApiKeys:         ()      => api(`/keys`),
  createApiKey:        (name)  => api(`/keys`, ),      // POST — see note below
  revokeApiKey:        (id)    => api(`/keys/${id}`),  // DELETE — see note below
  listDeployments:     (q)     => api(`/deployments?${qs(q)}`),
  getModelHealth:      ()      => api(`/models/health`),
  getActivity:         ()      => api(`/activity`),
  getSettings:         ()      => api(`/settings`),
  saveSettings:        (patch) => api(`/settings`),    // PATCH — see note below
};

const qs = (q: Record<string, unknown>) =>
  new URLSearchParams(
    Object.entries(q).filter(([, v]) => v != null && v !== "all").map(([k, v]) => [k, String(v)])
  ).toString();

export default () => <Admin adapter={adapter} onSignOut={() => location.assign("/logout")} />;
```

> The one-liners above are `GET`s. For `createApiKey`, `revokeApiKey`, and
> `saveSettings` use `POST` / `DELETE` / `PATCH` with a JSON body — full
> signatures in §4.

---

## 2. Component props (`AdminProps`)

| Prop           | Type                                   | Default            | Description |
| -------------- | -------------------------------------- | ------------------ | ----------- |
| `adapter`      | `AdminDataAdapter`                     | built-in mock      | The data seam. Implement to go live. |
| `operator`     | `{ name; email; avatarUrl? }`          | `Hans Ade`         | Signed-in operator shown top-right. |
| `defaultTheme` | `"dark" \| "light"`                    | `"dark"`           | Initial color scheme (toggleable in the top bar). |
| `onSignOut`    | `() => void`                           | —                  | Fired by the “Sign out” action. |
| `onTabChange`  | `(tab: TabId) => void`                 | —                  | Fired on tab change — handy for URL sync. |

`TabId = "overview" | "projects" | "users" | "keys" | "usage" | "deployments" | "models" | "settings"`

---

## 3. Data types

```ts
type TimeRange = "24h" | "7d" | "30d" | "90d";
type AppKind   = "web" | "mobile" | "desktop" | "api" | "package";
type AccentKey = "orange" | "green" | "blue" | "purple" | "amber" | "red";
type Trend     = "up" | "down" | "flat";

interface StatCard {
  id: string;
  label: string;
  value: number;
  unit?: string;                       // "$" or "%" etc.
  unitSide?: "prefix" | "suffix";
  delta?: number;                      // % change vs previous period
  trend?: Trend;
  spark?: number[];                    // sparkline series (raw values)
  accent?: AccentKey;
}

interface SeriesPoint { t: string; [seriesKey: string]: string | number }  // t = x-axis label
interface Segment     { name: string; value: number; accent?: AccentKey }

type ProjectStatus = "building" | "live" | "failed" | "paused" | "queued";
interface Project {
  id: string; name: string; kind: AppKind; framework: string;
  owner: string; status: ProjectStatus; updatedAt: string /* ISO */; tokens: number;
}

type UserPlan = "free" | "pro" | "team" | "enterprise";
type UserRole = "owner" | "admin" | "member" | "viewer";
interface AdminUser {
  id: string; name: string; email: string; plan: UserPlan; role: UserRole;
  projects: number; lastActive: string /* ISO */; status: "active" | "invited" | "suspended";
}

interface ApiKey {
  id: string; name: string; masked: string;   // e.g. "pk_live_••••••4f2a"
  scopes: string[]; createdAt: string; lastUsed: string | null;
  status: "active" | "revoked";
}

type DeployState = "success" | "building" | "failed" | "canceled";
interface Deployment {
  id: string; project: string; env: "production" | "preview" | "development";
  state: DeployState; commit: string; branch: string; author: string;
  createdAt: string /* ISO */; duration: number /* seconds */;
}

interface ModelHealth {
  id: string; provider: "kilo" | "openrouter" | string;
  context: number; maxTokens: number;
  status: "healthy" | "degraded" | "down";
  requests: number; successRate: number /* 0..100 */; latencyMs: number;
  isFallback: boolean;                 // false = primary/default model
}

interface ActivityEvent {
  id: string; kind: "deploy" | "build" | "user" | "billing" | "key" | "system";
  title: string; meta?: string; at: string /* ISO */;
}

interface Settings {
  platformName: string; supportEmail: string; defaultModel: string;
  allowSignups: boolean; requireEmailVerify: boolean; maintenanceMode: boolean;
  monthlyTokenBudget: number;
}

interface Query      { search?: string; status?: string; kind?: string; page?: number; pageSize?: number }
interface Paginated<T> { rows: T[]; total: number; page: number; pageSize: number }
```

---

## 4. Adapter contract & suggested REST mapping

Every method returns a `Promise`. Errors thrown/rejected surface as the UI’s
error/empty states — reject with a real `Error` and the affected panel stays
graceful. Timestamps are ISO 8601 strings; the UI renders them as relative
(“3m ago”). Numbers are raw — the UI formats (`1.2M`, `48k`) itself.

| Method | Suggested endpoint | Returns |
| ------ | ------------------ | ------- |
| `getStats(range)` | `GET /stats?range=` | `StatCard[]` — the 4 KPI tiles |
| `getBuildSeries(range)` | `GET /series/builds?range=` | `SeriesPoint[]` with keys `builds`, `deploys` |
| `getAppTypeBreakdown()` | `GET /breakdown/app-types` | `Segment[]` — donut chart |
| `getTokenUsage(range)` | `GET /series/tokens?range=` | `SeriesPoint[]` with key `tokens` |
| `listProjects(q)` | `GET /projects?search=&status=&kind=&page=&pageSize=` | `Paginated<Project>` |
| `listUsers(q)` | `GET /users?search=&status=&page=&pageSize=` | `Paginated<AdminUser>` (`status` filters by **plan**) |
| `listApiKeys()` | `GET /keys` | `ApiKey[]` |
| `createApiKey(name)` | `POST /keys` `{ name }` | the new `ApiKey` |
| `revokeApiKey(id)` | `DELETE /keys/:id` | `void` |
| `listDeployments(q)` | `GET /deployments?search=&status=&page=&pageSize=` | `Paginated<Deployment>` (`status` filters by **state**) |
| `getModelHealth()` | `GET /models/health` | `ModelHealth[]` (chain order = array order; index 0 = default) |
| `getActivity()` | `GET /activity` | `ActivityEvent[]` |
| `getSettings()` | `GET /settings` | `Settings` |
| `saveSettings(patch)` | `PATCH /settings` `{ ...patch }` | the updated `Settings` |

### Filtering conventions

- `search` — free-text; match across the row’s human-readable fields.
- `status` — the value from the tab’s dropdown. `"all"` (or omitted) = no
  filter. On **Users** it maps to `plan`; on **Deployments** to `state`.
- `kind` — Projects only; one of `AppKind` or `"all"`.
- Pagination is **1-based**. Honor the `pageSize` the UI sends (Projects/Users
  use 8, Deployments uses 9) and always echo back `page`, `pageSize`, `total`.

### Example payloads

`GET /stats?range=7d`
```json
[
  { "id": "builds", "label": "Active builds", "value": 324, "delta": 12.4, "trend": "up", "accent": "orange", "spark": [21,34,29,41,...] },
  { "id": "mrr",    "label": "MRR", "value": 48250, "unit": "$", "unitSide": "prefix", "delta": -2.3, "trend": "down", "accent": "amber" }
]
```

`GET /projects?status=building&page=1&pageSize=8`
```json
{
  "rows": [
    { "id": "proj_1001", "name": "Nova Commerce", "kind": "web",
      "framework": "Next.js", "owner": "Hans Ade", "status": "building",
      "updatedAt": "2026-07-06T07:41:00Z", "tokens": 428000 }
  ],
  "total": 6, "page": 1, "pageSize": 8
}
```

`GET /models/health` (drives the fallback-chain view; array order = routing order)
```json
[
  { "id": "kilo-auto/free", "provider": "kilo", "context": 256000, "maxTokens": 10000,
    "status": "healthy", "requests": 842100, "successRate": 99.2, "latencyMs": 640, "isFallback": false },
  { "id": "nvidia/nemotron-3-super-120b-a12b:free", "provider": "kilo", "context": 1000000, "maxTokens": 262144,
    "status": "healthy", "requests": 210400, "successRate": 98.1, "latencyMs": 910, "isFallback": true }
]
```

---

## 5. What each tab reads

| Tab | Adapter calls |
| --- | ------------- |
| **Overview** | `getStats`, `getBuildSeries`, `getAppTypeBreakdown`, `getActivity` |
| **Projects** | `listProjects` |
| **Deployments** | `listDeployments` |
| **Users** | `listUsers` |
| **API Keys** | `listApiKeys`, `createApiKey`, `revokeApiKey` |
| **Usage & Billing** | `getTokenUsage`, `getAppTypeBreakdown` |
| **Models** | `getModelHealth` |
| **Settings** | `getSettings`, `saveSettings` |

The time-range segmented control (top bar) is shown on **Overview** and
**Usage**; changing it re-invokes the range-aware calls.

---

## 6. Theming & brand tokens

All colors are CSS custom properties on `.pp-admin`, so you can override the
brand without touching the component. The defaults are PiPilot’s palette:

```css
.pp-admin {
  --pp-orange: #f97316;  --pp-orange-2: #ea580c;  --pp-amber: #f99c00;
  --pp-green:  #00d294;  --pp-blue:  #2e9bf0;     --pp-purple: #a685ff;
  --pp-red:    #fb2c36;
  --pp-bg: #0a0b0d; --pp-surface: #101319; --pp-border: #232833;
  --pp-text: #e9ecf1; --pp-text-2: #aab2bf; --pp-muted: #727c8a;
}
```

Override in your own stylesheet (loaded after the component) to re-skin:

```css
.pp-admin { --pp-orange: #7c5cff; --pp-orange-2: #5b3fd6; }
```

Light mode is built in (`data-theme="light"` on the root, toggled from the top
bar or via the `defaultTheme` prop).

---

## 7. Behaviors & accessibility

- **Command palette** — `⌘K` / `Ctrl-K` opens a fuzzy tab switcher (↑/↓/↵/esc).
- **Responsive** — the rail collapses to icons on desktop and becomes a
  slide-in drawer under 960px; tables scroll horizontally rather than break.
- **States** — every async panel shows shimmer skeletons while loading and a
  purposeful empty state when a filter/search returns nothing.
- **Toasts** — key creation, revocation, copy, and settings-save confirm via
  toasts (auto-dismiss).
- **A11y** — visible keyboard focus rings, `aria-label`s on icon buttons, and
  `prefers-reduced-motion` disables animation.

---

## 8. Notes

- The mock adapter (`createMockAdapter`, also exported) is deterministic and
  useful for Storybook, tests, and demos.
- Nothing here is PiPilot-specific in wiring — swap the tokens in §6 and the
  same shell serves any build-hub-style product.
