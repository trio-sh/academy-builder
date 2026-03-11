import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  User,
  Send,
  Loader2,
  Sparkles,
  Trash2,
  ArrowUp,
  Globe,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Clock,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface UIMessage {
  role: "user" | "assistant" | "status";
  content: string;
  toolCalls?: ToolCall[];
  statuses?: StatusEvent[];
  timestamp: Date;
}

interface StatusEvent {
  type: "tool_start" | "tool_done";
  name: string;
  arguments?: Record<string, unknown>;
}

// ─── Custom Tool: get_current_time ──────────────────────────────────────────

const CUSTOM_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "get_current_time",
      description:
        "Get the current date and time in various timezones. Use when the user asks for the current time, date, or wants to know what time it is.",
      parameters: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description:
              'IANA timezone string, e.g. "America/New_York", "Europe/London", "Asia/Tokyo". Defaults to UTC if not provided.',
            default: "UTC",
          },
          format: {
            type: "string",
            enum: ["12h", "24h"],
            description: "Time format. Defaults to 12h.",
            default: "12h",
          },
        },
        required: [],
      },
    },
  },
];

function executeGetCurrentTime(args: { timezone?: string; format?: string }): string {
  const tz = args.timezone || "UTC";
  const fmt = args.format || "12h";
  try {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: tz,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: fmt === "12h",
    };
    const formatted = new Intl.DateTimeFormat("en-US", options).format(now);
    return JSON.stringify({
      timezone: tz,
      formatted,
      iso: now.toISOString(),
      unix: Math.floor(now.getTime() / 1000),
    });
  } catch {
    return JSON.stringify({ error: `Invalid timezone: ${tz}` });
  }
}

