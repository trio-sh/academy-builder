import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { openDB, DBSchema, IDBPDatabase } from "idb";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  Monitor,
  Play,
  CheckCircle2,
  AlertCircle,
  MousePointerClick,
  Navigation,
  FormInput,
  ScrollText,
  Eye,
  Zap,
  FileText,
  ArrowRight,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActionResult {
  action: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actions?: ActionResult[];
  pdfDownloads?: { title: string; url: string }[];
}

interface ChatbotDBSchema extends DBSchema {
  messages: {
    key: string;
    value: { id: string; messages: Message[] };
  };
}

// ─── Action Protocol ─────────────────────────────────────────────────────────
// The AI embeds commands like [[ACTION:NAVIGATE|/platform]] in its response.
// We parse them out, show clean text + action badges, and execute on the DOM.

type ActionType =
  | "NAVIGATE"
  | "CLICK"
  | "SCROLL_TO"
  | "FILL"
  | "CLEAR_FIELD"
  | "SELECT_OPTION"
  | "TOGGLE"
  | "SUBMIT_FORM"
  | "HIGHLIGHT"
  | "WAIT"
  | "OPEN_MODAL"
  | "CLOSE_MODAL"
  | "SCROLL_PAGE"
  | "GENERATE_PDF"
  | "DELEGATE_TO_PRAXIS";

interface ParsedAction {
  type: ActionType;
  params: string[];
  raw: string;
}

// Robust regex: match [[ACTION:TYPE|...]] even when params contain brackets
const ACTION_REGEX = /\[\[ACTION:(\w+)\|((?:[^\]]|\][^\]])*?)\]\]/g;

// Fallback: catch plain-text patterns the AI sometimes emits instead of proper tags
const FALLBACK_CLICK_REGEX = /^(?:Click(?:ing)?|Tap(?:ping)?|Press(?:ing)?)\s+[""]([^""]+)[""]\s*$/gim;
const FALLBACK_NAV_REGEX = /^(?:Navigate|Navigating|Going|Go)\s+to\s+[""]?([/\w-]+)[""]?\s*$/gim;

function parseActions(text: string): { cleanText: string; actions: ParsedAction[] } {
  const actions: ParsedAction[] = [];

  // 1. Extract formal [[ACTION:...]] tags
  let cleanText = text.replace(ACTION_REGEX, (match, type, paramStr) => {
    actions.push({
      type: type as ActionType,
      params: paramStr.split("|").map((p: string) => p.trim()),
      raw: match,
    });
    return "";
  });

  // 2. Extract fallback plain-text actions (only if no formal actions found)
  if (actions.length === 0) {
    let fallbackMatch: RegExpExecArray | null;

    FALLBACK_CLICK_REGEX.lastIndex = 0;
    while ((fallbackMatch = FALLBACK_CLICK_REGEX.exec(cleanText)) !== null) {
      actions.push({
        type: "CLICK",
        params: [fallbackMatch[1]],
        raw: fallbackMatch[0],
      });
      cleanText = cleanText.replace(fallbackMatch[0], "");
    }

    FALLBACK_NAV_REGEX.lastIndex = 0;
    while ((fallbackMatch = FALLBACK_NAV_REGEX.exec(cleanText)) !== null) {
      actions.push({
        type: "NAVIGATE",
        params: [fallbackMatch[1]],
        raw: fallbackMatch[0],
      });
      cleanText = cleanText.replace(fallbackMatch[0], "");
    }
  }

  // 3. Clean up extra whitespace/newlines from removed tags
  cleanText = cleanText.replace(/\n{3,}/g, "\n\n").trim();

  return { cleanText, actions };
}

function actionLabel(action: ParsedAction): string {
  switch (action.type) {
    case "NAVIGATE":
      return `Navigate to ${action.params[0]}`;
    case "CLICK":
      return `Click "${action.params[0]}"`;
    case "SCROLL_TO":
      return `Scroll to "${action.params[0]}"`;
    case "FILL":
      return `Fill "${action.params[0]}" with "${action.params[1] || ""}"`;
    case "CLEAR_FIELD":
      return `Clear field "${action.params[0]}"`;
    case "SELECT_OPTION":
      return `Select "${action.params[1] || ""}" in "${action.params[0]}"`;
    case "TOGGLE":
      return `Toggle "${action.params[0]}"`;
    case "SUBMIT_FORM":
      return `Submit form${action.params[0] ? ` "${action.params[0]}"` : ""}`;
    case "HIGHLIGHT":
      return `Highlight "${action.params[0]}"`;
    case "WAIT":
      return `Wait ${action.params[0] || "1"}s`;
    case "OPEN_MODAL":
      return `Open "${action.params[0]}"`;
    case "CLOSE_MODAL":
      return `Close dialog`;
    case "SCROLL_PAGE":
      return `Scroll ${action.params[0] || "down"}`;
    case "GENERATE_PDF":
      return `Generate PDF: ${action.params[0] || "Document"}`;
    case "DELEGATE_TO_PRAXIS":
      return `Handing off to Praxis...`;
    default:
      return action.type;
  }
}

