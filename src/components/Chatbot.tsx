import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatbotDBSchema extends DBSchema {
  messages: {
    key: string;
    value: { id: string; messages: Message[] };
  };
}

const QUICK_REPLIES = [
  "What is The 3rd Academy?",
  "How does MentorLink work?",
  "What is a Skill Passport?",
  "What am I looking at right now?",
  "How do I get started?",
];

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

You have screen awareness — you can see what the user is currently viewing on the page. Use the page context provided below to give contextual, relevant help. If the user asks about something visible on their screen, reference it directly. If they're on a dashboard, help them with that dashboard's features. If they're on the homepage, help them navigate.`;

/** Extracts a snapshot of the current page DOM for contextual AI awareness */
function extractPageContext(): string {
  const loc = window.location;
  const pageTitle = document.title;

  // Current route / URL
  const url = loc.pathname + loc.search;

  // Grab all visible headings
  const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
    .map((el) => {
      const text = (el as HTMLElement).innerText?.trim();
      return text ? `${el.tagName}: ${text}` : null;
    })
    .filter(Boolean)
    .slice(0, 15);

  // Active navigation items (links with active/current styling)
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

  // Visible buttons and actions
  const buttons = Array.from(document.querySelectorAll("button, [role='button'], a.btn"))
    .map((el) => (el as HTMLElement).innerText?.trim())
    .filter((t) => t && t.length > 1 && t.length < 60)
    .slice(0, 15);

  // Form fields currently on screen
  const formFields = Array.from(document.querySelectorAll("input[placeholder], textarea[placeholder], select"))
    .map((el) => {
      const placeholder = el.getAttribute("placeholder") || "";
      const label = el.getAttribute("aria-label") || "";
      const type = el.getAttribute("type") || el.tagName.toLowerCase();
      return `${type}: ${placeholder || label}`.trim();
    })
    .filter((t) => t.length > 2)
    .slice(0, 10);

  // Visible data/stats cards — grab text from small card-like elements
  const statCards = Array.from(document.querySelectorAll("[class*='rounded-xl'], [class*='rounded-2xl']"))
    .map((el) => {
      const text = (el as HTMLElement).innerText?.trim();
      return text && text.length < 100 ? text.replace(/\n+/g, " | ") : null;
    })
    .filter(Boolean)
    .slice(0, 10);

  // Tables visible on page
  const tables = Array.from(document.querySelectorAll("table"))
    .map((table) => {
      const headers = Array.from(table.querySelectorAll("th"))
        .map((th) => (th as HTMLElement).innerText?.trim())
        .filter(Boolean);
      const rowCount = table.querySelectorAll("tbody tr").length;
      return headers.length ? `Table [${headers.join(", ")}] — ${rowCount} rows` : null;
    })
    .filter(Boolean);

  // Visible alerts or status messages
  const alerts = Array.from(document.querySelectorAll("[role='alert'], [class*='alert'], [class*='bg-amber'], [class*='bg-red-500'], [class*='bg-emerald']"))
    .map((el) => (el as HTMLElement).innerText?.trim())
    .filter((t) => t && t.length > 5 && t.length < 200)
    .slice(0, 5);

  // Main content text (first 500 chars of the main area)
  const mainContent = document.querySelector("main")?.innerText?.trim().slice(0, 500) || "";

  const sections = [
    `Page: ${pageTitle}`,
    `URL: ${url}`,
    headings.length ? `Headings:\n${headings.join("\n")}` : "",
    activeNavItems.length ? `Active Nav: ${activeNavItems.join(", ")}` : "",
    buttons.length ? `Buttons: ${buttons.join(", ")}` : "",
    formFields.length ? `Form Fields:\n${formFields.join("\n")}` : "",
    tables.length ? `Tables:\n${tables.join("\n")}` : "",
    statCards.length ? `Visible Cards:\n${statCards.join("\n")}` : "",
    alerts.length ? `Alerts:\n${alerts.join("\n")}` : "",
    mainContent ? `Page Content Preview:\n${mainContent}` : "",
  ].filter(Boolean);

  return sections.join("\n\n");
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [db, setDb] = useState<IDBPDatabase<ChatbotDBSchema> | null>(null);
  const [screenAware, setScreenAware] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  // Build the system prompt with optional page context
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

      // Load saved messages
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

  // Save messages to IndexedDB
  useEffect(() => {
    if (db && messages.length > 0) {
      db.put("messages", { id: "chat", messages });
    }
  }, [messages, db]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: buildSystemPrompt() },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: messageContent },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content:
          data.completion ||
          "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chatbot error:", error);
      const errorMessage: Message = {
        role: "assistant",
        content:
          "Sorry, I'm having trouble connecting right now. Please try again later.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const clearChat = () => {
    setMessages([]);
    if (db) {
      db.delete("messages", "chat");
    }
  };

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
            className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[400px] h-full sm:h-[600px] sm:max-h-[80vh] flex flex-col bg-black/95 backdrop-blur-xl border border-white/30 sm:rounded-3xl shadow-2xl overflow-hidden"
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
                  <p className="text-xs text-gray-400">Powered by AI</p>
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
                  title={screenAware ? "Screen awareness ON — I can see your page" : "Screen awareness OFF"}
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
                  Viewing: <span className="text-white font-medium">{location.pathname === "/" ? "Homepage" : location.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ")}</span>
                </span>
                <span className="text-xs text-indigo-400/50 ml-auto">I can see your screen</span>
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
                  <p className="text-sm text-gray-400 mb-6">
                    I'm here to help you learn about our platform and start your
                    credentialing journey.
                  </p>

                  {/* Quick Replies */}
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
                      <span className={`text-xs font-medium ${
                        message.role === "user" ? "text-indigo-300" : "text-purple-300"
                      }`}>
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
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0s" }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
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
                  placeholder="Ask me anything..."
                  className="flex-1 bg-black/80 border-white/20 text-white placeholder:text-gray-500 focus:border-indigo-500"
                  disabled={isTyping}
                />
                <motion.button
                  type="submit"
                  disabled={!inputValue.trim() || isTyping}
                  className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isTyping ? (
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
