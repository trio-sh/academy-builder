import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * GET /v1/models/:id — Individual model lookup for Claude Agent SDK.
 * The SDK calls this to validate a specific model ID exists before using it.
 * Returns model info for any requested model ID so all models pass validation.
 * This endpoint is public (no auth) — it's a static list with no sensitive data.
 */

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, anthropic-version, anthropic-beta, anthropic-dangerous-direct-browser-access");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") return res.status(204).end();

  // Extract model ID from the URL path
  const { id } = req.query;
  const modelId = Array.isArray(id) ? id.join("/") : id || "unknown";

  // Return model info — accept any model ID so the SDK never fails validation
  return res.status(200).json({
    type: "model",
    id: modelId,
    display_name: modelId,
    created_at: "2025-01-01T00:00:00Z",
  });
}
