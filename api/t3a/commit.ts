import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { handleCommitRequest } from "../../src/server/t3aCommitRoute";

/** POST /api/t3a/commit  { stage_instance_id, observation_record_id, key }  with Authorization: Bearer <observer token>. See src/server/t3aCommitRoute.ts. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: "service_unavailable" });
  const svc = createClient(url, key, { auth: { persistSession: false } });
  const out = await handleCommitRequest(
    { method: req.method ?? "", authorization: req.headers.authorization, body: req.body },
    {
      verifyToken: async (t) => (await svc.auth.getUser(t)).data.user?.id ?? null,
      rpc: async (name, args) => { const r = await svc.rpc(name, args); return { data: r.data, error: r.error }; },
    },
  );
  return res.status(out.status).json(out.body);
}