function executeCustomTool(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case "get_current_time":
      return executeGetCurrentTime(args as { timezone?: string; format?: string });
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ─── SSE Stream Consumer ────────────────────────────────────────────────────

interface ContinuationState {
  a0Messages: any[];
  step: number;
  id: string;
  model: string;
  contentSoFar: string;
}

interface StreamResult {
  content: string;
  toolCalls: ToolCall[];
  finishReason: string | null;
  statuses: StatusEvent[];
  continuation?: ContinuationState;
}

async function consumeStream(
  body: ReadableStream<Uint8Array>,
  onToken: (token: string) => void,
  onStatus: (status: StatusEvent) => void
): Promise<StreamResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let content = "";
  const toolCalls: (ToolCall & { _argFragments: string })[] = [];
  let finishReason: string | null = null;
  const statuses: StatusEvent[] = [];
  let continuation: ContinuationState | undefined;
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;

      try {
        const chunk = JSON.parse(line.slice(6));
        const delta = chunk.choices?.[0]?.delta;
        const reason = chunk.choices?.[0]?.finish_reason;

        if (reason) finishReason = reason;

        // Continuation state — server is handing off due to timeout
        if (delta?.continuation) {
          continuation = delta.continuation;
        }

        // Text content
        if (delta?.content) {
          content += delta.content;
          onToken(delta.content);
        }

        // Built-in tool status
        if (delta?.custom_status) {
          statuses.push(delta.custom_status);
          onStatus(delta.custom_status);
        }

        // Custom tool call deltas
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCalls[idx]) {
              toolCalls[idx] = {
                id: tc.id || "",
                type: tc.type || "function",
                function: { name: tc.function?.name || "", arguments: "" },
                _argFragments: "",
              };
            }
            if (tc.id) toolCalls[idx].id = tc.id;
            if (tc.function?.name) toolCalls[idx].function.name = tc.function.name;
            if (tc.function?.arguments) {
              toolCalls[idx]._argFragments += tc.function.arguments;
              toolCalls[idx].function.arguments = toolCalls[idx]._argFragments;
            }
          }
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  return {
    content,
    toolCalls: toolCalls.filter(Boolean).map(({ _argFragments, ...tc }) => tc),
    finishReason,
    statuses,
    continuation,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ApiTestChat() {
  const [uiMessages, setUiMessages] = useState<UIMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [activeStatuses, setActiveStatuses] = useState<StatusEvent[]>([]);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [uiMessages, streamingContent, activeStatuses]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [isStreaming]);

  const log = useCallback((msg: string) => {
    setDebugLog((prev) => [...prev, `[${new Date().toISOString().slice(11, 23)}] ${msg}`]);
  }, []);

  const sendRequest = useCallback(
    async (messages: Message[], continuationState?: ContinuationState) => {
      setIsStreaming(true);
      if (!continuationState) {
        // Fresh request — clear streaming state
        setStreamingContent("");
        setActiveStatuses([]);
      }
      // On continuation, we keep the existing streaming content visible

      const isContinuation = !!continuationState;
      log(isContinuation
        ? `→ CONTINUATION POST /api/chat/completions (resuming from timeout)`
        : `→ POST /api/chat/completions (${messages.length} messages, stream=true, multistep=true)`
      );

      const res = await fetch("/api/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          stream: true,
          multistep: true,
          max_steps: 60,
          max_tokens: 16384,
          tools: CUSTOM_TOOLS,
          temperature: 0.7,
          ...(continuationState ? { _continuation: continuationState } : {}),
        }),
      });

      if (!res.ok || !res.body) {
        const errorText = await res.text();
        log(`✗ Error ${res.status}: ${errorText}`);
        setIsStreaming(false);
        setUiMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${res.status} ${errorText}`, timestamp: new Date() },
        ]);
        return { messages, done: true };
      }

      log(`← Stream opened (${res.status})`);

      const allStatuses: StatusEvent[] = [];

      const result = await consumeStream(
        res.body,
        (token) => {
          setStreamingContent((prev) => prev + token);
        },
        (status) => {
          allStatuses.push(status);
          setActiveStatuses([...allStatuses]);
          log(`  ⚙ ${status.type}: ${status.name}${status.arguments ? ` (${JSON.stringify(status.arguments)})` : ""}`);
        }
      );

      log(`← Stream done: finish_reason=${result.finishReason}, content=${result.content.length}ch, tools=${result.toolCalls.length}`);

      // ── Continuation: server timed out, seamlessly re-request ──
      if (result.finishReason === "continuation" && result.continuation) {
        log(`↻ Continuation triggered — seamlessly re-requesting to continue where we left off`);
        // Don't clear streaming content — the new request will append to it
        // Recursively continue with the saved state
        return sendRequest(messages, result.continuation);
      }

      setStreamingContent("");
      setActiveStatuses([]);
      setIsStreaming(false);

      // Build the assistant message for API history
      const assistantApiMsg: Message = {
        role: "assistant",
        content: result.content || null,
      };
      if (result.toolCalls.length > 0) {
        assistantApiMsg.tool_calls = result.toolCalls;
      }
      const updatedMessages = [...messages, assistantApiMsg];

      // If tool_calls finish reason, execute them and loop
      if (result.finishReason === "tool_calls" && result.toolCalls.length > 0) {
        const uiMsg: UIMessage = {
          role: "assistant",
          content: result.content || "",
          toolCalls: result.toolCalls,
          statuses: result.statuses.length > 0 ? result.statuses : undefined,
          timestamp: new Date(),
        };
        setUiMessages((prev) => [...prev, uiMsg]);

        // Execute custom tools
        const toolResultMessages: Message[] = [];
        for (const tc of result.toolCalls) {
          log(`  → Executing custom tool: ${tc.function.name}(${tc.function.arguments})`);
          const args = JSON.parse(tc.function.arguments);
          const toolResult = executeCustomTool(tc.function.name, args);
          log(`  ← Tool result: ${toolResult.slice(0, 200)}`);
          toolResultMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: toolResult,
          });
        }

        const messagesWithToolResults = [...updatedMessages, ...toolResultMessages];
        setApiMessages(messagesWithToolResults);

        // Continue the loop
        return { messages: messagesWithToolResults, done: false };
      }

      // Normal stop — add to UI
      const uiMsg: UIMessage = {
        role: "assistant",
        content: result.content || "",
        statuses: result.statuses.length > 0 ? result.statuses : undefined,
        timestamp: new Date(),
      };
      setUiMessages((prev) => [...prev, uiMsg]);
      setApiMessages(updatedMessages);

      return { messages: updatedMessages, done: true };
    },
    [log]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      const userMsg: Message = { role: "user", content: content.trim() };
      const userUiMsg: UIMessage = { role: "user", content: content.trim(), timestamp: new Date() };

      setUiMessages((prev) => [...prev, userUiMsg]);
      setInput("");

      let currentMessages = [...apiMessages, userMsg];
      setApiMessages(currentMessages);

      // Tool calling loop
      let maxLoops = 5;
      while (maxLoops-- > 0) {
        const result = await sendRequest(currentMessages);
        if (result.done) break;
        currentMessages = result.messages;
      }
    },
    [apiMessages, isStreaming, sendRequest]
  );

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

  const clearChat = () => {
    setUiMessages([]);
    setApiMessages([]);
    setDebugLog([]);
    setStreamingContent("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a12] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">API Test Chat</h1>
            <p className="text-[10px] text-gray-500">
              stream: true &bull; multistep: true &bull; custom tool: get_current_time
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${showDebug ? "bg-indigo-950 text-indigo-300 border border-indigo-500/30" : "bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:text-white"}`}
          >
            Debug
          </button>
          <button
            onClick={clearChat}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-6 pb-48 space-y-5">
            {/* Empty state */}
            {uiMessages.length === 0 && !isStreaming && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto text-center pt-20"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-pink-600/20 flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
                  <Bot className="w-7 h-7 text-indigo-400" />
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">API Test Chat</h2>
                <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
                  Tests the <code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-indigo-300 text-xs font-mono">/api/chat/completions</code> endpoint with streaming, multistep, and a custom tool.
                </p>

                {/* Tool card */}
                <div className="max-w-sm mx-auto text-left p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-gray-300">Custom Tool: get_current_time</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-2">
                    Returns current date/time for any timezone. The LLM calls this tool, the frontend executes it, then sends results back.
                  </p>
                  <div className="text-[10px] text-gray-600 font-mono">
                    params: timezone (string), format ("12h" | "24h")
                  </div>
                </div>

                {/* Quick prompts */}
                <div className="flex flex-wrap gap-2 justify-center mt-6">
                  {[
                    "What time is it in Tokyo?",
                    "Search the web for latest AI news",
                    "What time is it in New York and London?",
                    "Generate an image of a sunset",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="px-3 py-1.5 rounded-full text-xs text-gray-400 bg-white/[0.04] border border-white/[0.06] hover:border-indigo-500/30 hover:text-white transition-all"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Messages */}
            {uiMessages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`max-w-2xl mx-auto ${msg.role === "user" ? "flex justify-end" : ""}`}
              >
                {msg.role === "assistant" ? (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0 text-gray-200">
                      {msg.content && <MarkdownRenderer content={msg.content} />}

                      {/* Status events */}
                      {msg.statuses && msg.statuses.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {msg.statuses
                            .filter((s) => s.type === "tool_start")
                            .map((s, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/20 text-[11px] text-emerald-300"
                              >
                                <Globe className="w-3 h-3" />
                                {s.name}
                                <CheckCircle2 className="w-3 h-3" />
                              </span>
                            ))}
                        </div>
                      )}

                      {/* Custom tool calls */}
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {msg.toolCalls.map((tc, i) => {
                            let argsPreview = "";
                            try {
                              const a = JSON.parse(tc.function.arguments);
                              argsPreview = Object.entries(a)
                                .map(([k, v]) => `${k}=${v}`)
                                .join(", ");
                            } catch {
                              argsPreview = tc.function.arguments;
                            }
                            return (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/20 text-[11px] text-indigo-300"
                              >
                                <Wrench className="w-3 h-3" />
                                {tc.function.name}({argsPreview})
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[85%] inline-block">
                    <div className="px-4 py-2.5 rounded-2xl rounded-br-md bg-indigo-950 border border-indigo-500/15 text-gray-200">
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}

            {/* Streaming indicator */}
            {isStreaming && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-2xl mx-auto"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 text-gray-200">
                    {streamingContent ? (
                      <MarkdownRenderer content={streamingContent} />
                    ) : (
                      <div className="flex items-center gap-2 py-2">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span className="text-xs text-gray-500">Connecting...</span>
                      </div>
                    )}

                    {/* Active status events */}
                    {activeStatuses.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {activeStatuses.map((s, i) => (
                          <span
                            key={i}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] ${
                              s.type === "tool_start"
                                ? "bg-amber-950/60 border border-amber-500/20 text-amber-300"
                                : "bg-emerald-950/60 border border-emerald-500/20 text-emerald-300"
                            }`}
                          >
                            {s.type === "tool_start" ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-[#0a0a12] via-[#0a0a12]/95 to-transparent pt-8 pb-4 px-4 sm:px-6" style={showDebug ? { right: "384px" } : {}}>
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
              <div className="relative bg-[#1a1a2e] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 focus-within:border-indigo-500/30 transition-all">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Try: What time is it in Tokyo?"
                  className="w-full bg-transparent px-4 pt-3.5 pb-12 text-sm text-white placeholder:text-gray-500 focus:outline-none resize-none min-h-[52px] max-h-[200px]"
                  rows={1}
                  disabled={isStreaming}
                />
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {uiMessages.length > 0 && (
                      <button
                        type="button"
                        onClick={clearChat}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
                        title="Clear"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isStreaming && (
                      <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Streaming
                      </span>
                    )}
                    <motion.button
                      type="submit"
                      disabled={!input.trim() || isStreaming}
                      className="w-8 h-8 rounded-lg bg-gray-900 hover:bg-white/15 flex items-center justify-center text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                      whileHover={!input.trim() || isStreaming ? {} : { scale: 1.05 }}
                      whileTap={!input.trim() || isStreaming ? {} : { scale: 0.95 }}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </div>
              <p className="text-center text-[10px] text-gray-600 mt-2">
                Testing /api/chat/completions with stream + multistep + custom tools
              </p>
            </form>
          </div>
        </div>

        {/* Debug Panel */}
        <AnimatePresence>
          {showDebug && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 384, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-white/[0.06] bg-black/40 overflow-hidden flex-shrink-0"
            >
              <div className="w-96 h-full flex flex-col">
                <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400">Debug Log</span>
                  <button
                    onClick={() => setDebugLog([])}
                    className="text-[10px] text-gray-600 hover:text-gray-300 transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 font-mono text-[10px] text-gray-500 space-y-0.5">
                  {debugLog.length === 0 && (
                    <p className="text-gray-700 italic">Send a message to see API logs here...</p>
                  )}
                  {debugLog.map((line, i) => (
                    <div
                      key={i}
                      className={`leading-relaxed ${
                        line.includes("✗") ? "text-red-400" : line.includes("→ POST") ? "text-indigo-400" : line.includes("← Stream") ? "text-emerald-400" : line.includes("⚙") ? "text-amber-400" : ""
                      }`}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
