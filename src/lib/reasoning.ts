/**
 * Parse assistant content that may contain <thinking>…</thinking> blocks.
 *
 * Tolerates common malformations the model produces during streaming:
 *  - unclosed tag while still streaming ("<thinking>lorem ipsum…")
 *  - stray whitespace / casing ("< Thinking >", "</ THINKING >")
 *  - multiple blocks (rare — we concatenate them in reasoning)
 *  - fragment before the first opening tag (kept in cleaned)
 */
export interface Reasoning {
  reasoning: string;
  cleaned: string;
  closed: boolean;
  hasReasoning: boolean;
}

const OPEN = /<\s*thinking\s*>/i;
const CLOSE = /<\s*\/\s*thinking\s*>/i;

export function parseReasoning(input: string): Reasoning {
  if (!input) {
    return { reasoning: "", cleaned: "", closed: true, hasReasoning: false };
  }
  let rest = input;
  let closed = true;
  let hasReasoning = false;
  const chunks: string[] = [];
  const parts: string[] = [];

  while (rest.length > 0) {
    const openMatch = rest.match(OPEN);
    if (!openMatch || openMatch.index === undefined) {
      chunks.push(rest);
      break;
    }
    chunks.push(rest.slice(0, openMatch.index));
    rest = rest.slice(openMatch.index + openMatch[0].length);
    hasReasoning = true;
    const closeMatch = rest.match(CLOSE);
    if (closeMatch && closeMatch.index !== undefined) {
      parts.push(rest.slice(0, closeMatch.index).trim());
      rest = rest.slice(closeMatch.index + closeMatch[0].length);
      closed = true;
    } else {
      // Unclosed block — everything remaining is reasoning-in-progress.
      parts.push(rest.trim());
      rest = "";
      closed = false;
    }
  }

  return {
    reasoning: parts.filter(Boolean).join("\n\n"),
    cleaned: chunks.join("").replace(/^\s+/, ""),
    closed,
    hasReasoning,
  };
}
