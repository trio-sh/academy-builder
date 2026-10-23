/**
 * CORR-007 CR-22 and CR-21 staff callers. The actor is the account on the verified token, never a field in the request; the database decides
 * whether that account may act (the session's facilitator or staff for an interruption, staff for a suspension). A refusal, a missing target and
 * a failure all reach the browser as the same fixed answer, and only a short list of result fields is passed on.
 */
import type { EntryDeps } from "./t3aEntryRoute";
export type StaffDeps = Pick<EntryDeps, "verifyToken" | "rpc">;
export interface StaffResponse { status: number; body: Record<string, unknown> }
interface Req { method: string; authorization?: string | null; body: unknown }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KINDS = new Set(["observed_withdraws", "observed_welfare", "role_player_withdraws", "role_player_disconnects", "role_player_substituted", "technical_disconnection", "welfare_termination"]);
const NOT_AVAILABLE: StaffResponse = { status: 200, body: { outcome: "refused", reason: "NOT_AVAILABLE" } };
const INTERRUPT_FIELDS = ["outcome", "interruption_id", "attempt_ending", "attempt_counted", "excludes_determinations", "new_group_required", "new_source_required", "substitution_permitted", "finding_recorded"];
const SUSPEND_FIELDS = ["outcome", "review_id", "served_instances", "observations", "reports", "cancelled_automatically"];

async function actorAndBody(req: Req, deps: StaffDeps): Promise<{ fail: StaffResponse } | { actor: string; b: Record<string, unknown> }> {
  if (req.method !== "POST") return { fail: { status: 405, body: { error: "method_not_allowed" } } };
  const m = /^Bearer (.+)$/.exec(req.authorization ?? "");
  const actor = m ? await deps.verifyToken(m[1]).catch(() => null) : null;
  if (!actor) return { fail: { status: 401, body: { error: "sign_in_required" } } };
  return { actor, b: (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown> };
}
function pick(data: unknown, fields: string[], ok: string): StaffResponse {
  if (!data || typeof data !== "object" || (data as Record<string, unknown>).outcome !== ok) return NOT_AVAILABLE;
  const r = data as Record<string, unknown>;
  return { status: 200, body: Object.fromEntries(fields.filter((f) => f in r).map((f) => [f, r[f]])) };
}

export async function handleInterruptRequest(req: Req, deps: StaffDeps): Promise<StaffResponse> {
  const a = await actorAndBody(req, deps); if ("fail" in a) return a.fail;
  const { actor, b } = a;
  const affected = b.affected_participant_id;
  if (typeof b.group_session_id !== "string" || !UUID.test(b.group_session_id) || typeof b.kind !== "string" || !KINDS.has(b.kind)
    || (affected !== undefined && affected !== null && (typeof affected !== "string" || !UUID.test(affected)))
    || (b.first_decision_reached !== undefined && typeof b.first_decision_reached !== "boolean") || (b.content_revealed !== undefined && typeof b.content_revealed !== "boolean")) {
    return { status: 400, body: { error: "group_session_and_kind_required" } };
  }
  const { data, error } = await deps.rpc("t3a_cr22_interrupt_for", { p_actor: actor, p_group_session: b.group_session_id, p_kind: b.kind, p_affected: affected ?? null, p_first_decision_reached: b.first_decision_reached ?? false, p_content_revealed: b.content_revealed ?? false });
  return error ? NOT_AVAILABLE : pick(data, INTERRUPT_FIELDS, "recorded");
}

export async function handleSuspendRequest(req: Req, deps: StaffDeps): Promise<StaffResponse> {
  const a = await actorAndBody(req, deps); if ("fail" in a) return a.fail;
  const { actor, b } = a;
  if (typeof b.source_version_id !== "string" || !UUID.test(b.source_version_id) || typeof b.reason !== "string" || b.reason.trim().length < 5 || b.reason.length > 2000) {
    return { status: 400, body: { error: "source_and_reason_required" } };
  }
  const { data, error } = await deps.rpc("t3a_cr21_suspend_source_for", { p_actor: actor, p_source_version: b.source_version_id, p_reason: b.reason });
  return error ? NOT_AVAILABLE : pick(data, SUSPEND_FIELDS, "suspended");
}