function actionIcon(type: ActionType) {
  switch (type) {
    case "NAVIGATE":
      return Navigation;
    case "CLICK":
    case "OPEN_MODAL":
    case "CLOSE_MODAL":
      return MousePointerClick;
    case "SCROLL_TO":
    case "SCROLL_PAGE":
      return ScrollText;
    case "FILL":
    case "CLEAR_FIELD":
    case "SELECT_OPTION":
      return FormInput;
    case "TOGGLE":
    case "SUBMIT_FORM":
      return Zap;
    case "HIGHLIGHT":
      return Eye;
    case "WAIT":
      return Loader2;
    case "GENERATE_PDF":
      return FileText;
    case "DELEGATE_TO_PRAXIS":
      return ArrowRight;
    default:
      return Play;
  }
}

// ─── DOM Action Executor ─────────────────────────────────────────────────────

/** Normalize AI-generated field identifiers like "email[email]", "password[password]" to clean names */
function normalizeFieldQuery(query: string): string[] {
  const candidates: string[] = [query.trim()];

  // Handle "type[name]" format from context: extract inner name
  const bracketMatch = query.match(/^[\w-]+\[([^\]]+)\]$/);
  if (bracketMatch) {
    candidates.push(bracketMatch[1]);
  }

  // Handle "name=value" or quoted strings
  const eqMatch = query.match(/^["']?([^"'=]+)["']?$/);
  if (eqMatch && eqMatch[1] !== query) {
    candidates.push(eqMatch[1].trim());
  }

  return [...new Set(candidates)];
}

/** Find an element by visible text content, placeholder, aria-label, name, id, or CSS selector */
function findElement(query: string): HTMLElement | null {
  const queries = normalizeFieldQuery(query);

  for (const q of queries) {
    // Try as CSS selector
    try {
      const el = document.querySelector(q) as HTMLElement;
      if (el) return el;
    } catch {
      // Not a valid selector, continue
    }

    // Try by id
    const byId = document.getElementById(q);
    if (byId) return byId;

    // Try by name attribute (for form fields)
    try {
      const byName = document.querySelector(`[name="${q}"]`) as HTMLElement;
      if (byName) return byName;
    } catch { /* ignore */ }

    // Try by placeholder
    try {
      const byPlaceholder = document.querySelector(`[placeholder="${q}"], [placeholder*="${q}" i]`) as HTMLElement;
      if (byPlaceholder) return byPlaceholder;
    } catch { /* ignore */ }

    // Try by type attribute for inputs (e.g. "email" matches input[type="email"])
    try {
      const byType = document.querySelector(`input[type="${q}"]`) as HTMLElement;
      if (byType) return byType;
    } catch { /* ignore */ }
  }

  // Full element search by text/attributes
  const searchTargets = "button, a, [role='button'], h1, h2, h3, h4, label, [role='tab'], [role='menuitem'], input, textarea, select, [role='checkbox'], [role='switch']";
  const allEls = Array.from(document.querySelectorAll(searchTargets)) as HTMLElement[];

  for (const q of queries) {
    const qLower = q.toLowerCase().trim();
    if (!qLower) continue;

    // Exact text match
    for (const el of allEls) {
      const text = el.innerText?.trim().toLowerCase() || "";
      if (text === qLower) return el;
    }

    // Attribute matches (placeholder, aria-label, name, title)
    for (const el of allEls) {
      const attrs = [
        el.getAttribute("placeholder"),
        el.getAttribute("aria-label"),
        el.getAttribute("name"),
        el.getAttribute("title"),
        el.getAttribute("data-testid"),
      ]
        .filter(Boolean)
        .map((a) => a!.toLowerCase());
      if (attrs.some((a) => a === qLower || a.includes(qLower))) return el;
    }

    // Partial text match (buttons, links)
    for (const el of allEls) {
      const text = el.innerText?.trim().toLowerCase() || "";
      if (text.length > 0 && text.length < 80 && (text.includes(qLower) || qLower.includes(text))) return el;
    }

    // Match by associated label (for inputs with id matching a <label for="">)
    const labels = Array.from(document.querySelectorAll("label")) as HTMLLabelElement[];
    for (const label of labels) {
      if (label.innerText?.toLowerCase().includes(qLower)) {
        const forId = label.getAttribute("for");
        if (forId) {
          const target = document.getElementById(forId);
          if (target) return target;
        }
        // Label wraps input
        const inner = label.querySelector("input, textarea, select") as HTMLElement;
        if (inner) return inner;
      }
    }
  }

  return null;
}

/** Highlight an element temporarily with a glowing border */
function highlightElement(el: HTMLElement, durationMs = 2000) {
  const original = el.style.cssText;
  el.style.outline = "3px solid #818cf8";
  el.style.outlineOffset = "2px";
  el.style.boxShadow = "0 0 20px rgba(129, 140, 248, 0.5)";
  el.style.transition = "outline 0.3s, box-shadow 0.3s";
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => {
    el.style.cssText = original;
  }, durationMs);
}

