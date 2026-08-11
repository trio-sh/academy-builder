/**
 * Compact prior conversation history for a fresh turn.
 *
 * The full session transcript matters for continuity, but shipping
 * every raw tool_call + tool_result pair back to the model on every
 * turn blows out the context window as sessions grow. This helper
 * folds the earlier turns into text-only stand-ins:
 *
 *   - system / user messages pass through untouched.
 *   - assistant messages carrying tool_calls become plain text with
 *     an inline "[tools: name(arg=…)]" marker so the model still sees
 *     what actions it took, without the callable payload.
 *   - tool result messages are truncated and re-cast as short
 *     "[tool result: …]" assistant asides so the outcome survives
 *     without the multi-KB dump.
 *
 * The current in-flight tool loop is NOT run through this — the
 * matched tool_call ↔ tool_result pairs must stay strictly valid for
 * the API. Only the prior transcript, before the newest user message
 * is appended, is condensed.
 */

export interface ApiToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ApiHistoryMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ApiToolCall[];
  tool_call_id?: string;
  name?: string;
}

const DEFAULT_TRUNCATE = 600;

function summarizeCall(tc: ApiToolCall): string {
  try {
    const args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
    const parts = Object.entries(args)
      .slice(0, 4)
      .map(([k, v]) => {
        const s = typeof v === "string" ? v : JSON.stringify(v);
        return `${k}=${JSON.stringify(s.slice(0, 60))}`;
      });
    return `${tc.function.name}(${parts.join(", ")})`;
  } catch {
    return `${tc.function.name}(…)`;
  }
}

function truncate(s: string, n: number): string {
  const t = s.trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n)}…(truncated ${t.length - n} chars)`;
}

export function condenseHistory<T extends ApiHistoryMessage>(
  messages: T[],
  truncateAt = DEFAULT_TRUNCATE
): ApiHistoryMessage[] {
  const out: ApiHistoryMessage[] = [];
  for (const m of messages) {
    if (m.role === "system" || m.role === "user") {
      out.push({ role: m.role, content: m.content ?? "" });
      continue;
    }
    if (m.role === "assistant") {
      const parts: string[] = [];
      if (m.content && m.content.trim()) parts.push(m.content.trim());
      if (m.tool_calls && m.tool_calls.length) {
        parts.push(`[tools: ${m.tool_calls.map(summarizeCall).join("; ")}]`);
      }
      out.push({ role: "assistant", content: parts.join("\n\n") || " " });
      continue;
    }
    if (m.role === "tool") {
      const raw = m.content ?? "";
      out.push({
        role: "assistant",
        content: `[tool result${m.name ? ` — ${m.name}` : ""}: ${truncate(raw, truncateAt)}]`,
      });
      continue;
    }
  }
  return out;
}
