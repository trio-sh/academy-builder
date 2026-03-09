import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { openDB, type IDBPDatabase, type DBSchema } from "idb";
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  Globe,
  FileText,
  MousePointerClick,
  Navigation,
  FormInput,
  ScrollText,
  Eye,
  Zap,
  CheckCircle2,
  AlertCircle,
  Search,
  User,
  BookOpen,
  TrendingUp,
  Award,
  Users,
  Briefcase,
  GraduationCap,
  ClipboardCheck,
  RotateCcw,
  Trash2,
  Play,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ScanSearch,
  Plus,
  ArrowUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

// ─── IndexedDB Schema ─────────────────────────────────────────────────────────

interface AgentDBSchema extends DBSchema {
  messages: {
    key: string;
    value: { id: string; messages: SerializedMessage[] };
  };
}

interface SerializedMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
  isThinking?: boolean;
}

let dbInstance: IDBPDatabase<AgentDBSchema> | null = null;

async function getDB(): Promise<IDBPDatabase<AgentDBSchema>> {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB<AgentDBSchema>("AgentDB", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("messages")) {
        db.createObjectStore("messages", { keyPath: "id" });
      }
    },
  });
  return dbInstance;
}

async function saveMessages(messages: Message[]): Promise<void> {
  try {
    const db = await getDB();
    const serialized: SerializedMessage[] = messages.map(m => ({
      ...m,
      timestamp: m.timestamp.toISOString(),
    }));
    await db.put("messages", { id: "agent-chat", messages: serialized });
  } catch (e) {
    console.error("Failed to save agent messages:", e);
  }
}

async function loadMessages(): Promise<Message[]> {
  try {
    const db = await getDB();
    const stored = await db.get("messages", "agent-chat");
    if (!stored?.messages) return [];
    return stored.messages.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
  } catch (e) {
    console.error("Failed to load agent messages:", e);
    return [];
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ToolCall {
  id: string;
  type: "web_search" | "web_extract" | "navigate" | "click" | "fill" | "scroll_to" | "highlight" | "submit_form" | "scroll_page" | "toggle" | "select_option" | "clear_field" | "open_modal" | "close_modal" | "wait" | "query_data" | "read_page";
  label: string;
  params: Record<string, string>;
  status: "pending" | "running" | "done" | "error";
  result?: string;
}

interface Message {
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  isThinking?: boolean;
}

interface UserContext {
  profile: Record<string, unknown> | null;
  roleProfile: Record<string, unknown> | null;
  growthLog: Record<string, unknown>[] | null;
  mentorAssignment: Record<string, unknown> | null;
  trainingProgress: Record<string, unknown>[] | null;
  skillPassport: Record<string, unknown> | null;
  notifications: Record<string, unknown>[] | null;
  connections: Record<string, unknown>[] | null;
}

// ─── Tool Protocol ──────────────────────────────────────────────────────────
// AI embeds tool calls like [[TOOL:web_search|query=latest AI news]]
// We parse, execute, collect results, and send back to AI for synthesis

const TOOL_REGEX = /\[\[TOOL:(\w+)\|((?:[^\]]|\][^\]])*?)\]\]/g;

interface ParsedTool {
  type: string;
  params: Record<string, string>;
  raw: string;
}

function parseToolCalls(text: string): { cleanText: string; tools: ParsedTool[] } {
  const tools: ParsedTool[] = [];
  const cleanText = text.replace(TOOL_REGEX, (match, type, paramStr) => {
    const params: Record<string, string> = {};
    paramStr.split("|").forEach((p: string) => {
      const eqIdx = p.indexOf("=");
      if (eqIdx > 0) {
        params[p.slice(0, eqIdx).trim()] = p.slice(eqIdx + 1).trim();
      } else {
        params["query"] = p.trim();
      }
    });
    tools.push({ type, params, raw: match });
    return "";
  });
  return { cleanText: cleanText.replace(/\n{3,}/g, "\n\n").trim(), tools };
}

function toolLabel(tool: ParsedTool): string {
  switch (tool.type) {
    case "web_search": return `Search: "${tool.params.query || ""}"`;
    case "web_extract": return `Extract: ${tool.params.url || ""}`;
    case "navigate": return `Navigate to ${tool.params.path || ""}`;
    case "click": return `Click "${tool.params.target || ""}"`;
    case "fill": return `Fill "${tool.params.field || ""}"`;
    case "scroll_to": return `Scroll to "${tool.params.target || ""}"`;
    case "highlight": return `Highlight "${tool.params.target || ""}"`;
    case "submit_form": return `Submit form`;
    case "scroll_page": return `Scroll ${tool.params.direction || "down"}`;
    case "toggle": return `Toggle "${tool.params.target || ""}"`;
    case "select_option": return `Select "${tool.params.value || ""}" in "${tool.params.field || ""}"`;
    case "clear_field": return `Clear "${tool.params.field || ""}"`;
    case "open_modal": return `Open "${tool.params.target || ""}"`;
    case "close_modal": return `Close dialog`;
    case "wait": return `Wait ${tool.params.seconds || "1"}s`;
    case "query_data": return `Query: ${tool.params.table || ""} data`;
    case "read_page": return `Read page: ${tool.params.path || ""}`;
    default: return tool.type;
  }
}

function toolIcon(type: string) {
  switch (type) {
    case "web_search": return Search;
    case "web_extract": return Globe;
    case "navigate": return Navigation;
    case "click": case "open_modal": case "close_modal": return MousePointerClick;
    case "fill": case "clear_field": case "select_option": return FormInput;
    case "scroll_to": case "scroll_page": return ScrollText;
    case "highlight": return Eye;
    case "toggle": case "submit_form": return Zap;
    case "wait": return Loader2;
    case "query_data": return FileText;
    case "read_page": return ScanSearch;
    default: return Play;
  }
}

// ─── DOM Helpers ─────────────────────────────────────────────────────────────

function normalizeFieldQuery(query: string): string[] {
  const candidates = [query.trim()];
  const bracketMatch = query.match(/^[\w-]+\[([^\]]+)\]$/);
  if (bracketMatch) candidates.push(bracketMatch[1]);
  return [...new Set(candidates)];
}

