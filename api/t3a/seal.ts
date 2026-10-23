import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { handleSealRequest, signerFromSeed } from "../../src/server/t3aSealRoute.js";

/**
 * POST /api/t3a/seal  with Authorization: Bearer <scheduled job secret or staff sign-in token>.
 * Signs the commit seals that are waiting, with the private key in T3A_SEAL_SIGNING_KEY (the 32 byte seed, base64). That key is held here and nowhere else. See src/server/t3aSealRoute.ts.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const seed = process.env.T3A_SEAL_SIGNING_KEY;
  if (!url || !key || !seed) return res.status(503).json({ error: "service_unavailable" });
  let sign;
  try { sign = signerFromSeed(seed); } catch { return res.status(503).json({ error: "service_unavailable" }); }
  const svc = createClient(url, key, { auth: { persistSession: false } });
  const out = await handleSealRequest(
    { method: req.method ?? "", authorization: req.headers.authorization },
    {
      cronSecret: process.env.CRON_SECRET ?? null,
      sign,
      verifyToken: async (t) => (await svc.auth.getUser(t)).data.user?.id ?? null,
      rpc: async (name, args) => { const r = await svc.rpc(name, args); return { data: r.data, error: r.error }; },
    },
  );
  return res.status(out.status).json(out.body);
}
