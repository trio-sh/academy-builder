/**
 * CORR-007 CR-26 caller. The participant is the account on the verified sign-in token, never a field in the request;
 * the service route is the only thing that creates an entry, and every refusal reaches the browser as the same fixed answer.
 */
export interface EntryDeps {
  verifyToken: (token: string) => Promise<string | null>;
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  newSeed: () => number;
}
export interface EntryRequest { method: string; authorization?: string | null; body: unknown }
export interface EntryResponse { status: number; body: Record<string, unknown> }

const STAGES = new Set(["S1", "S2", "S3", "S4"]);
const DIMENSION = /^D([1-9]|1[0-4])$/;
const KEY = /^[A-Za-z0-9._:-]{8,128}$/;
const NOT_ELIGIBLE: EntryResponse = { status: 200, body: { outcome: "not_eligible" } };

export async function handleEntryRequest(req: EntryRequest, deps: EntryDeps): Promise<EntryResponse> {
  if (req.method !== "POST") return { status: 405, body: { error: "method_not_allowed" } };
  const m = /^Bearer (.+)$/.exec(req.authorization ?? "");
  const participant = m ? await deps.verifyToken(m[1]).catch(() => null) : null;
  if (!participant) return { status: 401, body: { error: "sign_in_required" } };
  const b = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  if (typeof b.dimension !== "string" || !DIMENSION.test(b.dimension) || typeof b.stage !== "string" || !STAGES.has(b.stage) || typeof b.key !== "string" || !KEY.test(b.key)) {
    return { status: 400, body: { error: "dimension_stage_and_key_required" } };
  }
  const { data, error } = await deps.rpc("t3a_cr26_request_entry", { p_participant: participant, p_dimension: b.dimension, p_stage: b.stage, p_key: b.key, p_seed: deps.newSeed() });
  if (error || !data || typeof data !== "object") return NOT_ELIGIBLE;
  const r = data as Record<string, unknown>;
  if (r.outcome !== "eligible") return NOT_ELIGIBLE;
  return { status: 200, body: { outcome: "eligible", stage_entry_event_id: r.stage_entry_event_id, reservation_id: r.reservation_id } };
}
