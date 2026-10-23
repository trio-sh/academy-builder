/**
 * CORR-007 CR-29 commit service. The commit seal is a signature made with a private key that only this service holds: it is read from the environment of the
 * service, passed in as `sign`, and is never sent to the database, logged or returned. The database checks every signature against the public key before it
 * stores one, so a wrong key or a damaged payload stores nothing.
 *
 * `signPending` signs what the database says is waiting. `handleSealRequest` lets the scheduled job (a shared secret) or a staff member (their sign-in token,
 * checked by the database) ask for that to run; it answers with counts only.
 */
import { createPrivateKey, sign as edSign, type KeyObject } from "node:crypto";

export interface SealDeps {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  /** Signs the UTF-8 payload and returns the 128 hex characters of the Ed25519 signature. */
  sign: (payload: string) => Promise<string>;
}
export interface SealRunResult { signed: number; refused: number; failed: number; key_version: string | null }

/** An Ed25519 private key from its 32 byte seed in base64 (the form held in the service environment). */
export function signerFromSeed(seedBase64: string): SealDeps["sign"] {
  const seed = Buffer.from(seedBase64, "base64");
  if (seed.length !== 32) throw new Error("the signing seed must be 32 bytes");
  const key: KeyObject = createPrivateKey({ key: Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), seed]), format: "der", type: "pkcs8" });
  return async (payload) => edSign(null, Buffer.from(payload, "utf8"), key).toString("hex");
}

export async function signPending(deps: SealDeps): Promise<SealRunResult> {
  const out: SealRunResult = { signed: 0, refused: 0, failed: 0, key_version: null };
  const { data, error } = await deps.rpc("t3a_commit_seal_pending", {});
  const p = data as { outcome?: string; key_version?: string; items?: { composed_statement_id: string; payload: string }[] } | null;
  if (error || !p || p.outcome !== "pending" || !Array.isArray(p.items)) return out;
  out.key_version = p.key_version ?? null;
  for (const it of p.items) {
    try {
      const signature = await deps.sign(it.payload);
      const r = await deps.rpc("t3a_commit_seal_store", { p_composed: it.composed_statement_id, p_signature: signature, p_key_version: p.key_version });
      const o = (r.data as { outcome?: string } | null)?.outcome;
      if (!r.error && o === "sealed") out.signed++; else out.refused++;
    } catch { out.failed++; }
  }
  return out;
}

export interface SealRequest { method: string; authorization?: string | null }
export interface SealResponse { status: number; body: Record<string, unknown> }
export interface SealRouteDeps extends SealDeps {
  /** the shared secret of the scheduled job, when one is set */
  cronSecret?: string | null;
  verifyToken: (token: string) => Promise<string | null>;
}

export async function handleSealRequest(req: SealRequest, deps: SealRouteDeps): Promise<SealResponse> {
  if (req.method !== "POST" && req.method !== "GET") return { status: 405, body: { error: "method_not_allowed" } };
  const m = /^Bearer (.+)$/.exec(req.authorization ?? "");
  const token = m ? m[1] : null;
  if (!token) return { status: 401, body: { error: "sign_in_required" } };
  let allowed = !!deps.cronSecret && token === deps.cronSecret;
  if (!allowed) {
    const actor = await deps.verifyToken(token).catch(() => null);
    if (actor) {
      const r = await deps.rpc("t3a_actor_is_staff", { p_actor: actor, p_roles: ["reviewer", "coordinator", "admin"] });
      allowed = !r.error && r.data === true;
    }
  }
  if (!allowed) return { status: 401, body: { error: "not_allowed" } };
  const r = await signPending(deps);
  return { status: 200, body: { signed: r.signed, refused: r.refused, failed: r.failed } };
}
