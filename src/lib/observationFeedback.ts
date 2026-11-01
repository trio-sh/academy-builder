/**
 * The S2 feedback rows a mentor's observation writes (table observation_feedback). Its mentor_id and candidate_id point at profiles.id, but the page sent the
 * desk ids (mentor_profiles.id and candidate_profiles.id), so the foreign keys refused every row and, because the result was never looked at, the observation
 * looked saved without its feedback (the same fault CR-338 fixed for assigned dimensions). The profile ids are sent and the result is returned.
 */
export interface FeedbackDb {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
}

export interface SaveS2FeedbackInput {
  assignmentId: string;
  /** profiles.id of the mentor (the signed-in user) */
  mentorUserId: string;
  /** profiles.id of the candidate (candidate_profiles.profile_id, not candidate_profiles.id) */
  candidateUserId: string;
  /** the mark given for each dimension */
  marks: Record<string, number>;
  notes?: string | null;
}

export interface SaveS2FeedbackResult {
  ok: boolean;
  /** the database's own message when ok is false */
  message?: string;
}

export async function saveS2Feedback(db: FeedbackDb, i: SaveS2FeedbackInput): Promise<SaveS2FeedbackResult> {
  const now = new Date().toISOString();
  const rows = Object.keys(i.marks).map((dimension_id) => ({
    assignment_id: i.assignmentId,
    candidate_id: i.candidateUserId,
    mentor_id: i.mentorUserId,
    dimension_id,
    feedback_level: 2,
    bars_score: i.marks[dimension_id],
    mentor_feedback: i.notes || null,
    status: "approved",
    mentor_approved: true,
    mentor_approved_at: now,
  }));
  if (rows.length === 0) return { ok: true };
  const { error } = await db.from("observation_feedback").insert(rows);
  return error ? { ok: false, message: error.message } : { ok: true };
}
