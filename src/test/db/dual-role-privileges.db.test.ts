/**
 * CR-340. One account holding two roles keeps each role's privileges and gains nothing from the pair. Four pairs: mentor + participant, mentor + employer, participant + employer,
 * oversight administrator + mentor. Every probe is run as the signed-in account against the real policies and routes. Synthetic people; throwaway database only.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import { asRole, connect, mkParticipant, run } from "./helpers";

let c: pg.Client; let seq = 0;
const exec = (sql: string) => c.query(sql);
type Role = "participant" | "mentor" | "employer_user" | "oversight_administrator";

interface Acct { id: string; mp?: string; cp?: string; ep?: string }
/** One account holding the given roles: the profile (its one profile role is the first listed), the desk rows each role needs, and an administrator-granted role assignment for each. */
async function acct(roles: Role[]): Promise<Acct> {
  const profileRole = roles[0] === "mentor" ? "mentor" : roles[0] === "employer_user" ? "employer" : roles[0] === "oversight_administrator" ? "candidate" : "candidate";
  const id = await mkParticipant(c, `dr-${++seq}`, profileRole);
  const a: Acct = { id };
  const has = async (code: string) => ((await run(c, `select count(*)::int n from t3a_role_assignment where account_id='${id}' and role_code='${code}'`))[0].n as number) > 0;
  const grant = async (code: Role) => {
    if (await has(code)) return;
    await exec(`insert into t3a_role_assignment(account_id, role_code, role_grant_basis, role_granted_by, role_rules_version, participant_pseudonym_ref) values ('${id}','${code}','administrator_grant','${id}','1.0', ${code === "participant" ? `'${randomUUID()}'` : "null"})`);
  };
  for (const r of roles) {
    await grant(r);
    if (r === "mentor") a.mp = (await run(c, `insert into mentor_profiles(profile_id) values ('${id}') returning id`))[0].id;
    if (r === "participant") a.cp = (await run(c, `insert into candidate_profiles(profile_id) values ('${id}') returning id`))[0].id;
    if (r === "employer_user") {
      a.ep = (await run(c, `insert into employer_profiles(profile_id) values ('${id}') returning id`))[0].id;
      await exec(`insert into t3a_employer_application(employer_profile_id, approval_decision, approved_by, approved_at, application_status, accepting_person_name, accepting_person_title, record_use_terms_version, terms_accepted_at, approver_id) values ('${a.ep}','approved','synthetic',now(),'approved','Synthetic Person','Director','1.0',now(),gen_random_uuid())`);
    }
    if (r === "oversight_administrator") await exec(`insert into t3a_oversight_holder(holder_id, holder_name, holder_email) select id, 'Synthetic holder', email from profiles where id='${id}'`);
  }
  return a;
}
const as = (a: Acct, sql: string) => asRole(c, "authenticated", a.id, sql);

/** A mentee for the account to mentor: a person with a candidate row, a desk assignment to the mentor, and a private note. */
async function mentee(mentor: Acct) {
  const p = await mkParticipant(c, `dr-mentee-${++seq}`);
  const cp = (await run(c, `insert into candidate_profiles(profile_id) values ('${p}') returning id`))[0].id as string;
  const assignment = (await run(c, `insert into mentor_assignments(mentor_id, candidate_id, status) values ('${mentor.mp}','${cp}','active') returning id`))[0].id as string;
  const note = (await run(c, `insert into t3a_growth_log_entry(created_by, entry_kind, text) values ('${p}','practice_note','private to ${p}') returning entry_id`))[0].entry_id as string;
  return { p, cp, assignment, note };
}

// The privileges probed. Each returns true when the account can do it.
const readMenteeProfile = async (a: Acct, m: { cp: string }) => ((await as(a, `select count(*)::int r from candidate_profiles where id='${m.cp}'`)).r as number) === 1;
const readMenteeNote = async (a: Acct, m: { note: string }) => ((await as(a, `select count(*)::int r from t3a_growth_log_entry where entry_id='${m.note}'`)).r as number) === 1;
const assignDimension = async (a: Acct, m: { assignment: string; p: string }) =>
  (await as(a, `insert into mentor_assigned_dimensions(assignment_id, mentor_id, candidate_id, dimension_id) values ('${m.assignment}','${a.id}','${m.p}','integrity_ethics') on conflict (assignment_id, dimension_id) do update set is_active = true`)).msg === "ok";