/** Set a native input value and fire React-compatible change events */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const nativeInputValueSetter =
    Object.getOwnPropertyDescriptor(
      el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      "value"
    )?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(el, value);
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

async function executeAction(
  action: ParsedAction,
  navigate: ReturnType<typeof useNavigate>
): Promise<{ ok: boolean; detail: string }> {
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  switch (action.type) {
    case "NAVIGATE": {
      const path = action.params[0];
      if (path) {
        navigate(path);
        await delay(300);
        return { ok: true, detail: `Navigated to ${path}` };
      }
      return { ok: false, detail: "No path specified" };
    }

    case "CLICK": {
      const el = findElement(action.params[0]);
      if (el) {
        highlightElement(el, 1000);
        await delay(400);
        el.click();
        return { ok: true, detail: `Clicked "${action.params[0]}"` };
      }
      return { ok: false, detail: `Element "${action.params[0]}" not found` };
    }

    case "SCROLL_TO": {
      const el = findElement(action.params[0]);
      if (el) {
        highlightElement(el, 2000);
        return { ok: true, detail: `Scrolled to "${action.params[0]}"` };
      }
      return { ok: false, detail: `Element "${action.params[0]}" not found` };
    }

    case "FILL": {
      const el = findElement(action.params[0]);
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
        highlightElement(el, 1500);
        await delay(200);
        (el as HTMLInputElement).focus();
        setNativeValue(el as HTMLInputElement, action.params[1] || "");
        return { ok: true, detail: `Filled "${action.params[0]}"` };
      }
      if (el) {
        return { ok: false, detail: `"${action.params[0]}" is not an input field` };
      }
      return { ok: false, detail: `Field "${action.params[0]}" not found` };
    }

    case "CLEAR_FIELD": {
      const el = findElement(action.params[0]);
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
        (el as HTMLInputElement).focus();
        setNativeValue(el as HTMLInputElement, "");
        return { ok: true, detail: `Cleared "${action.params[0]}"` };
      }
      return { ok: false, detail: `Field "${action.params[0]}" not found` };
    }

    case "SELECT_OPTION": {
      const el = findElement(action.params[0]) as HTMLSelectElement | null;
      if (el && el.tagName === "SELECT") {
        const optionValue = action.params[1] || "";
        const options = Array.from(el.options);
        const match = options.find(
          (o) =>
            o.value.toLowerCase() === optionValue.toLowerCase() ||
            o.text.toLowerCase() === optionValue.toLowerCase()
        );
        if (match) {
          el.value = match.value;
          el.dispatchEvent(new Event("change", { bubbles: true }));
          highlightElement(el, 1500);
          return { ok: true, detail: `Selected "${match.text}" in "${action.params[0]}"` };
        }
        return { ok: false, detail: `Option "${optionValue}" not found in select` };
      }
      return { ok: false, detail: `Select element "${action.params[0]}" not found` };
    }

    case "TOGGLE": {
      const el = findElement(action.params[0]);
      if (el) {
        highlightElement(el, 1000);
        await delay(200);
        el.click();
        return { ok: true, detail: `Toggled "${action.params[0]}"` };
      }
      return { ok: false, detail: `Element "${action.params[0]}" not found` };
    }

    case "SUBMIT_FORM": {
      const formQuery = action.params[0] || "form";
      let form: HTMLFormElement | null = null;
      try {
        form = document.querySelector(formQuery) as HTMLFormElement;
      } catch {
        form = document.querySelector("form") as HTMLFormElement;
      }
      if (form) {
        // Try to find and click a submit button first
        const submitBtn =
          form.querySelector("button[type='submit']") ||
          form.querySelector("button:not([type])") ||
          form.querySelector("input[type='submit']");
        if (submitBtn) {
          highlightElement(submitBtn as HTMLElement, 1000);
          await delay(300);
          (submitBtn as HTMLElement).click();
          return { ok: true, detail: "Submitted form via button" };
        }
        form.requestSubmit();
        return { ok: true, detail: "Submitted form" };
      }
      return { ok: false, detail: "Form not found" };
    }

    case "HIGHLIGHT": {
      const el = findElement(action.params[0]);
      if (el) {
        highlightElement(el, 3000);
        return { ok: true, detail: `Highlighted "${action.params[0]}"` };
      }
      return { ok: false, detail: `Element "${action.params[0]}" not found` };
    }

    case "WAIT": {
      const seconds = parseFloat(action.params[0] || "1");
      await delay(seconds * 1000);
      return { ok: true, detail: `Waited ${seconds}s` };
    }

    case "OPEN_MODAL": {
      const el = findElement(action.params[0]);
      if (el) {
        highlightElement(el, 800);
        await delay(300);
        el.click();
        return { ok: true, detail: `Opened "${action.params[0]}"` };
      }
      return { ok: false, detail: `Trigger "${action.params[0]}" not found` };
    }

    case "CLOSE_MODAL": {
      // Try common close patterns
      const closeBtn =
        document.querySelector("[data-dismiss], [aria-label='Close'], dialog button[aria-label='Close']") ||
        document.querySelector(".modal button.close, [role='dialog'] button");
      if (closeBtn) {
        (closeBtn as HTMLElement).click();
        return { ok: true, detail: "Closed dialog" };
      }
      // Press Escape
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      return { ok: true, detail: "Sent Escape key" };
    }

    case "SCROLL_PAGE": {
      const direction = (action.params[0] || "down").toLowerCase();
      const amount = parseInt(action.params[1] || "400");
      if (direction === "top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (direction === "bottom") {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      } else if (direction === "up") {
        window.scrollBy({ top: -amount, behavior: "smooth" });
      } else {
        window.scrollBy({ top: amount, behavior: "smooth" });
      }
      return { ok: true, detail: `Scrolled ${direction}` };
    }

    case "GENERATE_PDF": {
      try {
        const pdfMakeModule = await import("pdfmake/build/pdfmake");
        const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
        const pdfMake = pdfMakeModule.default || pdfMakeModule;
        if (pdfFontsModule?.pdfMake?.vfs) {
          pdfMake.vfs = pdfFontsModule.pdfMake.vfs;
        } else if ((pdfFontsModule as Record<string, unknown>).default) {
          const vfsDef = (pdfFontsModule as Record<string, unknown>).default as Record<string, unknown>;
          if (vfsDef.pdfMake) pdfMake.vfs = (vfsDef.pdfMake as Record<string, unknown>).vfs;
        }

        const title = action.params[0] || "Document";
        // params[1] is base64-encoded JSON of pdfmake content nodes (or raw JSON for backward compat)
        let content: unknown[] = [];
        try {
          const raw = action.params[1] || "[]";
          // Try base64 decode first (backend encodes with Buffer.from(...).toString("base64"))
          let jsonStr: string;
          try {
            jsonStr = atob(raw);
            // Verify it looks like JSON (starts with [ or {)
            if (!/^\s*[\[{]/.test(jsonStr)) {
              jsonStr = raw; // Not base64-encoded JSON, use raw
            }
          } catch {
            jsonStr = raw; // Not valid base64, assume raw JSON string
          }
          content = JSON.parse(jsonStr);
        } catch {
          // Don't render raw JSON/base64 as text — show a friendly error instead
          console.error("PDF content decode failed for:", action.params[0]);
          content = [
            { text: "This PDF could not be rendered correctly.", fontSize: 13, bold: true, color: "#cc0000", margin: [0, 0, 0, 8] },
            { text: "Please try generating this document again.", fontSize: 11, color: "#666666" },
          ];
        }

        const docDefinition = {
          pageSize: (action.params[2] || "A4") as string,
          pageOrientation: (action.params[3] || "portrait") as "portrait" | "landscape",
          content: [
            { text: title, fontSize: 20, bold: true, margin: [0, 0, 0, 12] as number[] },
            ...content,
          ],
          defaultStyle: { fontSize: 11 },
          styles: {
            header: { fontSize: 16, bold: true, margin: [0, 10, 0, 5] as number[] },
            subheader: { fontSize: 13, bold: true, margin: [0, 8, 0, 4] as number[] },
          },
        };

        const blob: Blob = await new Promise((resolve, reject) => {
          try {
            const pdf = pdfMake.createPdf(docDefinition);
            pdf.getBlob((b: Blob) => resolve(b));
          } catch (err) { reject(err); }
        });

        const url = URL.createObjectURL(blob);
        // Store the download for the UI to render
        chatbotPdfDownloads.push({ title, url });

        return { ok: true, detail: `PDF "${title}" generated` };
      } catch (err) {
        return { ok: false, detail: `PDF generation failed: ${err instanceof Error ? err.message : String(err)}` };
      }
    }

    case "DELEGATE_TO_PRAXIS": {
      const task = action.params.join("|");
      const currentPath = window.location.pathname;
      // Detect the user's dashboard base path
      const dashMatch = currentPath.match(/^\/dashboard\/[\w-]+/);
      const agentPath = dashMatch ? `${dashMatch[0]}/agent` : "/dashboard/candidate/agent";
      navigate(`${agentPath}?task=${encodeURIComponent(task)}`);
      await delay(300);
      return { ok: true, detail: "Handed off to Praxis" };
    }

    default:
      return { ok: false, detail: `Unknown action: ${action.type}` };
  }
}

