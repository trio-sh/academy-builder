import type { VercelRequest, VercelResponse } from "@vercel/node";

const KILO_GATEWAY_URL = "https://api.kilo.ai/api/gateway/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const KILO_API_KEYS = (process.env.KILO_API_KEY || "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);
const OPENROUTER_API_KEYS = (process.env.OPENROUTER_API_KEY || "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

let _kiloIdx = 0;
let _orIdx = 0;
function nextKiloKey() {
  if (KILO_API_KEYS.length === 0) return "";
  const k = KILO_API_KEYS[_kiloIdx % KILO_API_KEYS.length];
  _kiloIdx = (_kiloIdx + 1) % KILO_API_KEYS.length;
  return k;
}
function nextOpenRouterKey() {
  if (OPENROUTER_API_KEYS.length === 0) return "";
  const k = OPENROUTER_API_KEYS[_orIdx % OPENROUTER_API_KEYS.length];
  _orIdx = (_orIdx + 1) % OPENROUTER_API_KEYS.length;
  return k;
}

const OPENROUTER_MODELS = new Set([
  "minimax/minimax-m2.5:free",
  "qwen/qwen3-coder:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free",
  "moonshotai/kimi-k2.6:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "cohere/north-mini-code:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "tencent/hy3:free",
  // New OpenRouter free models (confirmed 2026-08-03)
  "inclusionai/ling-3.0-flash:free",
  "poolside/laguna-s-2.1:free",
  "poolside/laguna-xs-2.1:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  // Refreshed 2026-08-10
  "inclusionai/ling-3.0-tiny:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  // Refreshed 2026-08-17
  "nvidia/nemotron-3.5-lightning:free",
  "dots-studio/dots-3-note-preview:free",
  "z-ai/glm-5.2:free",
]);

const DEFAULT_MODEL = "kilo-auto/free";
const FALLBACK_MODELS = [
  // Top 5 Kilo free models (ranked by context_length desc, then max_completion_tokens desc) — refreshed 2026-08-17
  "nvidia/nemotron-3.5-lightning:free",             // ctx=1000000, max_tok=65536 — NEW
  "nvidia/nemotron-3-ultra-550b-a55b:free",         // ctx=1000000, max_tok=65536
  "dots-studio/dots-3-note-preview:free",           // ctx=512000,  max_tok=512000 — NEW
  "nvidia/nemotron-3-super-120b-a12b:free",         // ctx=262144,  max_tok=262144
  "poolside/laguna-s-2.1:free",                     // ctx=262144,  max_tok=32768
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", // ctx=256000, max_tok=65536, multimodal
  // OpenRouter free models
  "tencent/hy3:free",
  "moonshotai/kimi-k2.6:free",
  "minimax/minimax-m2.5:free",
  "qwen/qwen3-coder:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",            // ctx=256000, tools (OpenRouter)
  "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "cohere/north-mini-code:free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  // OpenRouter free models added 2026-08-03
  "poolside/laguna-s-2.1:free",
  "poolside/laguna-xs-2.1:free",
  // OpenRouter free models added 2026-08-10
  "inclusionai/ling-3.0-tiny:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",            // ctx=128000, max_tok=128000, multimodal
  // OpenRouter free models added 2026-08-17
  "z-ai/glm-5.2:free",                              // ctx=128000, coding/agentic (Zhipu AI)
];

const VISION_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";
const VISION_FALLBACKS = [
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "stepfun/step-3.7-flash:free",
  "kilo-auto/free",
];

const isFreeModel = (m: string) => m.endsWith(":free") || m === "kilo-auto/free";

function hasImageContent(messages: any[]): boolean {
  if (!Array.isArray(messages)) return false;
  for (const msg of messages) {
    const content = msg?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part?.type === "image_url" || part?.type === "image") return true;
    }
  }
  return false;
}

async function proxyFetch(model: string, bodyStr: string): Promise<Response> {
  const isOR = OPENROUTER_MODELS.has(model);
  const url = isOR ? OPENROUTER_URL : KILO_GATEWAY_URL;
  const keys = isOR ? OPENROUTER_API_KEYS : KILO_API_KEYS;
  const nextKey = isOR ? nextOpenRouterKey : nextKiloKey;
  const keyCount = Math.max(1, keys.length);
  let lastRes: Response | null = null;

  for (let i = 0; i < keyCount; i++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${nextKey()}` },
      body: bodyStr,
    });
    if (res.status !== 429) return res;
    lastRes = res;
  }
  return lastRes!;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body || {};
  const requestedModel = body.model || DEFAULT_MODEL;
  const model = isFreeModel(requestedModel) ? requestedModel : DEFAULT_MODEL;
  const isStream = body.stream ?? false;

  // Route image requests only to vision-capable models
  const hasImages = hasImageContent(body.messages);
  const modelsToTry = hasImages
    ? VISION_FALLBACKS
    : [model, ...FALLBACK_MODELS.filter((m) => m !== model)];

  for (const m of modelsToTry) {
    const payload = JSON.stringify({ ...body, model: m });
    const upstream = await proxyFetch(m, payload);

    if (upstream.ok) {
      if (isStream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");

        const reader = upstream.body!.getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) { res.end(); return; }
            res.write(value);
          }
        };
        return pump();
      }

      const data = await upstream.json();
      return res.status(200).json(data);
    }

    // Last model — return the error
    if (m === modelsToTry[modelsToTry.length - 1]) {
      const errText = await upstream.text().catch(() => "Unknown error");
      return res.status(upstream.status).json({
        error: { message: `All models failed. Last (${m}): ${errText.slice(0, 300)}`, type: "api_error" },
      });
    }
  }

  return res.status(500).json({ error: { message: "No models available", type: "api_error" } });
}
