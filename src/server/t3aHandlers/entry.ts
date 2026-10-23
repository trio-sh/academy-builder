import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { randomInt } from "node:crypto";
import { handleEntryRequest } from "../t3aEntryRoute.js";

/** POST /api/t3a/entry  { dimension, stage, key }  with Authorization: Bearer <participant token>. See src/server/t3aEntryRoute.ts. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: "service_unavailable" });
  const svc = createClient(url, key, { auth: { persistSession: false } });
  const out = await handleEntryRequest(
    { method: req.method ?? "", authorization: req.headers.authorization, body: req.body },
    {
      verifyToken: async (t) => (await svc.auth.getUser(t)).data.user?.id ?? null,
      rpc: async (name, args) => { const r = await svc.rpc(name, args); return { data: r.data, error: r.error }; },
      newSeed: () => randomInt(1, 2 ** 31),
    },
  );
  return res.status(out.status).json(out.body);
}