// Module-level storage for PDF downloads generated by the chatbot
const chatbotPdfDownloads: { title: string; url: string }[] = [];

// ─── Page Context Extractor ──────────────────────────────────────────────────

function extractPageContext(): string {
  const loc = window.location;
  const pageTitle = document.title;
  const url = loc.pathname + loc.search;

  const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
    .map((el) => {
      const text = (el as HTMLElement).innerText?.trim();
      return text ? `${el.tagName}: ${text}` : null;
    })
    .filter(Boolean)
    .slice(0, 15);

  const activeNavItems = Array.from(document.querySelectorAll("nav a, aside a"))
    .filter((el) => {
      const classes = el.className || "";
      return (
        classes.includes("active") ||
        classes.includes("text-white") ||
        classes.includes("border-red") ||
        classes.includes("border-indigo") ||
        el.getAttribute("aria-current") === "page"
      );
    })
    .map((el) => (el as HTMLElement).innerText?.trim())
    .filter(Boolean)
    .slice(0, 5);

  const buttons = Array.from(document.querySelectorAll("button, [role='button'], a.btn, a[href]"))
    .map((el) => {
      const text = (el as HTMLElement).innerText?.trim();
      if (!text || text.length <= 1 || text.length >= 60) return null;
      // Show text and how to reference it in a CLICK action
      return `"${text}" → use [[ACTION:CLICK|${text}]]`;
    })
    .filter(Boolean)
    .slice(0, 20);

  const formFields = Array.from(document.querySelectorAll("input, textarea, select"))
    .map((el) => {
      const placeholder = el.getAttribute("placeholder") || "";
      const label = el.getAttribute("aria-label") || "";
      const name = el.getAttribute("name") || "";
      const type = el.getAttribute("type") || el.tagName.toLowerCase();
      const id = el.id || "";
      const value = (el as HTMLInputElement).value || "";
      // Pick the best identifier for the AI to use in FILL actions
      const fieldId = name || id || placeholder || label;
      if (!fieldId) return null;
      // Format: "type field — use FILL with 'fieldId'" so AI knows the exact string to use
      const current = value ? ` (current: "${value}")` : "";
      return `• ${type} field "${fieldId}"${current} → use [[ACTION:FILL|${fieldId}|value]]`;
    })
    .filter(Boolean)
    .slice(0, 15);

  const statCards = Array.from(document.querySelectorAll("[class*='rounded-xl'], [class*='rounded-2xl']"))
    .map((el) => {
      const text = (el as HTMLElement).innerText?.trim();
      return text && text.length < 100 ? text.replace(/\n+/g, " | ") : null;
    })
    .filter(Boolean)
    .slice(0, 10);

  const tables = Array.from(document.querySelectorAll("table"))
    .map((table) => {
      const headers = Array.from(table.querySelectorAll("th"))
        .map((th) => (th as HTMLElement).innerText?.trim())
        .filter(Boolean);
      const rowCount = table.querySelectorAll("tbody tr").length;
      return headers.length ? `Table [${headers.join(", ")}] — ${rowCount} rows` : null;
    })
    .filter(Boolean);

  const alerts = Array.from(document.querySelectorAll("[role='alert'], [class*='alert'], [class*='bg-amber'], [class*='bg-red-500'], [class*='bg-emerald']"))
    .map((el) => (el as HTMLElement).innerText?.trim())
    .filter((t) => t && t.length > 5 && t.length < 200)
    .slice(0, 5);

  const mainContent = document.querySelector("main")?.innerText?.trim().slice(0, 500) || "";

  const sections = [
    `Page: ${pageTitle}`,
    `URL: ${url}`,
    headings.length ? `Headings:\n${headings.join("\n")}` : "",
    activeNavItems.length ? `Active Nav: ${activeNavItems.join(", ")}` : "",
    buttons.length ? `Clickable Elements: ${buttons.join(", ")}` : "",
    formFields.length ? `Form Fields:\n${formFields.join("\n")}` : "",
    tables.length ? `Tables:\n${tables.join("\n")}` : "",
    statCards.length ? `Visible Cards:\n${statCards.join("\n")}` : "",
    alerts.length ? `Alerts:\n${alerts.join("\n")}` : "",
    mainContent ? `Page Content Preview:\n${mainContent}` : "",
  ].filter(Boolean);

  return sections.join("\n\n");
}