function findElement(query: string): HTMLElement | null {
  const queries = normalizeFieldQuery(query);
  for (const q of queries) {
    try { const el = document.querySelector(q) as HTMLElement; if (el) return el; } catch { /* */ }
    const byId = document.getElementById(q);
    if (byId) return byId;
    try { const byName = document.querySelector(`[name="${q}"]`) as HTMLElement; if (byName) return byName; } catch { /* */ }
    try { const byPlaceholder = document.querySelector(`[placeholder="${q}"], [placeholder*="${q}" i]`) as HTMLElement; if (byPlaceholder) return byPlaceholder; } catch { /* */ }
    try { const byType = document.querySelector(`input[type="${q}"]`) as HTMLElement; if (byType) return byType; } catch { /* */ }
  }

  const allEls = Array.from(document.querySelectorAll("button, a, [role='button'], h1, h2, h3, h4, label, [role='tab'], input, textarea, select, [role='checkbox'], [role='switch']")) as HTMLElement[];
  for (const q of queries) {
    const qLower = q.toLowerCase().trim();
    if (!qLower) continue;
    for (const el of allEls) { const t = el.innerText?.trim().toLowerCase() || ""; if (t === qLower) return el; }
    for (const el of allEls) {
      const attrs = [el.getAttribute("placeholder"), el.getAttribute("aria-label"), el.getAttribute("name"), el.getAttribute("title")].filter(Boolean).map(a => a!.toLowerCase());
      if (attrs.some(a => a === qLower || a.includes(qLower))) return el;
    }
    for (const el of allEls) { const t = el.innerText?.trim().toLowerCase() || ""; if (t.length > 0 && t.length < 80 && (t.includes(qLower) || qLower.includes(t))) return el; }
    const labels = Array.from(document.querySelectorAll("label")) as HTMLLabelElement[];
    for (const label of labels) {
      if (label.innerText?.toLowerCase().includes(qLower)) {
        const forId = label.getAttribute("for");
        if (forId) { const t = document.getElementById(forId); if (t) return t; }
        const inner = label.querySelector("input, textarea, select") as HTMLElement;
        if (inner) return inner;
      }
    }
  }
  return null;
}

function highlightElement(el: HTMLElement, durationMs = 2500) {
  const original = el.style.cssText;
  el.style.outline = "3px solid #818cf8";
  el.style.outlineOffset = "3px";
  el.style.boxShadow = "0 0 25px rgba(129, 140, 248, 0.6)";
  el.style.transition = "outline 0.3s, box-shadow 0.3s";
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => { el.style.cssText = original; }, durationMs);
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, "value")?.set;
  if (setter) setter.call(el, value); else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

// ─── Tool Executor ───────────────────────────────────────────────────────────