const writeObservation = async (a: Acct, m: { assignment: string; cp: string }) =>
  (await as(a, `insert into mentor_observations(assignment_id, mentor_id, candidate_id) values ('${m.assignment}','${a.mp}','${m.cp}')`)).msg === "ok";
const readObservation = async (a: Acct, assignment: string) => ((await as(a, `select count(*)::int r from mentor_observations where assignment_id='${assignment}'`)).r as number) > 0;
const poolOpen = async (a: Acct) => { const r = await as(a, `select refusal_code r from t3a_employer_pool_query() limit 1`); return r.msg === "ok" && r.r !== "EMPLOYER_NOT_VERIFIED"; };
const ownNotes = async (a: Acct) => (await as(a, `insert into t3a_growth_log_entry(created_by, entry_kind, text) values ('${a.id}','practice_note','mine') returning entry_id`)).msg === "ok";

beforeAll(async () => {
  c = await connect();
  // the throwaway build's second pass can restore earlier policies after 20270254; on the live project each migration runs once, in order
  for (const f of ["20270252000000_mentor_reads_legacy_assigned_candidates", "20270253000000_assigned_dimensions_scoped_access", "20270254000000_observation_tables_scoped_and_no_self_mentoring"])
    await exec(readFileSync(new URL(`../../../supabase/migrations/${f}.sql`, import.meta.url), "utf8"));
});
afterAll(async () => { await c.end(); });

describe("each single role, as the baseline", () => {
  it("a mentor reads and assigns for their own mentee, writes an observation, and reads no one else's note or the employer pool", async () => {
    const a = await acct(["mentor"]); const m = await mentee(a); const stranger = await mentee(await acct(["mentor"]));
    expect(await readMenteeProfile(a, m)).toBe(true);
    expect(await assignDimension(a, m)).toBe(true);
    expect(await writeObservation(a, m)).toBe(true);
    expect(await readObservation(a, m.assignment)).toBe(true);
    expect(await readMenteeNote(a, m)).toBe(false);
    expect(await readMenteeProfile(a, stranger)).toBe(false);
    expect(await assignDimension(a, stranger)).toBe(false);
    expect(await poolOpen(a)).toBe(false);
  });
  it("a participant keeps a private notebook and has no mentor, employer or observation privileges", async () => {
    const mentor = await acct(["mentor"]); const m = await mentee(mentor); const p = await acct(["participant"]);
    expect(await ownNotes(p)).toBe(true);
    expect(await readMenteeNote(p, m)).toBe(false);
    expect(await readMenteeProfile(p, m)).toBe(false);
    expect(await assignDimension(p, m)).toBe(false);
    expect(await readObservation(p, m.assignment)).toBe(false);
    expect(await poolOpen(p)).toBe(false);
  });
  it("a verified employer reaches the pool and nothing of a mentor's or a participant's", async () => {
    const mentor = await acct(["mentor"]); const m = await mentee(mentor); const e = await acct(["employer_user"]);
    expect(await poolOpen(e)).toBe(true);
    expect(await readMenteeProfile(e, m)).toBe(false);
    expect(await readMenteeNote(e, m)).toBe(false);
    expect(await assignDimension(e, m)).toBe(false);
  });
  it("an oversight administrator holds administrative standing and may not write evidence", async () => {
    const mentor = await acct(["mentor"]); const m = await mentee(mentor); const adm = await acct(["oversight_administrator"]);
    expect((await as(adm, `select t3a_has_administrative_standing() r`)).r).toBe(true);
    expect((await as(mentor, `select t3a_has_administrative_standing() r`)).r).toBe(false);
    expect(await readMenteeNote(adm, m)).toBe(false);
  });
});

