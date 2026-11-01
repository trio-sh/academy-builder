import { describe, expect, it } from "vitest";
import { requestMentor, type RequestDb } from "@/lib/mentorRequest";
import { companyProfileFields } from "@/lib/employerProfile";
import { saveS2Feedback, type FeedbackDb } from "@/lib/observationFeedback";

/** A recording stand-in for the supabase client: each insert is kept, and `refuse` names the tables whose insert returns an error. */
function fake(refuse: string[] = []) {
  const calls: Array<{ table: string; row: unknown }> = [];
  const db: RequestDb & FeedbackDb = {
    from(table: string) {
      return { insert: (row: unknown) => { calls.push({ table, row }); return Promise.resolve({ error: refuse.includes(table) ? { message: `${table} refused` } : null }); } };
    },
  };
  return { db, calls };
}

describe("requestMentor", () => {
  const i = { mentorId: "MP", candidateProfileId: "CP", mentorUserId: "M-user", compatibilityLevel: "high" };
  it("writes a pending request and then tells the mentor", async () => {
    const { db, calls } = fake();
    const r = await requestMentor(db, i);
    expect(r).toEqual({ ok: true, notified: true });
    expect(calls.map((c) => c.table)).toEqual(["mentor_assignments", "notifications"]);
    expect(calls[0].row).toEqual({ mentor_id: "MP", candidate_id: "CP", status: "pending" });
    expect((calls[1].row as { user_id: string }).user_id).toBe("M-user");
  });
  it("does not notify the mentor of a request the database refused, and returns the refusal", async () => {
    const { db, calls } = fake(["mentor_assignments"]);
    const r = await requestMentor(db, i);
    expect(r).toEqual({ ok: false, notified: false, message: "mentor_assignments refused" });
    expect(calls.map((c) => c.table)).toEqual(["mentor_assignments"]);
  });
  it("keeps the request when only the notification is refused", async () => {
    const { db } = fake(["notifications"]);
    expect(await requestMentor(db, i)).toEqual({ ok: true, notified: false });
  });
});

describe("companyProfileFields", () => {
  it("writes what the employer typed and never sets is_verified", () => {
    const f = companyProfileFields({ company_name: "A", industry: "B", company_size: "C", company_website: "D" });
    expect(f).toEqual({ company_name: "A", industry: "B", company_size: "C", company_website: "D" });
    expect("is_verified" in f).toBe(false);
  });
});

describe("saveS2Feedback", () => {
  const i = { assignmentId: "A1", mentorUserId: "M-user", candidateUserId: "C-user", marks: { integrity_ethics: 3, learning_agility: 4 }, notes: "n" };
  it("writes one approved second-stage row per dimension with the mentor's and the candidate's profile ids", async () => {
    const { db, calls } = fake();
    expect(await saveS2Feedback(db, i)).toEqual({ ok: true });
    const rows = calls[0].row as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ assignment_id: "A1", mentor_id: "M-user", candidate_id: "C-user", dimension_id: "integrity_ethics", feedback_level: 2, status: "approved", mentor_approved: true });
  });
  it("returns the database's refusal instead of reporting a save", async () => {
    const { db } = fake(["observation_feedback"]);
    expect(await saveS2Feedback(db, i)).toEqual({ ok: false, message: "observation_feedback refused" });
  });
  it("writes nothing when nothing was scored", async () => {
    const { db, calls } = fake();
    expect(await saveS2Feedback(db, { ...i, marks: {} })).toEqual({ ok: true });
    expect(calls).toHaveLength(0);
  });
});
