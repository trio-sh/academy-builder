/**
 * A candidate's request for a mentor at the end of Get Started: a pending mentor_assignments row, then a notification to the mentor.
 * The page used to insert the row without looking at the result and told the mentor and the candidate that a request was waiting even when the database had
 * refused it (the table's status check refused 'pending' until CR-344). The row is checked first, the mentor is notified only when it exists, and a refusal is
 * returned for the page to show.
 */
export interface RequestDb {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
}

export interface RequestMentorInput {
  /** mentor_profiles.id */
  mentorId: string;
  /** candidate_profiles.id of the person asking */
  candidateProfileId: string;
  /** profiles.id of the mentor, who is notified */
  mentorUserId: string;
  compatibilityLevel: string;
}

export interface RequestMentorResult {
  /** the request row was written */
  ok: boolean;
  /** the mentor's notification was written (a request can stand without it) */
  notified: boolean;
  /** the database's own message when ok is false */
  message?: string;
}

export async function requestMentor(db: RequestDb, i: RequestMentorInput): Promise<RequestMentorResult> {
  const { error } = await db.from("mentor_assignments").insert({ mentor_id: i.mentorId, candidate_id: i.candidateProfileId, status: "pending" });
  if (error) return { ok: false, notified: false, message: error.message };
  const { error: noteError } = await db.from("notifications").insert({
    user_id: i.mentorUserId,
    type: "mentee_request",
    title: "New Mentee Request",
    message: `A new candidate has been matched with you (${i.compatibilityLevel} compatibility). Review and accept in your dashboard.`,
  });
  return { ok: true, notified: !noteError };
}