// ─── Prompt ──────────────────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `You are a helpful AI assistant for The 3rd Academy, a platform that bridges the gap between credentials and workplace readiness through mentor-gated behavioral validation.

Key platform components:
- Skill Passport: Evidence-linked credential earned through mentor validation
- MentorLink: Mandatory human validation layer where mentors observe candidates
- Growth Log: Continuous log of behavioral growth and observations
- BridgeFast: Short-form training modules for behavioral gaps
- LiveWorks Studio: Supervised project marketplace
- TalentVisa: Premium credential for exceptional candidates
- T3X Exchange: Employer marketplace for verified candidates
- Civic Access Lab: School track for early career awareness

Be friendly, concise, and helpful. Guide users to understand the platform and encourage them to get started on their credentialing journey.

## SCREEN AWARENESS
You can see what the user is currently viewing on the page. Use the page context to give contextual help. Reference visible elements directly.

## DOM ACTIONS — You can interact with the page!
You have the ability to perform real actions on the user's screen. When the user asks you to do something (navigate, click, fill forms, scroll, etc.), you MUST include action commands in your response.

### Action Command Syntax
Embed action commands in your response using this exact format:
[[ACTION:TYPE|param1|param2]]

### Available Actions
- [[ACTION:NAVIGATE|/path]] — Navigate to a page route (e.g., /platform, /employers, /contact)
- [[ACTION:CLICK|button text or selector]] — Click a button, link, or element by its visible text
- [[ACTION:SCROLL_TO|element text or selector]] — Scroll to and highlight an element
- [[ACTION:FILL|field name or placeholder|value to type]] — Fill an input or textarea field
- [[ACTION:CLEAR_FIELD|field name or placeholder]] — Clear a form field
- [[ACTION:SELECT_OPTION|select name|option text]] — Select an option from a dropdown
- [[ACTION:TOGGLE|element text]] — Toggle a checkbox, switch, or clickable toggle
- [[ACTION:SUBMIT_FORM|form selector (optional)]] — Submit a form
- [[ACTION:HIGHLIGHT|element text]] — Highlight an element visually without clicking
- [[ACTION:WAIT|seconds]] — Wait before executing the next action
- [[ACTION:OPEN_MODAL|trigger text]] — Click a trigger to open a modal/dialog
- [[ACTION:CLOSE_MODAL|]] — Close the current modal/dialog
- [[ACTION:SCROLL_PAGE|direction|amount]] — Scroll the page (up/down/top/bottom, optional pixel amount)
- [[ACTION:GENERATE_PDF|title|contentJSON]] — Generate a PDF document for download. The contentJSON is a JSON array of pdfmake nodes. Example: [[ACTION:GENERATE_PDF|My Report|[{"text":"Section 1","fontSize":16,"bold":true},{"text":"Details here..."}]]]
- [[ACTION:DELEGATE_TO_PRAXIS|task description]] — Hand off a complex task to Praxis (the full AI agent). Use this for tasks that require: multi-step research, database queries, web searches, long document generation, or anything beyond simple page interactions.