describe("one account, two roles: each role's privileges, and nothing extra", () => {
  it("mentor + participant: mentors their mentee and keeps their own private notes; the mentee's notes and a stranger's mentee stay closed; cannot mentor themselves", async () => {
    const a = await acct(["mentor", "participant"]); const m = await mentee(a); const stranger = await mentee(await acct(["mentor"]));
    expect(await readMenteeProfile(a, m)).toBe(true);
    expect(await assignDimension(a, m)).toBe(true);
    expect(await writeObservation(a, m)).toBe(true);
    expect(await ownNotes(a)).toBe(true);
    expect(await readMenteeNote(a, m)).toBe(false);
    expect(await readMenteeProfile(a, stranger)).toBe(false);
    expect(await assignDimension(a, stranger)).toBe(false);
    expect(await poolOpen(a)).toBe(false);
    // their own mentor cannot be them: refused on the formal assignment and on the desk assignment
    const si = (await run(c, `insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no) values ('${a.id}','S1','D1',1) returning stage_instance_id i`))[0].i;
    await expect(exec(`insert into t3a_mentor_assignment(mentor_id, participant_id, stage_instance_id, assignment_method) values ('${a.id}','${a.id}','${si}','coordinator_allocated')`)).rejects.toThrow(/not_self|check constraint/i);
    await expect(exec(`insert into mentor_assignments(mentor_id, candidate_id, status) values ('${a.mp}','${a.cp}','active')`)).rejects.toThrow(/MENTOR_IS_THE_PARTICIPANT/);
  });
  it("mentor + employer: mentors their mentee and reaches the pool; the pair opens neither the mentee's notes nor a stranger's mentee", async () => {
    const a = await acct(["mentor", "employer_user"]); const m = await mentee(a); const stranger = await mentee(await acct(["mentor"]));
    expect(await readMenteeProfile(a, m)).toBe(true);
    expect(await assignDimension(a, m)).toBe(true);
    expect(await poolOpen(a)).toBe(true);
    expect(await readMenteeNote(a, m)).toBe(false);
    expect(await readMenteeProfile(a, stranger)).toBe(false);
    expect(await assignDimension(a, stranger)).toBe(false);
  });
  it("participant + employer: keeps a private notebook and reaches the pool; the pair reads no one else's profile or notes and assigns nothing", async () => {
    const mentor = await acct(["mentor"]); const m = await mentee(mentor); const a = await acct(["participant", "employer_user"]);
    expect(await ownNotes(a)).toBe(true);
    expect(await poolOpen(a)).toBe(true);
    expect(await readMenteeNote(a, m)).toBe(false);
    expect(await readMenteeProfile(a, m)).toBe(false);
    expect(await assignDimension(a, m)).toBe(false);
    expect(await readObservation(a, m.assignment)).toBe(false);
  });
  it("oversight administrator + mentor: administrative standing closes the mentor's evidence writing, the mentor's desk reads stay, and the observation records of others stay closed", async () => {
    const a = await acct(["oversight_administrator", "mentor"]); const m = await mentee(a); const other = await mentee(await acct(["mentor"]));
    expect((await as(a, `select t3a_has_administrative_standing() r`)).r).toBe(true);
    expect(await readMenteeProfile(a, m)).toBe(true);
    expect(await writeObservation(a, m)).toBe(false);
    const refused = await as(a, `insert into mentor_observations(assignment_id, mentor_id, candidate_id) values ('${m.assignment}','${a.mp}','${m.cp}')`);
    expect(refused.msg).toMatch(/OVERSIGHT_ROLE_MAY_NOT_ALTER_EVIDENCE/);
    // oversight reads every candidate profile by design (candidate_profiles_read); what it cannot do is write evidence or read a person's private notebook
    expect(await readMenteeProfile(a, other)).toBe(true);
    expect(await assignDimension(a, other)).toBe(false);
    expect(await readMenteeNote(a, m)).toBe(false);
  });
});

describe("the observation tables are no longer open to every signed-in account", () => {
  it("a stranger reads, changes and deletes none of a mentor's observations, feedback or synthesis", async () => {
    const mentor = await acct(["mentor"]); const m = await mentee(mentor); const stranger = await acct(["participant"]);
    expect(await writeObservation(mentor, m)).toBe(true);
    expect(await readObservation(stranger, m.assignment)).toBe(false);
    await as(stranger, `update mentor_observations set notes='tampered' where assignment_id='${m.assignment}'`);
    await as(stranger, `delete from mentor_observations where assignment_id='${m.assignment}'`);
    expect(await readObservation(mentor, m.assignment)).toBe(true);
    expect(((await run(c, `select count(*)::int n from mentor_observations where assignment_id='${m.assignment}' and notes is distinct from 'tampered'`))[0].n as number)).toBeGreaterThan(0);
    for (const t of ["observation_feedback", "observation_synthesis"]) {
      const open = await run(c, `select polname from pg_policy where polrelid='public.${t}'::regclass and pg_get_expr(polqual, polrelid) = 'true'`);
      expect(open, `${t} has an open policy`).toEqual([]);
    }
  });
});