async function executeTool(
  tool: ParsedTool,
  navigate: ReturnType<typeof useNavigate>,
  userContext: UserContext
): Promise<string> {
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  switch (tool.type) {
    case "web_search": {
      const query = tool.params.query || "";
      if (!query) return "Error: No search query provided";
      try {
        const searchUrl = `https://r.jina.ai/https://html.duckduckgo.com/html?q=${encodeURIComponent(query)}`;
        const res = await fetch(searchUrl, {
          headers: { "Accept": "text/plain", "X-Return-Format": "text" },
        });
        if (!res.ok) return `Search failed (${res.status})`;
        const text = await res.text();
        // Trim to reasonable size
        return text.slice(0, 3000) || "No results found";
      } catch (e) {
        return `Search error: ${(e as Error).message}`;
      }
    }

    case "web_extract": {
      const url = tool.params.url || "";
      if (!url) return "Error: No URL provided";
      try {
        const extractUrl = `https://r.jina.ai/${url}`;
        const res = await fetch(extractUrl, {
          headers: { "Accept": "text/plain", "X-Return-Format": "text" },
        });
        if (!res.ok) return `Extraction failed (${res.status})`;
        const text = await res.text();
        return text.slice(0, 4000) || "No content extracted";
      } catch (e) {
        return `Extraction error: ${(e as Error).message}`;
      }
    }

    case "query_data": {
      const table = tool.params.table || "";
      const filter = tool.params.filter || "";
      if (!table) return "Error: No table specified";
      try {
        // For security, only allow reading specific tables related to the user
        const allowedTables = ["growth_log_entries", "bridgefast_progress", "mentor_assignments", "mentor_observations", "endorsements", "skill_passports", "t3x_connections", "notifications", "liveworks_projects", "liveworks_applications"];
        if (!allowedTables.includes(table)) return `Access denied: table "${table}" not queryable`;
        const userId = userContext.profile && (userContext.profile as Record<string, unknown>).id;
        if (!userId) return "Error: No user context available";
        const roleProfileId = userContext.roleProfile && (userContext.roleProfile as Record<string, unknown>).id;
        const userRole = userContext.profile && (userContext.profile as Record<string, unknown>).role;
        let query = supabase.from(table).select("*").limit(20);
        // Tables that use the role profile ID (candidate_profiles.id, mentor_profiles.id, etc.)
        // vs tables that use the auth user ID (profiles.id)
        const tablesUsingRoleProfileId = ["mentor_assignments", "mentor_observations", "endorsements", "skill_passports", "t3x_connections", "liveworks_projects", "liveworks_applications"];
        const tableUserColumn: Record<string, string> = {
          growth_log_entries: "candidate_id",
          bridgefast_progress: "candidate_id",
          mentor_assignments: userRole === "mentor" ? "mentor_id" : "candidate_id",
          mentor_observations: userRole === "mentor" ? "mentor_id" : "candidate_id",
          endorsements: "candidate_id",
          skill_passports: "candidate_id",
          t3x_connections: userRole === "employer" ? "employer_id" : "candidate_id",
          notifications: "user_id",
          liveworks_projects: "employer_id",
          liveworks_applications: "candidate_id",
        };
        if (!filter) {
          const userCol = tableUserColumn[table] || "user_id";
          const filterValue = tablesUsingRoleProfileId.includes(table) && roleProfileId
            ? roleProfileId as string
            : userId as string;
          query = query.eq(userCol, filterValue);
        }
        const { data, error } = await query;
        if (error) return `Query error: ${error.message}`;
        return JSON.stringify(data?.slice(0, 10) || [], null, 2);
      } catch (e) {
        return `Query error: ${(e as Error).message}`;
      }
    }

    case "navigate": {
      const path = tool.params.path || "";
      if (!path) return "Error: No path specified";
      navigate(path);
      await delay(300);
      return `Navigated to ${path}`;
    }

    case "read_page": {
      const pagePath = tool.params.path || "";
      if (!pagePath) return "Error: No path specified";
      // Use a hidden iframe to load the page without navigating away (preserves agent state)
      try {
        const fullUrl = `${window.location.origin}${pagePath}`;
        const iframe = document.createElement("iframe");
        iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1280px;height:900px;opacity:0;pointer-events:none;";
        document.body.appendChild(iframe);

        const extracted = await new Promise<string>((resolve) => {
          const timeout = setTimeout(() => {
            cleanup();
            resolve("Error: Page load timed out after 8 seconds");
          }, 8000);

          const cleanup = () => {
            clearTimeout(timeout);
            try { document.body.removeChild(iframe); } catch { /* */ }
          };

          iframe.onload = () => {
            // Wait a bit for React to render inside the iframe
            setTimeout(() => {
              try {
                const doc = iframe.contentDocument;
                if (!doc) { cleanup(); resolve("Error: Could not access page content"); return; }

                const pageHeadings = Array.from(doc.querySelectorAll("h1, h2, h3"))
                  .map(el => { const t = (el as HTMLElement).innerText?.trim(); return t ? `${el.tagName}: ${t}` : null; })
                  .filter(Boolean).slice(0, 20);
                const pageStats = Array.from(doc.querySelectorAll("[class*='rounded-xl'], [class*='rounded-2xl'], [class*='stat'], [class*='card']"))
                  .map(el => { const t = (el as HTMLElement).innerText?.trim(); return t && t.length < 200 ? t.replace(/\n+/g, " | ") : null; })
                  .filter(Boolean).slice(0, 15);
                const pageTables = Array.from(doc.querySelectorAll("table")).map(table => {
                  const headers = Array.from(table.querySelectorAll("th")).map(th => (th as HTMLElement).innerText?.trim()).filter(Boolean);
                  const rows = Array.from(table.querySelectorAll("tbody tr")).slice(0, 10).map(row =>
                    Array.from(row.querySelectorAll("td")).map(td => (td as HTMLElement).innerText?.trim()).join(" | ")
                  );
                  return headers.length ? `Table [${headers.join(", ")}]:\n${rows.join("\n")}` : null;
                }).filter(Boolean);
                const pageLists = Array.from(doc.querySelectorAll("ul, ol"))
                  .map(el => { const items = Array.from(el.querySelectorAll("li")).map(li => (li as HTMLElement).innerText?.trim()).slice(0, 10); return items.length > 0 ? items.join("\n- ") : null; })
                  .filter(Boolean).slice(0, 5);
                const mainText = (doc.querySelector("main") || doc.body)?.innerText?.trim().slice(0, 2000) || "";

                const result = [
                  `Page: ${pagePath}`,
                  pageHeadings.length ? `Headings:\n${pageHeadings.join("\n")}` : "",
                  pageStats.length ? `Stats/Cards:\n${pageStats.join("\n")}` : "",
                  pageTables.length ? `Tables:\n${pageTables.join("\n\n")}` : "",
                  pageLists.length ? `Lists:\n- ${pageLists.join("\n- ")}` : "",
                  mainText ? `Content:\n${mainText}` : "",
                ].filter(Boolean).join("\n\n");

                cleanup();
                resolve(result.slice(0, 5000) || "No content found on page");
              } catch (e) {
                cleanup();
                resolve(`Error reading page: ${(e as Error).message}`);
              }
            }, 2000); // Allow 2s for React rendering inside iframe
          };

          iframe.onerror = () => {
            cleanup();
            resolve("Error: Failed to load page");
          };

          iframe.src = fullUrl;
        });

        return extracted;
      } catch (e) {
        return `Error: ${(e as Error).message}`;
      }
    }

    case "click": {
      const el = findElement(tool.params.target || "");
      if (!el) return `Element "${tool.params.target}" not found on page`;
      highlightElement(el, 1000);
      await delay(400);
      el.click();
      return `Clicked "${tool.params.target}"`;
    }

    case "scroll_to": {
      const el = findElement(tool.params.target || "");
      if (!el) return `Element "${tool.params.target}" not found`;
      highlightElement(el, 2500);
      return `Scrolled to "${tool.params.target}"`;
    }

    case "fill": {
      const el = findElement(tool.params.field || "");
      if (!el) return `Field "${tool.params.field}" not found`;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        highlightElement(el, 1500);
        await delay(200);
        (el as HTMLInputElement).focus();
        setNativeValue(el as HTMLInputElement, tool.params.value || "");
        return `Filled "${tool.params.field}" with "${tool.params.value || ""}"`;
      }
      return `"${tool.params.field}" is not an input field`;
    }

    case "clear_field": {
      const el = findElement(tool.params.field || "");
      if (!el || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA")) return `Field "${tool.params.field}" not found`;
      setNativeValue(el as HTMLInputElement, "");
      return `Cleared "${tool.params.field}"`;
    }

    case "select_option": {
      const el = findElement(tool.params.field || "") as HTMLSelectElement | null;
      if (!el || el.tagName !== "SELECT") return `Select "${tool.params.field}" not found`;
      const opt = Array.from(el.options).find(o => o.value.toLowerCase() === (tool.params.value || "").toLowerCase() || o.text.toLowerCase() === (tool.params.value || "").toLowerCase());
      if (!opt) return `Option "${tool.params.value}" not found`;
      el.value = opt.value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return `Selected "${opt.text}"`;
    }

    case "toggle": {
      const el = findElement(tool.params.target || "");
      if (!el) return `"${tool.params.target}" not found`;
      el.click();
      return `Toggled "${tool.params.target}"`;
    }

    case "submit_form": {
      const form = document.querySelector(tool.params.selector || "form") as HTMLFormElement;
      if (!form) return "No form found on page";
      const submitBtn = form.querySelector("button[type='submit'], button:not([type]), input[type='submit']");
      if (submitBtn) { (submitBtn as HTMLElement).click(); return "Form submitted via button"; }
      form.requestSubmit();
      return "Form submitted";
    }

    case "highlight": {
      const el = findElement(tool.params.target || "");
      if (!el) return `"${tool.params.target}" not found`;
      highlightElement(el, 3000);
      return `Highlighted "${tool.params.target}"`;
    }

    case "scroll_page": {
      const dir = (tool.params.direction || "down").toLowerCase();
      const amt = parseInt(tool.params.amount || "400");
      if (dir === "top") window.scrollTo({ top: 0, behavior: "smooth" });
      else if (dir === "bottom") window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      else if (dir === "up") window.scrollBy({ top: -amt, behavior: "smooth" });
      else window.scrollBy({ top: amt, behavior: "smooth" });
      return `Scrolled ${dir}`;
    }

    case "open_modal": {
      const el = findElement(tool.params.target || "");
      if (!el) return `"${tool.params.target}" not found`;
      el.click();
      return `Opened "${tool.params.target}"`;
    }

    case "close_modal": {
      const closeBtn = document.querySelector("[aria-label='Close'], [data-dismiss], dialog button") as HTMLElement;
      if (closeBtn) { closeBtn.click(); return "Closed dialog"; }
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      return "Sent Escape key";
    }

    case "wait": {
      const s = parseFloat(tool.params.seconds || "1");
      await delay(s * 1000);
      return `Waited ${s}s`;
    }

    default:
      return `Unknown tool: ${tool.type}`;
  }
}

