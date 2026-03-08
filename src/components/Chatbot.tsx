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
  | "SCROLL_PAGE";

interface ParsedAction {
  type: ActionType;
  params: string[];
  raw: string;
}

const ACTION_REGEX = /\[\[ACTION:(\w+)\|([^\]]*)\]\]/g;

function parseActions(text: string): { cleanText: string; actions: ParsedAction[] } {
  const actions: ParsedAction[] = [];
  const cleanText = text.replace(ACTION_REGEX, (match, type, paramStr) => {
    actions.push({
      type: type as ActionType,
      params: paramStr.split("|").map((p: string) => p.trim()),
      raw: match,
    });
    return "";
  });
  return { cleanText: cleanText.trim(), actions };
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
    default:
      return Play;
  }
}

// ─── DOM Action Executor ─────────────────────────────────────────────────────

/** Find an element by visible text content, placeholder, aria-label, or CSS selector */
function findElement(query: string): HTMLElement | null {
  // Try as CSS selector first
  try {
    const el = document.querySelector(query) as HTMLElement;
    if (el) return el;
  } catch {
    // Not a valid selector, continue
  }

  // Search by text content in buttons, links, headings, labels
  const searchTargets = "button, a, [role='button'], h1, h2, h3, h4, label, [role='tab'], [role='menuitem'], input, textarea, select";
  const allEls = Array.from(document.querySelectorAll(searchTargets)) as HTMLElement[];

  const queryLower = query.toLowerCase().trim();

  // Exact text match
  for (const el of allEls) {
    const text = el.innerText?.trim().toLowerCase() || "";
    if (text === queryLower) return el;
  }

  // Partial text match
  for (const el of allEls) {
    const text = el.innerText?.trim().toLowerCase() || "";
    if (text.includes(queryLower) || queryLower.includes(text)) return el;
  }

  // Match by placeholder or aria-label
  for (const el of allEls) {
    const placeholder = el.getAttribute("placeholder")?.toLowerCase() || "";
    const ariaLabel = el.getAttribute("aria-label")?.toLowerCase() || "";
    const name = el.getAttribute("name")?.toLowerCase() || "";
    if (placeholder.includes(queryLower) || ariaLabel.includes(queryLower) || name.includes(queryLower)) return el;
  }

  // Match by id or data attributes
  const byId = document.getElementById(query);
  if (byId) return byId;

  const byName = document.querySelector(`[name="${query}"]`) as HTMLElement;
  if (byName) return byName;

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

    default:
      return { ok: false, detail: `Unknown action: ${action.type}` };
  }
}

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
      const href = el.getAttribute("href") || "";
      return text && text.length > 1 && text.length < 60 ? (href ? `${text} (${href})` : text) : null;
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
      const identifier = name || id || placeholder || label;
      return identifier ? `${type}[${identifier}]${value ? `="${value}"` : ""}` : null;
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

### Rules for Actions
1. ALWAYS include actions when the user asks you to DO something (open a page, click something, fill a form, etc.)
2. You can include MULTIPLE actions in one response — they execute sequentially
3. Combine text explanation WITH actions. Explain what you're doing while doing it.
4. Use the Clickable Elements list from screen context to know exact button/link text to use
5. Use the Form Fields list to know exact field names/placeholders to fill
6. When navigating, use the route paths like /platform, /employers, /schools, /about, /contact, /blog, /help, /careers, /press, /privacy, /terms, /security
7. For multi-step tasks (like filling a whole form), chain multiple FILL actions followed by SUBMIT_FORM
8. If you cannot find an element, tell the user and suggest alternatives
9. ALWAYS use actions proactively — if a user says "go to the platform page" just do it, don't just give instructions

### Example Responses with Actions

User: "Open the platform page"
Response: "Opening the Platform page for you now! [[ACTION:NAVIGATE|/platform]]"

User: "Click the Get Started button"
Response: "Clicking Get Started now! [[ACTION:CLICK|Get Started]]"

User: "Fill in the contact form with my name John"
Response: "I'll fill that in for you. [[ACTION:FILL|name|John]] [[ACTION:FILL|email|]] Let me know your email and I'll fill that too!"

User: "Scroll down to see more"
Response: "Scrolling down for you. [[ACTION:SCROLL_PAGE|down|600]]"

User: "Show me where the MentorLink section is"
Response: "Here's the MentorLink section! [[ACTION:SCROLL_TO|MentorLink]] [[ACTION:HIGHLIGHT|MentorLink]]"

User: "Submit the form"
Response: "Submitting the form now! [[ACTION:SUBMIT_FORM|]]"`;

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