### When to DELEGATE to Praxis
For complex tasks that need multiple tools, deep research, database access, or long-form content generation, delegate to Praxis instead of trying to handle it yourself. Examples:
- "Generate a detailed PDF report of my progress" → DELEGATE
- "Research and summarize industry trends" → DELEGATE
- "Analyze my growth log and create a development plan" → DELEGATE
- "Help me build a resume based on my Skill Passport" → DELEGATE
Simple PDF generation (short docs with known content) can be handled directly. But if the task needs data queries or research first, delegate it.

### CRITICAL Rules for Actions
1. ALWAYS use [[ACTION:...]] tags for ANY interaction. NEVER write plain text like "Click Sign In" or "Navigate to /login" — those do nothing. You MUST use the tag syntax.
2. For FILL actions, use the EXACT field identifier from the "Form Fields" list in screen context. The fields show the exact string to use, like: use [[ACTION:FILL|email|value]] where "email" is the field name/id/placeholder.
3. You can chain MULTIPLE actions in one response — they execute in order with short pauses.
4. For CLICK, use the exact visible button/link text from the "Clickable Elements" list.
5. For multi-step tasks (login, form fill), chain FILL + CLICK/SUBMIT actions together.
6. ALWAYS act proactively — if user says "sign me in" → fill fields + click submit. Don't just describe what to do.
7. If you can't find an element, tell the user and offer alternatives.
8. ALWAYS place action tags AFTER your text explanation, not inline mid-sentence.

### Example Responses with Actions

User: "Open the platform page"
Assistant: "Opening the Platform page for you now! [[ACTION:NAVIGATE|/platform]]"

User: "Click the Get Started button"
Assistant: "Clicking Get Started! [[ACTION:CLICK|Get Started]]"

User: "Sign me in, email is john@test.com password abc123"
Assistant: "Signing you in now — filling email, password, and clicking Sign In. [[ACTION:FILL|email|john@test.com]] [[ACTION:FILL|password|abc123]] [[ACTION:CLICK|Sign In]]"

User: "Fill the contact form with name John, email john@example.com"
Assistant: "Filling the form for you! [[ACTION:FILL|name|John]] [[ACTION:FILL|email|john@example.com]]"

User: "Scroll down to see more"
Assistant: "Scrolling down. [[ACTION:SCROLL_PAGE|down|600]]"

User: "Show me where MentorLink is"
Assistant: "Here it is! [[ACTION:SCROLL_TO|MentorLink]] [[ACTION:HIGHLIGHT|MentorLink]]"

User: "Submit the form"
Assistant: "Submitting now! [[ACTION:SUBMIT_FORM|]]"

