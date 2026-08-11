import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * POST /api/session-title
 *
 * Small Vercel route that asks the A0 LLM for a 3-6 word title for a
 * Praxis chat session. This is a one-shot RPC — no streaming, no
 * tools, low temperature — used by the client to auto-name sessions
 * after the first user↔assistant exchange completes.
 *
 * Request body:
 *   { turns: [{ role: "user" | "assistant", content: string }, …] }
 *
 * Response body:
 *   { title: string }
 *
 * On any failure the endpoint still returns 200 with a fallback title
 * derived from the first user message so the caller can trust the
 * shape and never has to handle an error path just for a session
 * label.
 */

const A0_LLM_URL = "https://api.a0.dev/ai/llm";

const SYSTEM_PROMPT =
  "You name chat sessions. Given the opening turns of a conversation, " +
  "produce a title of 3–6 words that captures the actual topic. " +
  "No quotation marks, no trailing punctuation, no phrases like " +
  '"Chat about" or "Conversation on". Return ONLY the title text.';

interface Turn {
  role: "user" | "assistant";
  content: string;
}

interface A0Response {
  completion?: string;
}

function fallbackTitle(turns: Turn[]): string {
  const firstUser = turns.find((t) => t.role === "user");
  return (firstUser?.content ?? "").trim().slice(0, 60) || "New chat";
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/^["'`\s]+|["'`\s]+$/g, "")
    .replace(/^title[:\-—]\s*/i, "")
    .split("\n")[0]
    .trim()
    .slice(0, 60);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const turns: Turn[] = Array.isArray(req.body?.turns) ? req.body.turns : [];
  if (turns.length === 0) {
    return res.status(200).json({ title: "New chat" });
  }

  const transcript = turns
    .slice(0, 6)
    .map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${(t.content ?? "").slice(0, 800)}`)
    .join("\n\n");

  try {
    const upstream = await fetch(A0_LLM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Conversation:\n\n${transcript}\n\nTitle:` },
        ],
        temperature: 0.2,
        max_tokens: 24,
      }),
    });

    if (!upstream.ok) {
      return res.status(200).json({ title: fallbackTitle(turns) });
    }
    const data = (await upstream.json()) as A0Response;
    const title = cleanTitle(data.completion ?? "");
    return res.status(200).json({ title: title || fallbackTitle(turns) });
  } catch {
    return res.status(200).json({ title: fallbackTitle(turns) });
  }
}