// ─── Page Context ────────────────────────────────────────────────────────────

function extractPageContext(): string {
  const url = window.location.pathname + window.location.search;
  const pageTitle = document.title;

  const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
    .map(el => { const t = (el as HTMLElement).innerText?.trim(); return t ? `${el.tagName}: ${t}` : null; })
    .filter(Boolean).slice(0, 15);

  const buttons = Array.from(document.querySelectorAll("button, [role='button'], a[href]"))
    .map(el => { const t = (el as HTMLElement).innerText?.trim(); return t && t.length > 1 && t.length < 60 ? `"${t}"` : null; })
    .filter(Boolean).slice(0, 20);

  const formFields = Array.from(document.querySelectorAll("input, textarea, select"))
    .map(el => {
      const name = el.getAttribute("name") || el.id || el.getAttribute("placeholder") || el.getAttribute("aria-label") || "";
      const type = el.getAttribute("type") || el.tagName.toLowerCase();
      if (!name) return null;
      const value = (el as HTMLInputElement).value || "";
      return `${type} field "${name}"${value ? ` = "${value}"` : ""}`;
    }).filter(Boolean).slice(0, 15);

  const mainContent = document.querySelector("main")?.innerText?.trim().slice(0, 400) || "";

  return [
    `Page: ${pageTitle} | URL: ${url}`,
    headings.length ? `Headings: ${headings.join(", ")}` : "",
    buttons.length ? `Buttons: ${buttons.join(", ")}` : "",
    formFields.length ? `Form Fields:\n${formFields.join("\n")}` : "",
    mainContent ? `Content Preview:\n${mainContent}` : "",
  ].filter(Boolean).join("\n\n");
}

// ─── User Context Loader ────────────────────────────────────────────────────

async function loadUserContext(userId: string, role: string): Promise<UserContext> {
  const ctx: UserContext = {
    profile: null, roleProfile: null, growthLog: null,
    mentorAssignment: null, trainingProgress: null,
    skillPassport: null, notifications: null, connections: null,
  };

  try {
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
    ctx.profile = profile;

    if (role === "candidate") {
      // First get the candidate_profiles.id (different from profiles.id / auth user ID)
      const { data: cp } = await supabase.from("candidate_profiles").select("*").eq("profile_id", userId).single();
      ctx.roleProfile = cp;
      const cpId = cp?.id; // candidate_profiles.id used as FK in other tables
      if (cpId) {
        const [gl, ma, tp, sp, conn] = await Promise.all([
          supabase.from("growth_log_entries").select("*").eq("candidate_id", userId).order("created_at", { ascending: false }).limit(20),
          supabase.from("mentor_assignments").select("*").eq("candidate_id", cpId).eq("status", "active").maybeSingle(),
          supabase.from("growth_log_entries").select("*").eq("candidate_id", userId).eq("event_type", "training").order("created_at", { ascending: false }).limit(10),
          supabase.from("skill_passports").select("*").eq("candidate_id", cpId).eq("is_active", true).maybeSingle(),
          supabase.from("t3x_connections").select("*").eq("candidate_id", cpId).order("created_at", { ascending: false }).limit(10),
        ]);
        ctx.growthLog = gl.data;
        ctx.mentorAssignment = ma.data;
        ctx.trainingProgress = tp.data;
        ctx.skillPassport = sp.data;
        ctx.connections = conn.data;
      }
    } else if (role === "mentor") {
      const { data: mp } = await supabase.from("mentor_profiles").select("*").eq("profile_id", userId).single();
      ctx.roleProfile = mp;
      const mpId = mp?.id;
      if (mpId) {
        const { data: ma } = await supabase.from("mentor_assignments").select("*").eq("mentor_id", mpId).order("created_at", { ascending: false }).limit(20);
        ctx.mentorAssignment = ma as unknown as Record<string, unknown>;
      }
    } else if (role === "employer") {
      const { data: ep } = await supabase.from("employer_profiles").select("*").eq("profile_id", userId).single();
      ctx.roleProfile = ep;
      const epId = ep?.id;
      if (epId) {
        const { data: conns } = await supabase.from("t3x_connections").select("*").eq("employer_id", epId).limit(20);
        ctx.connections = conns;
      }
    } else if (role === "school_admin") {
      const { data: sp } = await supabase.from("school_profiles").select("*").eq("profile_id", userId).single();
      ctx.roleProfile = sp;
    } else if (role === "admin") {
      // Admin gets a summary
      const [users, candidates, mentors] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("candidate_profiles").select("*", { count: "exact", head: true }),
        supabase.from("mentor_profiles").select("*", { count: "exact", head: true }),
      ]);
      ctx.roleProfile = { totalUsers: users.count, totalCandidates: candidates.count, totalMentors: mentors.count } as Record<string, unknown>;
    }

    // Notifications for all
    const { data: notifs } = await supabase.from("notifications").select("*").eq("user_id", userId).eq("is_read", false).order("created_at", { ascending: false }).limit(5);
    ctx.notifications = notifs;

  } catch (e) {
    console.error("Failed to load user context:", e);
  }

  return ctx;
}

