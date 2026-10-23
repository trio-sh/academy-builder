/**
 * CORR-007 CR-21 caller. The actor is the account on the verified token, never a field in the request. The database decides whether that account
 * may commit this record; a refusal, a missing session and a failure all reach the browser as the same fixed answer. A repeat of the same key
 * gets the same answer, a new key after the commit is the refusal "already committed" (which the session's own mentor may be told).
 */
import type { EntryDeps } from "./t3aEntryRoute.js";
export type CommitDeps = Pick<EntryDeps, "verifyToken" | "rpc">;
export interface CommitResponse { status: number; body: Record<string, unknown> }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9._:-]{8,128}$/;
const NOT_AVAILABLE: CommitResponse = { status: 200, body: { outcome: "refused", reason: "SESSION_NOT_AVAILABLE" } };

export async function handleCommitRequest(req: { method: string; authorization?: string | null; body: unknown }, deps: CommitDeps): Promise<CommitResponse> {
  if (req.method !== "POST") return { status: 405, body: { error: "method_not_allowed" } };
  const m = /^Bearer (.+)$/.exec(req.authorization ?? "");
  const actor = m ? await deps.verifyToken(m[1]).catch(() => null) : null;
  if (!actor) return { status: 401, body: { error: "sign_in_required" } };
  const b = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  if (typeof b.stage_instance_id !== "string" || !UUID.test(b.stage_instance_id) || typeof b.observation_record_id !== "string" || !UUID.test(b.observation_record_id) || typeof b.key !== "string" || !KEY.test(b.key)) {
    return { status: 400, body: { error: "stage_instance_record_and_key_required" } };
  }
  const { data, error } = await deps.rpc("t3a_cr21_commit_for", { p_actor: actor, p_stage_instance: b.stage_instance_id, p_key: b.key, p_observation_record: b.observation_record_id });
  if (error || !data || typeof data !== "object") return NOT_AVAILABLE;
  const r = data as Record<string, unknown>;
  if (r.outcome === "committed" || r.outcome === "already_committed") return { status: 200, body: { outcome: r.outcome, observation_record_id: r.observation_record_id } };
  if (r.outcome === "refused" && r.reason === "SESSION_ALREADY_COMMITTED") return { status: 200, body: { outcome: "refused", reason: "SESSION_ALREADY_COMMITTED", observation_record_id: r.observation_record_id } };
  return NOT_AVAILABLE;
}