User: "Sign me out"
Assistant: "Signing you out! [[ACTION:CLICK|Sign Out]]"`;

const QUICK_REPLIES = [
  "What is The 3rd Academy?",
  "How does MentorLink work?",
  "Open the Platform page for me",
  "What am I looking at right now?",
  "Show me how to get started",
];

// ─── Component ───────────────────────────────────────────────────────────────

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [db, setDb] = useState<IDBPDatabase<ChatbotDBSchema> | null>(null);
  const [screenAware, setScreenAware] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const buildSystemPrompt = useCallback(() => {
    if (!screenAware) return BASE_SYSTEM_PROMPT;
    const pageContext = extractPageContext();
    return `${BASE_SYSTEM_PROMPT}\n\n--- CURRENT SCREEN CONTEXT ---\n${pageContext}\n--- END SCREEN CONTEXT ---`;
  }, [screenAware, location.pathname]);

  // Initialize IndexedDB
  useEffect(() => {
    const initDB = async () => {
      const database = await openDB<ChatbotDBSchema>("ChatbotDB", 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains("messages")) {
            db.createObjectStore("messages", { keyPath: "id" });
          }
        },
      });
      setDb(database);
      const stored = await database.get("messages", "chat");
      if (stored?.messages) {
        setMessages(
          stored.messages.map((m) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }))
        );
      }
    };
    initDB();
  }, []);

  // Save messages
  useEffect(() => {
    if (db && messages.length > 0) {
      db.put("messages", { id: "chat", messages });
    }
  }, [messages, db]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isExecuting]);

  // Focus input
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Execute parsed actions sequentially and update message action statuses
  const executeActions = useCallback(
    async (actions: ParsedAction[], messageIndex: number) => {
      setIsExecuting(true);
      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];

        // Mark current action as running
        setMessages((prev) => {
          const updated = [...prev];
          if (updated[messageIndex]?.actions) {
            updated[messageIndex] = {
              ...updated[messageIndex],
              actions: updated[messageIndex].actions!.map((a, idx) =>
                idx === i ? { ...a, status: "running" as const } : a
              ),
            };
          }
          return updated;
        });

        await delay(300);

        const result = await executeAction(action, navigate);

        // Mark action done or error
        setMessages((prev) => {
          const updated = [...prev];
          if (updated[messageIndex]?.actions) {
            updated[messageIndex] = {
              ...updated[messageIndex],
              actions: updated[messageIndex].actions!.map((a, idx) =>
                idx === i
                  ? { ...a, status: result.ok ? ("done" as const) : ("error" as const), detail: result.detail }
                  : a
              ),
            };
          }
          return updated;
        });

        // Small gap between actions
        if (i < actions.length - 1) {
          await delay(500);
        }
      }

      // Attach any PDF downloads generated during execution
      if (chatbotPdfDownloads.length > 0) {
        const downloads = [...chatbotPdfDownloads];
        chatbotPdfDownloads.length = 0;
        setMessages((prev) => {
          const updated = [...prev];
          if (updated[messageIndex]) {
            updated[messageIndex] = {
              ...updated[messageIndex],
              pdfDownloads: [...(updated[messageIndex].pdfDownloads || []), ...downloads],
            };
          }
          return updated;
        });
      }

      setIsExecuting(false);
    },
    [navigate]
  );

  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      const response = await fetch("https://api.a0.dev/ai/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: buildSystemPrompt() },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: messageContent },
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      const rawContent = data.completion || "Sorry, I encountered an error. Please try again.";

      // Parse actions from response
      const { cleanText, actions } = parseActions(rawContent);

      const actionResults: ActionResult[] = actions.map((a) => ({
        action: a.type,
        label: actionLabel(a),
        status: "pending" as const,
      }));

      const assistantMessage: Message = {
        role: "assistant",
        content: cleanText,
        timestamp: new Date(),
        actions: actionResults.length > 0 ? actionResults : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);

      // Execute actions if any
      if (actions.length > 0) {
        // The message we just pushed is at messages.length + 1 (user + assistant)
        const msgIndex = messages.length + 1;
        // Small delay to let UI render
        setTimeout(() => executeActions(actions, msgIndex), 200);
      }
    } catch (error) {
      console.error("Chatbot error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I'm having trouble connecting right now. Please try again later.",
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const clearChat = () => {
    setMessages([]);
    if (db) db.delete("messages", "chat");
  };

  // ─── Action Status Badge ───────────────────────────────────────────────────

  function ActionBadge({ result }: { result: ActionResult }) {
    const IconComp = actionIcon(result.action as ActionType);
    const statusColors = {
      pending: "bg-gray-800 border-gray-600 text-gray-400",
      running: "bg-indigo-950 border-indigo-500/50 text-indigo-300",
      done: "bg-emerald-950 border-emerald-500/30 text-emerald-300",
      error: "bg-red-950 border-red-500/30 text-red-300",
    };

    return (
      <motion.div
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${statusColors[result.status]}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        layout
      >
        {result.status === "running" ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : result.status === "done" ? (
          <CheckCircle2 className="w-3 h-3" />
        ) : result.status === "error" ? (
          <AlertCircle className="w-3 h-3" />
        ) : (
          <IconComp className="w-3 h-3" />
        )}
        <span className="truncate max-w-[200px]">{result.label}</span>
        {result.status === "error" && result.detail && (
          <span className="text-red-400/70 truncate max-w-[120px]">— {result.detail}</span>
        )}
      </motion.div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  // Hide the floating chatbot on the Praxis agent page to avoid duplication
  if (location.pathname.endsWith("/agent")) return null;

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-full shadow-2xl"
            onClick={() => setIsOpen(true)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              boxShadow: [
                "0 0 20px rgba(99, 102, 241, 0.4)",
                "0 0 40px rgba(139, 92, 246, 0.6)",
                "0 0 20px rgba(99, 102, 241, 0.4)",
              ],
            }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1, rotate: 10 }}
            whileTap={{ scale: 0.9 }}
            transition={{
              boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            <MessageCircle size={28} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[420px] h-full sm:h-[650px] sm:max-h-[85vh] flex flex-col bg-black/95 backdrop-blur-xl border border-white/30 sm:rounded-3xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/30 bg-gradient-to-r from-indigo-950/50 to-purple-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Academy Assistant</h3>
                  <p className="text-xs text-gray-400">
                    {isExecuting ? (
                      <span className="text-indigo-300 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin inline" /> Performing actions...
                      </span>
                    ) : (
                      "AI-powered with DOM control"
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setScreenAware(!screenAware)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                    screenAware
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      : "bg-black/80 text-gray-500 border border-white/10"
                  }`}
                  title={screenAware ? "Screen awareness ON" : "Screen awareness OFF"}
                >
                  <Monitor className="w-3 h-3" />
                  {screenAware ? "Aware" : "Off"}
                </button>
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearChat}
                    className="text-gray-400 hover:text-white hover:bg-black/80 text-xs"
                  >
                    Clear
                  </Button>
                )}
                <motion.button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-lg bg-black/80 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/20 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={18} />
                </motion.button>
              </div>
            </div>

            {/* Screen Context Indicator */}
            {screenAware && (
              <div className="px-4 py-2 bg-indigo-500/10 border-b border-indigo-500/20 flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs text-indigo-300">
                  Viewing:{" "}
                  <span className="text-white font-medium">
                    {location.pathname === "/"
                      ? "Homepage"
                      : location.pathname
                          .split("/")
                          .filter(Boolean)
                          .pop()
                          ?.replace(/-/g, " ")}
                  </span>
                </span>
                <span className="text-xs text-indigo-400/50 ml-auto flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Can act on screen
                </span>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <motion.div
                  className="text-center py-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">
                    Welcome to The 3rd Academy!
                  </h4>
                  <p className="text-sm text-gray-400 mb-2">
                    I can help you navigate, click buttons, fill forms, and interact with the page directly.
                  </p>
                  <p className="text-xs text-indigo-400/60 mb-6">
                    Try asking me to open a page or click something!
                  </p>

                  <div className="flex flex-wrap justify-center gap-2">
                    {QUICK_REPLIES.map((reply) => (
                      <motion.button
                        key={reply}
                        onClick={() => sendMessage(reply)}
                        className="px-3 py-2 text-sm rounded-xl bg-black/80 border border-white/30 text-gray-300 hover:bg-black/80 hover:border-white/20 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {reply}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  className="flex gap-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5 ${
                      message.role === "user"
                        ? "bg-gradient-to-br from-indigo-600 to-purple-600"
                        : "bg-black/80 border border-white/10"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Bot className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-medium ${
                          message.role === "user" ? "text-indigo-300" : "text-purple-300"
                        }`}
                      >
                        {message.role === "user" ? "You" : "Academy AI"}
                      </span>
                      <span className="text-xs text-gray-600">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div
                      className={`p-3 rounded-2xl rounded-tl-sm ${
                        message.role === "user"
                          ? "bg-indigo-600/20 border border-indigo-500/20 text-gray-200"
                          : "bg-black/60 border border-white/10 text-gray-300"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>

                    {/* Action Badges */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {message.actions.map((actionResult, aIdx) => (
                          <ActionBadge key={aIdx} result={actionResult} />
                        ))}
                      </div>
                    )}

                    {/* PDF Download Buttons */}
                    {message.pdfDownloads && message.pdfDownloads.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-2">
                        {message.pdfDownloads.map((pdf, pIdx) => (
                          <a
                            key={pIdx}
                            href={pdf.url}
                            download={`${pdf.title.replace(/[^a-zA-Z0-9_\- ]/g, "")}.pdf`}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 hover:border-indigo-500/50 transition-all text-xs text-white group w-fit"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-300" />
                            <span className="font-medium">{pdf.title}.pdf</span>
                            <Download className="w-3 h-3 text-indigo-400 group-hover:text-white transition-colors" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  className="flex gap-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="w-8 h-8 rounded-lg bg-black/80 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="p-3 rounded-2xl rounded-tl-sm bg-black/80 border border-white/30">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="p-4 border-t border-white/30 bg-black/50"
            >
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={isExecuting ? "Executing actions..." : "Ask me anything or tell me to do something..."}
                  className="flex-1 bg-black/80 border-white/20 text-white placeholder:text-gray-500 focus:border-indigo-500"
                  disabled={isTyping || isExecuting}
                />
                <motion.button
                  type="submit"
                  disabled={!inputValue.trim() || isTyping || isExecuting}
                  className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isTyping || isExecuting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
