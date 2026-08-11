/**
 * Ask the /api/session-title Vercel route for a short title for a
 * Praxis chat session. Runs once per session, after the first
 * user↔assistant exchange completes, so the sidebar shows something
 * more descriptive than the first 60 characters of the user's turn.
 *
 * The endpoint itself calls the A0 LLM behind the scenes and returns
 * a fallback title on any failure, so this client wrapper is a thin
 * fetch. Callers can trust the shape: on any error we still hand back
 * the local fallback derived from the first user message.
 */

interface TranscriptTurn {
  role: "user" | "assistant";
  content: string;
}

interface TitleResponse {
  title?: string;
}

function localFallback(turns: TranscriptTurn[]): string {
  const firstUser = turns.find((t) => t.role === "user");
  return firstUser?.content?.trim().slice(0, 60) || "New chat";
}

export async function generateSessionTitle(
  turns: TranscriptTurn[]
): Promise<string> {
  try {
    const res = await fetch("/api/session-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turns }),
    });
    if (!res.ok) return localFallback(turns);
    const json = (await res.json()) as TitleResponse;
    const title = (json.title ?? "").trim();
    return title || localFallback(turns);
  } catch {
    return localFallback(turns);
  }
}