function summarizeUserContext(ctx: UserContext, role: string): string {
  const parts: string[] = [];

  if (ctx.profile) {
    const p = ctx.profile as Record<string, unknown>;
    parts.push(`User: ${p.first_name} ${p.last_name} (${p.email}), Role: ${role}, Location: ${p.location || "Not set"}`);
  }

  if (role === "candidate" && ctx.roleProfile) {
    const cp = ctx.roleProfile as Record<string, unknown>;
    parts.push(`Candidate Profile: Entry path: ${cp.entry_path || "N/A"}, Tier: ${cp.current_tier || "None"}, Experience: ${cp.experience_years || 0} years, Skills: ${(cp.skills as string[] || []).join(", ") || "None"}, Has Skill Passport: ${cp.has_skill_passport ? "Yes" : "No"}, Has TalentVisa: ${cp.has_talentvisa ? "Yes" : "No"}, Mentor loops completed: ${cp.mentor_loops || 0}`);
  }

  if (role === "mentor" && ctx.roleProfile) {
    const mp = ctx.roleProfile as Record<string, unknown>;
    parts.push(`Mentor Profile: ${mp.job_title} at ${mp.company}, Industry: ${mp.industry}, Specializations: ${(mp.specializations as string[] || []).join(", ")}, Experience: ${mp.years_experience} years, Mentees: ${mp.current_mentees}/${mp.max_mentees}, Rating: ${mp.avg_rating || "N/A"}, Total observations: ${mp.total_observations}`);
  }

  if (role === "employer" && ctx.roleProfile) {
    const ep = ctx.roleProfile as Record<string, unknown>;
    parts.push(`Employer: ${ep.company_name}, Size: ${ep.company_size}, Industry: ${ep.industry}, Verified: ${ep.is_verified ? "Yes" : "No"}, Hires: ${ep.total_hires}, Connections: ${ep.total_connections}`);
  }

  if (role === "school_admin" && ctx.roleProfile) {
    const sp = ctx.roleProfile as Record<string, unknown>;
    parts.push(`School: ${sp.school_name}, Type: ${sp.school_type}, District: ${sp.district}, Students: ${sp.total_students}, Active cohorts: ${sp.active_cohorts}`);
  }

  if (role === "admin" && ctx.roleProfile) {
    const a = ctx.roleProfile as Record<string, unknown>;
    parts.push(`Admin Stats: ${a.totalUsers} total users, ${a.totalCandidates} candidates, ${a.totalMentors} mentors`);
  }

  if (ctx.growthLog?.length) {
    parts.push(`Recent Growth Log (${ctx.growthLog.length} entries):\n${ctx.growthLog.slice(0, 5).map((e: Record<string, unknown>) => `- [${e.event_type}] ${e.title} (${new Date(e.created_at as string).toLocaleDateString()})`).join("\n")}`);
  }

  if (ctx.mentorAssignment) {
    const ma = ctx.mentorAssignment as Record<string, unknown>;
    if (role === "candidate") {
      const mentor = ma.profiles as Record<string, unknown> | undefined;
      parts.push(`Active Mentor: ${mentor?.first_name || "Unknown"} ${mentor?.last_name || ""} (Loop ${ma.loop_number})`);
    }
  }

  if (ctx.trainingProgress?.length) {
    parts.push(`Training Progress: ${ctx.trainingProgress.length} modules completed`);
  }

  if (ctx.skillPassport) {
    const sp = ctx.skillPassport as Record<string, unknown>;
    parts.push(`Skill Passport: Tier ${sp.readiness_tier}, Issued ${new Date(sp.issued_at as string).toLocaleDateString()}, Verification: ${sp.verification_code}`);
  }

  if (ctx.notifications?.length) {
    parts.push(`Unread Notifications (${ctx.notifications.length}):\n${ctx.notifications.slice(0, 3).map((n: Record<string, unknown>) => `- ${n.title}: ${n.message}`).join("\n")}`);
  }

  if (ctx.connections?.length) {
    parts.push(`Recent Connections: ${ctx.connections.length} total`);
  }

  return parts.join("\n\n");
}

// ─── System Prompt ───────────────────────────────────────────────────────────

function buildAgentPrompt(userContextSummary: string, pageContext: string, role: string): string {
  return `You are Academy Agent — a powerful AI assistant embedded in The 3rd Academy platform. You have full access to the user's data, can interact with the page, search the web, and extract web content. You are proactive, capable, and action-oriented.

## Platform Knowledge
The 3rd Academy bridges credentials and workplace readiness through mentor-gated behavioral validation.
- Skill Passport: Evidence-linked credential via mentor validation
- MentorLink: Mandatory human validation — mentors observe candidates across 3 loops
- Growth Log: Timeline of behavioral growth events
- BridgeFast: Training modules for behavioral gaps
- LiveWorks Studio: Supervised project marketplace
- TalentVisa: Premium credential for exceptional candidates
- T3X Exchange: Employer marketplace for verified talent
- Civic Access Lab: School track for early career awareness

## User Context
${userContextSummary}

## Current Screen
${pageContext}

## Your Tools
You have powerful tools you can invoke. Embed tool calls in your response using this EXACT syntax:
[[TOOL:tool_name|param1=value1|param2=value2]]

### Available Tools

**Web Tools (results are sent back to you for synthesis):**
- [[TOOL:web_search|query=search terms]] — Search the web via DuckDuckGo. Results come back to you.
- [[TOOL:web_extract|url=https://example.com]] — Extract and read a webpage's content. Results come back to you.

**Data Tools (results come back to you):**
- [[TOOL:query_data|table=growth_log_entries]] — Query user's data from database. Allowed tables: growth_log_entries, bridgefast_progress, mentor_assignments, mentor_observations, endorsements, skill_passports, t3x_connections, notifications, liveworks_projects, liveworks_applications.
- [[TOOL:read_page|path=/dashboard/${role}/growth]] — Navigate to a page, extract ALL its content (headings, stats, tables, lists, text), then return to the current page. Results come back to you for synthesis. Use this when you need data from another page without staying there.

**DOM Interaction Tools (execute on page, results come back to you):**
- [[TOOL:navigate|path=/dashboard/${role}/growth]] — Navigate to a route and stay there
- [[TOOL:click|target=button text]] — Click a button/link
- [[TOOL:fill|field=email|value=user@example.com]] — Fill a form field
- [[TOOL:clear_field|field=field name]] — Clear a field
- [[TOOL:select_option|field=select name|value=option]] — Select dropdown
- [[TOOL:toggle|target=element]] — Toggle checkbox/switch
- [[TOOL:submit_form|selector=form]] — Submit a form
- [[TOOL:scroll_to|target=element]] — Scroll to element
- [[TOOL:scroll_page|direction=down|amount=400]] — Scroll page
- [[TOOL:highlight|target=element]] — Highlight element
- [[TOOL:open_modal|target=trigger text]] — Open modal
- [[TOOL:close_modal|]] — Close modal
- [[TOOL:wait|seconds=2]] — Wait

## CRITICAL Rules
1. ALWAYS use [[TOOL:...]] syntax. Never write plain text like "Click here" or "I'll search" without the tool tag.
2. ALL tool results come BACK to you after execution — web search results, DOM action outcomes, data queries, everything.
3. After receiving tool results, you MUST respond with a COMPLETE synthesis: confirm what happened, summarize data, or explain the outcome. NEVER leave the user without a final answer. NEVER stop mid-sentence or mid-thought.
4. You can use MULTIPLE tools in one response. Combine tools when possible (e.g., search + extract in one message) to reduce round-trips.
5. Be proactive: if the user says "find me a mentor in tech" → search for mentors AND navigate to the mentor page.
6. Reference the user's actual data when answering questions about their progress, scores, etc.
7. For the current user role (${role}), navigate within /dashboard/${role === "school_admin" ? "school" : role}/...
8. When you need to fill forms, use exact field names from "Form Fields" in the screen context.
9. When you get results back, SYNTHESIZE them into a clear, concise answer — don't dump raw content.
10. You have personality: be helpful, confident, proactive. You're the user's AI co-pilot for their Academy journey.
11. IMPORTANT: After tools run and results come back, always provide a COMPLETE, FINISHED response. Do NOT stop halfway. If you searched for something, fully explain the findings. If you extracted a page, fully summarize the content. Complete your entire answer in one response.
12. When doing multi-step tasks (search → extract → analyze), plan ahead: use web_search first, then if needed [[TOOL:web_extract|url=...]] in the same response or the next one, and then synthesize ALL results into one final comprehensive answer.

## Example Responses

User: "What's the latest news on AI in hiring?"
Assistant: "Let me search for that! [[TOOL:web_search|query=latest AI hiring news 2026]]"

User: "Show me my growth log"
Assistant: "Opening your Growth Log now! [[TOOL:navigate|path=/dashboard/${role === "school_admin" ? "school" : role}/growth]]"

User: "Fill in my name on this form"
Assistant: "Filling in your name. [[TOOL:fill|field=name|value=${(userContextSummary.match(/User: (\w+ \w+)/) || [])[1] || "User"}]]"

User: "What's on this webpage?" (shares URL)
Assistant: "Let me extract that page for you. [[TOOL:web_extract|url=<the url>]]"

User: "How many growth log entries do I have?"
Assistant: Based on your data, you have ${role === "candidate" ? "your growth log entries loaded" : "access to relevant data"}. Let me check the latest. [[TOOL:query_data|table=growth_log_entries]]`;
}

