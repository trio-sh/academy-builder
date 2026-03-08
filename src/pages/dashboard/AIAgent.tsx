import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ToolCall {
  id: string;
  type: "web_search" | "web_extract" | "navigate" | "click" | "fill" | "scroll_to" | "highlight" | "submit_form" | "scroll_page" | "toggle" | "select_option" | "clear_field" | "open_modal" | "close_modal" | "wait" | "query_data";
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
        let query = supabase.from(table).select("*").limit(20);
        // Auto-filter by user
        const userFields = ["candidate_id", "user_id", "profile_id", "mentor_id", "employer_id"];
        for (const field of userFields) {
          if (filter.includes(field)) continue; // User specified their own filter
          // We'll add the default user filter
          query = query.or(`${userFields.map(f => `${f}.eq.${userId}`).join(",")}`);
          break;
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
      const [cp, gl, ma, tp, sp, conn] = await Promise.all([
        supabase.from("candidate_profiles").select("*").eq("profile_id", userId).single(),
        supabase.from("growth_log_entries").select("*").eq("candidate_id", userId).order("created_at", { ascending: false }).limit(20),
        supabase.from("mentor_assignments").select("*, profiles!mentor_assignments_mentor_id_fkey(first_name, last_name, email)").eq("candidate_id", userId).eq("status", "active").maybeSingle(),
        supabase.from("growth_log_entries").select("*").eq("candidate_id", userId).eq("event_type", "training").order("created_at", { ascending: false }).limit(10),
        supabase.from("skill_passports").select("*").eq("candidate_id", userId).eq("is_active", true).maybeSingle(),
        supabase.from("t3x_connections").select("*, profiles!t3x_connections_employer_id_fkey(first_name, last_name)").eq("candidate_id", userId).order("created_at", { ascending: false }).limit(10),
      ]);
      ctx.roleProfile = cp.data;
      ctx.growthLog = gl.data;
      ctx.mentorAssignment = ma.data;
      ctx.trainingProgress = tp.data;
      ctx.skillPassport = sp.data;
      ctx.connections = conn.data;
    } else if (role === "mentor") {
      const [mp, ma] = await Promise.all([
        supabase.from("mentor_profiles").select("*").eq("profile_id", userId).single(),
        supabase.from("mentor_assignments").select("*, profiles!mentor_assignments_candidate_id_fkey(first_name, last_name, email)").eq("mentor_id", userId).order("created_at", { ascending: false }).limit(20),
      ]);
      ctx.roleProfile = mp.data;
      ctx.mentorAssignment = ma.data as unknown as Record<string, unknown>;
    } else if (role === "employer") {
      const { data: ep } = await supabase.from("employer_profiles").select("*").eq("profile_id", userId).single();
      ctx.roleProfile = ep;
      const { data: conns } = await supabase.from("t3x_connections").select("*, profiles!t3x_connections_candidate_id_fkey(first_name, last_name)").eq("employer_id", userId).limit(20);
      ctx.connections = conns;
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

**DOM Interaction Tools (execute on page):**
- [[TOOL:navigate|path=/dashboard/${role}/growth]] — Navigate to a route
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
2. Web search & extract results come BACK to you — use them to give informed answers.
3. For DOM tools, results also come back (success/failure status).
4. You can use MULTIPLE tools in one response.
5. Be proactive: if the user says "find me a mentor in tech" → search for mentors AND navigate to the mentor page.
6. Reference the user's actual data when answering questions about their progress, scores, etc.
7. For the current user role (${role}), navigate within /dashboard/${role === "school_admin" ? "school" : role}/...
8. When you need to fill forms, use exact field names from "Form Fields" in the screen context.
9. When you get web results back, SYNTHESIZE them into a clear answer — don't dump raw content.
10. You have personality: be helpful, confident, proactive. You're the user's AI co-pilot for their Academy journey.

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const role = profile?.role || "candidate";
  const dashboardBase = `/dashboard/${role === "school_admin" ? "school" : role}`;

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
  const processToolCalls = useCallback(async (tools: ParsedTool[], messageIndex: number): Promise<string[]> => {
    const results: string[] = [];

    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      const toolId = `${tool.type}-${Date.now()}-${i}`;

      // Mark running
      setMessages(prev => {
        const updated = [...prev];
        if (updated[messageIndex]?.toolCalls) {
          updated[messageIndex] = {
            ...updated[messageIndex],
            toolCalls: updated[messageIndex].toolCalls!.map((tc, idx) =>
              idx === i ? { ...tc, status: "running" as const } : tc
            ),
          };
        }
        return updated;
      });

      const result = await executeTool(tool, navigate, userContext || { profile: null, roleProfile: null, growthLog: null, mentorAssignment: null, trainingProgress: null, skillPassport: null, notifications: null, connections: null });
      results.push(`[${tool.type} result]: ${result}`);

      // Mark done
      setMessages(prev => {
        const updated = [...prev];
        if (updated[messageIndex]?.toolCalls) {
          updated[messageIndex] = {
            ...updated[messageIndex],
            toolCalls: updated[messageIndex].toolCalls!.map((tc, idx) =>
              idx === i ? { ...tc, status: result.startsWith("Error") || result.includes("not found") ? "error" as const : "done" as const, result: result.slice(0, 200) } : tc
            ),
          };
        }
        return updated;
      });

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
      for (const m of msgs) {
        if (m.role === "tool") {
          apiMsgs.push({ role: "user", content: `[Tool Results]\n${m.content}` });
        } else {
          apiMsgs.push({ role: m.role, content: m.content });
        }
      }
      return apiMsgs;
    };

    let currentMessages = [...messages, userMsg];
    let loopCount = 0;
    const maxLoops = 3; // Prevent infinite loops

    while (loopCount < maxLoops) {
      loopCount++;

      try {
        const response = await fetch("https://api.a0.dev/ai/llm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: buildApiMessages(currentMessages),
            temperature: 0.7,
            max_tokens: 1200,
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

        setMessages(prev => [...prev, assistantMsg]);
        setIsTyping(false);
        currentMessages = [...currentMessages, assistantMsg];

        if (tools.length === 0) break; // No tools, we're done

        // Execute tools
        setIsProcessing(true);
        const msgIdx = currentMessages.length - 1;
        const results = await processToolCalls(tools, msgIdx);

        // Check if any tools return data that needs AI synthesis (web_search, web_extract, query_data)
        const needsSynthesis = tools.some(t => ["web_search", "web_extract", "query_data"].includes(t.type));

        if (needsSynthesis) {
          // Send results back to AI
          const toolResultMsg: Message = {
            role: "tool",
            content: results.join("\n\n"),
            timestamp: new Date(),
          };
          currentMessages = [...currentMessages, toolResultMsg];
          setIsTyping(true);
          setIsProcessing(false);
          // Loop continues — AI will synthesize results
        } else {
          // DOM-only tools, no need for synthesis
          setIsProcessing(false);
          break;
        }
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

  // ─── Tool Call Badge ─────────────────────────────────────────────────────

  function ToolBadge({ tc }: { tc: ToolCall }) {
    const Icon = toolIcon(tc.type);
    const colors = {
      pending: "bg-gray-800/80 border-gray-600 text-gray-400",
      running: "bg-indigo-950/80 border-indigo-500/50 text-indigo-300",
      done: "bg-emerald-950/80 border-emerald-500/30 text-emerald-300",
      error: "bg-red-950/80 border-red-500/30 text-red-300",
    };

    return (
      <motion.div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${colors[tc.status]}`}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        layout
      >
        {tc.status === "running" ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : tc.status === "done" ? <CheckCircle2 className="w-3.5 h-3.5" />
          : tc.status === "error" ? <AlertCircle className="w-3.5 h-3.5" />
          : <Icon className="w-3.5 h-3.5" />}
        <span className="font-medium">{tc.label}</span>
        {tc.status === "done" && tc.result && (
          <span className="text-emerald-400/60 truncate max-w-[200px]">— {tc.result}</span>
        )}
        {tc.status === "error" && tc.result && (
          <span className="text-red-400/60 truncate max-w-[200px]">— {tc.result}</span>
        )}
      </motion.div>
    );
  }

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
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Academy Agent
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                AI
              </span>
            </h1>
            <p className="text-sm text-gray-400">
              {isProcessing ? (
                <span className="text-indigo-300 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Executing tools...
                </span>
              ) : isTyping ? (
                <span className="text-purple-300 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                </span>
              ) : (
                `Your AI co-pilot • ${profile?.first_name || "User"}'s assistant`
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="text-gray-400 hover:text-white gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <div className="text-center mb-8 pt-8">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-pink-600/20 flex items-center justify-center mx-auto mb-5 border border-indigo-500/20">
                <Sparkles className="w-10 h-10 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Hey {profile?.first_name || "there"}! I'm your Academy Agent.
              </h2>
              <p className="text-gray-400 max-w-lg mx-auto">
                I know your profile, can search the web, navigate pages, fill forms, and help you with anything on the platform. What would you like to do?
              </p>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {quickActions.map((qa) => (
                <motion.button
                  key={qa.label}
                  onClick={() => sendMessage(qa.message)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-indigo-500/30 hover:bg-indigo-950/20 transition-all text-center group"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <qa.icon className="w-5 h-5 text-gray-400 group-hover:text-indigo-400 transition-colors" />
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{qa.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Context Summary Card */}
            {userContext && (
              <div className="mt-8 p-4 rounded-2xl bg-black/30 border border-white/5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Your Context (what I know about you)</p>
                <div className="text-xs text-gray-400 space-y-1">
                  {userContext.profile && (
                    <p>
                      <span className="text-gray-300">{(userContext.profile as Record<string, unknown>).first_name} {(userContext.profile as Record<string, unknown>).last_name}</span>
                      {" — "}
                      <span className="capitalize">{role}</span>
                      {(userContext.profile as Record<string, unknown>).location && ` • ${(userContext.profile as Record<string, unknown>).location}`}
                    </p>
                  )}
                  {role === "candidate" && userContext.roleProfile && (
                    <p>
                      Tier: <span className="text-indigo-300 capitalize">{(userContext.roleProfile as Record<string, unknown>).current_tier || "None"}</span>
                      {" • Skills: "}{((userContext.roleProfile as Record<string, unknown>).skills as string[] || []).slice(0, 5).join(", ") || "None set"}
                      {" • Loops: "}{(userContext.roleProfile as Record<string, unknown>).mentor_loops || 0}
                    </p>
                  )}
                  {userContext.growthLog && <p>{userContext.growthLog.length} growth log entries</p>}
                  {userContext.notifications?.length ? <p>{userContext.notifications.length} unread notifications</p> : null}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Message List */}
        {messages.filter(m => m.role !== "tool").map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-4 max-w-3xl ${msg.role === "user" ? "ml-auto" : ""}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`flex-1 min-w-0 ${msg.role === "user" ? "max-w-[80%]" : ""}`}>
              {msg.role === "assistant" && (
                <span className="text-xs font-medium text-purple-400 mb-1 block">Academy Agent</span>
              )}
              <div className={`p-4 rounded-2xl ${
                msg.role === "user"
                  ? "bg-indigo-600/20 border border-indigo-500/20 text-gray-200 rounded-tr-sm"
                  : "bg-black/40 border border-white/5 text-gray-300 rounded-tl-sm"
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>

              {/* Tool Call Badges */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {msg.toolCalls.map((tc, tIdx) => (
                    <ToolBadge key={tIdx} tc={tc} />
                  ))}
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-4 h-4 text-gray-300" />
              </div>
            )}
          </motion.div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-4 max-w-3xl"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="p-4 rounded-2xl rounded-tl-sm bg-black/40 border border-white/5">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                <span className="text-sm text-gray-400">
                  {isProcessing ? "Processing tool results..." : "Thinking..."}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-white/10 bg-black/30">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isProcessing ? "Agent is working..." : "Ask me anything, tell me to do something, or paste a URL..."}
                className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 resize-none min-h-[48px] max-h-[120px]"
                rows={1}
                disabled={isTyping || isProcessing}
              />
            </div>
            <motion.button
              type="submit"
              disabled={!input.trim() || isTyping || isProcessing}
              className="w-12 h-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isTyping || isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </motion.button>
          </div>
          <p className="text-center text-[10px] text-gray-600 mt-2">
            Academy Agent can search the web, read pages, navigate, fill forms, and access your data.
          </p>
        </form>
      </div>
    </div>
  );
}