// ─── Quick Actions by Role ───────────────────────────────────────────────────

function getQuickActions(role: string): { label: string; icon: typeof Bot; message: string }[] {
  const common = [
    { label: "What's on my screen?", icon: Eye, message: "What am I looking at right now? Help me understand this page." },
    { label: "Search the web", icon: Globe, message: "Search the web for latest trends in workplace readiness and behavioral assessment" },
  ];

  switch (role) {
    case "candidate":
      return [
        { label: "My Progress", icon: TrendingUp, message: "Summarize my current progress — tier, growth log, training, and what I should do next." },
        { label: "Find a Mentor", icon: GraduationCap, message: "Help me find and connect with a mentor that matches my skills and goals." },
        { label: "Growth Log", icon: BookOpen, message: "Open my Growth Log and tell me about my recent activity." },
        { label: "Skill Passport", icon: Award, message: "What's the status of my Skill Passport? What do I need to complete it?" },
        { label: "Training", icon: ClipboardCheck, message: "Show me available training modules and my progress." },
        ...common,
      ];
    case "mentor":
      return [
        { label: "My Mentees", icon: Users, message: "Show me my active mentees and any pending observations I need to complete." },
        { label: "Pending Reviews", icon: ClipboardCheck, message: "Do I have any pending observations or endorsements to complete?" },
        { label: "Schedule", icon: BookOpen, message: "Open my schedule and show upcoming sessions." },
        ...common,
      ];
    case "employer":
      return [
        { label: "Find Talent", icon: Search, message: "Help me find qualified candidates on the T3X Exchange." },
        { label: "My Projects", icon: Briefcase, message: "Show me my active LiveWorks projects and their status." },
        { label: "Connections", icon: Users, message: "Show me my recent candidate connections and their status." },
        ...common,
      ];
    case "school_admin":
      return [
        { label: "Students", icon: Users, message: "Show me an overview of my students and their progress." },
        { label: "Observations", icon: ClipboardCheck, message: "What observations have been recorded recently?" },
        { label: "Analytics", icon: TrendingUp, message: "Navigate to analytics and help me understand our school's data." },
        ...common,
      ];
    case "admin":
      return [
        { label: "Platform Stats", icon: TrendingUp, message: "Give me a summary of platform statistics — users, candidates, mentors, employers." },
        { label: "User Management", icon: Users, message: "Open the user management page." },
        { label: "TalentVisa Queue", icon: Award, message: "Show me pending TalentVisa nominations that need review." },
        ...common,
      ];
    default:
      return common;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AIAgent() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const role = profile?.role || "candidate";
  const dashboardBase = `/dashboard/${role === "school_admin" ? "school" : role}`;

  // Load persisted messages from IndexedDB on mount
  useEffect(() => {
    loadMessages().then(stored => {
      if (stored.length > 0) {
        setMessages(stored);
      }
      setMessagesLoaded(true);
    });
  }, []);

  // Persist messages to IndexedDB whenever they change
  useEffect(() => {
    if (messagesLoaded && messages.length > 0) {
      saveMessages(messages);
    }
    // Also persist empty state (clear chat)
    if (messagesLoaded && messages.length === 0) {
      saveMessages([]);
    }
  }, [messages, messagesLoaded]);

  // Load user context on mount
  useEffect(() => {
    if (user?.id && profile?.role) {
      setContextLoading(true);
      loadUserContext(user.id, profile.role).then(ctx => {
        setUserContext(ctx);
        setContextLoading(false);
      });
    }
  }, [user?.id, profile?.role]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isProcessing]);

  // Focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Execute tools and return results to AI
  const processToolCalls = useCallback(async (tools: ParsedTool[], _messageIndex: number): Promise<string[]> => {
    const results: string[] = [];

    // Helper: find the last assistant message with toolCalls (the one we're processing)
    const updateLastToolMessage = (updater: (toolCalls: ToolCall[]) => ToolCall[]) => {
      setMessages(prev => {
        const updated = [...prev];
        // Find last assistant message with toolCalls
        for (let j = updated.length - 1; j >= 0; j--) {
          if (updated[j].role === "assistant" && updated[j].toolCalls) {
            updated[j] = { ...updated[j], toolCalls: updater(updated[j].toolCalls!) };
            break;
          }
        }
        return updated;
      });
    };

    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];

      // Mark running
      updateLastToolMessage(tcs => tcs.map((tc, idx) =>
        idx === i ? { ...tc, status: "running" as const } : tc
      ));

      const result = await executeTool(tool, navigate, userContext || { profile: null, roleProfile: null, growthLog: null, mentorAssignment: null, trainingProgress: null, skillPassport: null, notifications: null, connections: null });
      results.push(`[${tool.type} result]: ${result}`);

      // Mark done
      updateLastToolMessage(tcs => tcs.map((tc, idx) =>
        idx === i ? { ...tc, status: result.startsWith("Error") || result.includes("not found") ? "error" as const : "done" as const, result: result.slice(0, 200) } : tc
      ));

      // Brief pause between tools
      if (i < tools.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    return results;
  }, [navigate, userContext]);

  // Send message + handle tool loop
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isTyping || isProcessing) return;

    const userMsg: Message = { role: "user", content: content.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    const userContextSummary = userContext ? summarizeUserContext(userContext, role) : "Loading user data...";
    const pageContext = extractPageContext();
    const systemPrompt = buildAgentPrompt(userContextSummary, pageContext, role);

    // Build conversation for API
    const buildApiMessages = (msgs: Message[]) => {
      const apiMsgs: { role: string; content: string }[] = [
        { role: "system", content: systemPrompt },
      ];
      // Only include the last 20 messages to prevent context overflow
      const recentMsgs = msgs.slice(-20);
      for (let i = 0; i < recentMsgs.length; i++) {
        const m = recentMsgs[i];
        if (m.role === "tool") {
          // Truncate older tool results more aggressively; keep recent ones fuller
          const isRecent = i >= recentMsgs.length - 4;
          const maxLen = isRecent ? 3000 : 800;
          const content = m.content.length > maxLen ? m.content.slice(0, maxLen) + "\n...[truncated]" : m.content;
          apiMsgs.push({ role: "user", content: `[Tool Results]\n${content}` });
        } else {
          apiMsgs.push({ role: m.role, content: m.content });
        }
      }
      return apiMsgs;
    };

    let currentMessages = [...messages, userMsg];
    let loopCount = 0;
    const maxLoops = 8; // Allow enough loops for multi-step tasks (search → extract → synthesize → more)

    while (loopCount < maxLoops) {
      loopCount++;

      try {
        const response = await fetch("https://api.a0.dev/ai/llm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: buildApiMessages(currentMessages),
            temperature: 0.7,
            max_tokens: 2500,
          }),
        });

        if (!response.ok) throw new Error("Failed to get response");

        const data = await response.json();
        const rawContent = data.completion || "Sorry, I encountered an error.";

        // Parse tool calls
        const { cleanText, tools } = parseToolCalls(rawContent);

        const toolCalls: ToolCall[] = tools.map((t, i) => ({
          id: `${t.type}-${Date.now()}-${i}`,
          type: t.type as ToolCall["type"],
          label: toolLabel(t),
          params: t.params,
          status: "pending" as const,
        }));

        const assistantMsg: Message = {
          role: "assistant",
          content: cleanText,
          timestamp: new Date(),
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        };

        currentMessages = [...currentMessages, assistantMsg];

        if (tools.length === 0) {
          // No tools — final response, add to state and break
          setMessages(prev => [...prev, assistantMsg]);
          setIsTyping(false);
          break;
        }

        // Has tools — add assistant msg, then execute tools
        setMessages(prev => [...prev, assistantMsg]);
        setIsTyping(false);
        setIsProcessing(true);

        // Use the React state length for message index tracking
        const msgIdx = currentMessages.length - 1;
        const results = await processToolCalls(tools, msgIdx);

        // Add tool results to conversation for next synthesis call
        const toolResultMsg: Message = {
          role: "tool",
          content: results.join("\n\n"),
          timestamp: new Date(),
        };
        currentMessages = [...currentMessages, toolResultMsg];
        setMessages(prev => [...prev, toolResultMsg]);
        setIsTyping(true);
        setIsProcessing(false);
        // Loop continues — AI will synthesize results
      } catch (error) {
        console.error("Agent error:", error);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        }]);
        setIsTyping(false);
        setIsProcessing(false);
        break;
      }
    }

    setIsTyping(false);
    setIsProcessing(false);
  }, [messages, isTyping, isProcessing, userContext, role, processToolCalls]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => setMessages([]);
  const quickActions = getQuickActions(role);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [expandedMsgs, setExpandedMsgs] = useState<Set<number>>(new Set());

  const copyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const toggleExpand = (idx: number) => {
    setExpandedMsgs(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const retryMessage = (idx: number) => {
    // Find the last user message before this assistant message
    const visibleMessages = messages.filter(m => m.role !== "tool");
    let userMsgContent = "";
    for (let i = idx; i >= 0; i--) {
      if (visibleMessages[i]?.role === "user") {
        userMsgContent = visibleMessages[i].content;
        break;
      }
    }
    if (userMsgContent) {
      // Remove messages from the retried assistant onward
      const targetMsg = visibleMessages[idx];
      const realIdx = messages.indexOf(targetMsg);
      if (realIdx >= 0) {
        setMessages(prev => prev.slice(0, realIdx));
        setTimeout(() => sendMessage(userMsgContent), 100);
      }
    }
  };

  const wordCount = (text: string) => text.trim().split(/\s+/).length;

  // ─── Tool Call Badge ─────────────────────────────────────────────────────

  function ToolBadge({ tc }: { tc: ToolCall }) {
    const Icon = toolIcon(tc.type);
    const colors = {
      pending: "bg-gray-800/80 border-gray-700 text-gray-400",
      running: "bg-indigo-950/80 border-indigo-500/50 text-indigo-300",
      done: "bg-emerald-950/80 border-emerald-500/30 text-emerald-300",
      error: "bg-red-950/80 border-red-500/30 text-red-300",
    };

    return (
      <motion.div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${colors[tc.status]}`}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        layout
      >
        {tc.status === "running" ? <Loader2 className="w-3 h-3 animate-spin" />
          : tc.status === "done" ? <CheckCircle2 className="w-3 h-3" />
          : tc.status === "error" ? <AlertCircle className="w-3 h-3" />
          : <Icon className="w-3 h-3" />}
        <span className="font-medium">{tc.label}</span>
        {tc.status === "done" && tc.result && (
          <span className="text-emerald-400/60 truncate max-w-[180px]">— {tc.result}</span>
        )}
        {tc.status === "error" && tc.result && (
          <span className="text-red-400/60 truncate max-w-[180px]">— {tc.result}</span>
        )}
      </motion.div>
    );
  }

  // ─── Message Action Buttons ─────────────────────────────────────────────

  function MessageActions({ msg, idx, isUser }: { msg: Message; idx: number; isUser: boolean }) {
    return (
      <div className={`flex items-center gap-1 mt-1.5 ${isUser ? "justify-end" : ""}`}>
        <button
          onClick={() => copyMessage(msg.content, idx)}
          className="p-1 rounded-md text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
          title="Copy"
        >
          {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        {!isUser && (
          <>
            <button className="p-1 rounded-md text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors" title="Good response">
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 rounded-md text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors" title="Bad response">
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => retryMessage(idx)}
              className="p-1 rounded-md text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
              title="Retry"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    );
  }

  // ─── User Message Content (with show more) ─────────────────────────────

  function UserMessageContent({ content, idx }: { content: string; idx: number }) {
    const isLong = wordCount(content) > 20;
    const isExpanded = expandedMsgs.has(idx);

    if (!isLong) {
      return <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>;
    }

    const words = content.split(/\s+/);
    const preview = words.slice(0, 20).join(" ");

    return (
      <div>
        {isExpanded ? (
          <div className="max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
          </div>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{preview}...</p>
        )}
        <button
          onClick={() => toggleExpand(idx)}
          className="flex items-center gap-1 mt-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {isExpanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show more</>}
        </button>
      </div>
    );
  }

  // ─── Auto-resize textarea ──────────────────────────────────────────────

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (contextLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading your Academy Agent...</p>
          <p className="text-xs text-gray-600 mt-1">Gathering your profile, progress, and context</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full relative">

      {/* Messages Area — scrollable, with bottom padding for fixed input */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-6 pb-48 space-y-6">

        {/* Empty state */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <div className="text-center mb-8 pt-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-pink-600/20 flex items-center justify-center mx-auto mb-5 border border-indigo-500/20">
                <Sparkles className="w-8 h-8 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Hey {profile?.first_name || "there"}!
              </h2>
              <p className="text-gray-400 max-w-md mx-auto text-sm">
                I'm your Academy Agent. I can search the web, read pages across your dashboard, query your data, and help you with anything on the platform.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {quickActions.map((qa) => (
                <motion.button
                  key={qa.label}
                  onClick={() => sendMessage(qa.message)}
                  className="flex flex-col items-center gap-2 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-indigo-500/30 hover:bg-indigo-950/20 transition-all text-center group"
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <qa.icon className="w-4.5 h-4.5 text-gray-500 group-hover:text-indigo-400 transition-colors" />
                  <span className="text-xs text-gray-400 group-hover:text-white transition-colors leading-tight">{qa.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Context Card */}
            {userContext && (
              <div className="mt-6 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 font-semibold">Your context</p>
                <div className="text-xs text-gray-500 space-y-0.5">
                  {userContext.profile && (
                    <p>
                      <span className="text-gray-400">{(userContext.profile as Record<string, unknown>).first_name} {(userContext.profile as Record<string, unknown>).last_name}</span>
                      {" — "}
                      <span className="capitalize">{role}</span>
                      {(userContext.profile as Record<string, unknown>).location && ` • ${(userContext.profile as Record<string, unknown>).location}`}
                    </p>
                  )}
                  {role === "candidate" && userContext.roleProfile && (
                    <p>
                      Tier: <span className="text-indigo-400 capitalize">{(userContext.roleProfile as Record<string, unknown>).current_tier || "None"}</span>
                      {" • Skills: "}{((userContext.roleProfile as Record<string, unknown>).skills as string[] || []).slice(0, 5).join(", ") || "None set"}
                    </p>
                  )}
                  {userContext.growthLog && <p>{userContext.growthLog.length} growth log entries</p>}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Message List */}
        {messages.filter(m => m.role !== "tool").map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`max-w-2xl mx-auto ${msg.role === "user" ? "flex justify-end" : ""}`}
          >
            {msg.role === "assistant" ? (
              /* ── Assistant Message — transparent, no bg/border ── */
              <div className="group">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] leading-relaxed text-gray-200 whitespace-pre-wrap">{msg.content}</p>

                    {/* Tool Call Badges */}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {msg.toolCalls.map((tc, tIdx) => (
                          <ToolBadge key={tIdx} tc={tc} />
                        ))}
                      </div>
                    )}

                    {/* Action buttons — visible on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MessageActions msg={msg} idx={idx} isUser={false} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ── User Message — right-aligned bubble ── */
              <div className="group max-w-[85%] inline-block">
                <div className="px-4 py-2.5 rounded-2xl rounded-br-md bg-indigo-600/20 border border-indigo-500/15 text-gray-200">
                  <UserMessageContent content={msg.content} idx={idx} />
                </div>
                {/* Action buttons */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MessageActions msg={msg} idx={idx} isUser={true} />
                </div>
              </div>
            )}
          </motion.div>
        ))}

        {/* Typing / Processing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-2xl mx-auto"
          >
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex items-center gap-2 py-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-gray-500">
                  {isProcessing ? "Running tools..." : "Thinking"}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ─── Fixed Bottom Input ─── Claude-style ─────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black via-black/95 to-transparent pt-8 pb-4 px-4 sm:px-6">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="relative bg-[#1a1a2e] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 focus-within:border-indigo-500/30 focus-within:shadow-indigo-500/5 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isProcessing ? "Agent is working..." : "Reply..."}
              className="w-full bg-transparent px-4 pt-3.5 pb-12 text-sm text-white placeholder:text-gray-500 focus:outline-none resize-none min-h-[52px] max-h-[200px]"
              rows={1}
              disabled={isTyping || isProcessing}
            />
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.click();
                  }}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
                  title="Attach file"
                >
                  <Plus className="w-4 h-4" />
                </button>
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={clearChat}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
                    title="Clear chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(isTyping || isProcessing) && (
                  <span className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {isProcessing ? "Running tools" : "Thinking"}
                  </span>
                )}
                <motion.button
                  type="submit"
                  disabled={!input.trim() || isTyping || isProcessing}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  whileHover={!input.trim() || isTyping || isProcessing ? {} : { scale: 1.05 }}
                  whileTap={!input.trim() || isTyping || isProcessing ? {} : { scale: 0.95 }}
                >
                  <ArrowUp className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>
          <p className="text-center text-[10px] text-gray-600 mt-2">
            Academy Agent can make mistakes. Verify important information.
          </p>
        </form>
      </div>

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
