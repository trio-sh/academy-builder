/**
 * CR-343. No table in the public schema keeps a write policy that lets every signed-in account change every row, and the tables that held one now answer each kind of account the way its
 * pages need: the owner and the named counterpart write, a stranger neither reads nor writes, an administrator manages. Synthetic people; throwaway database only.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import { asRole, connect, mkParticipant, run } from "./helpers";

let c: pg.Client; let seq = 0;
const exec = (sql: string) => c.query(sql);
const as = (u: string, sql: string) => asRole(c, "authenticated", u, sql);
/** the number of rows an UPDATE or DELETE reached for this account */
const reached = async (u: string, stmt: string) => { const r = await as(u, `with x as (${stmt} returning 1) select count(*)::int r from x`); return r.msg === "ok" ? (r.r as number) : -1; };
const ok = async (u: string, sql: string) => (await as(u, sql)).msg === "ok";
const count = async (u: string, sql: string) => { const r = await as(u, `select count(*)::int r from (${sql}) q`); return r.msg === "ok" ? (r.r as number) : -1; };

let S: string, K: string, M: string, E: string, SU: string, ADM: string;           // stranger, candidate, mentor, employer, school, administrator
let mp: string, cp: string, cp2: string, ma: string, ep: string, sp: string, proj: string, conv: string, mod: string, noteK: string;

beforeAll(async () => {
  c = await connect();
  // the throwaway build's second pass can restore earlier policies after the newer migrations; on the live project each migration runs once, in order
  for (const f of ["20270252000000_mentor_reads_legacy_assigned_candidates", "20270253000000_assigned_dimensions_scoped_access", "20270254000000_observation_tables_scoped_and_no_self_mentoring", "20270255000000_close_open_write_policies", "20270256000000_mentor_assignment_pending_and_declined"])
    await exec(readFileSync(new URL(`../../../supabase/migrations/${f}.sql`, import.meta.url), "utf8"));
  const tag = () => `ow-${++seq}`;
  S = await mkParticipant(c, tag()); K = await mkParticipant(c, tag()); M = await mkParticipant(c, tag(), "mentor"); E = await mkParticipant(c, tag(), "employer");
  SU = await mkParticipant(c, tag(), "school_admin"); ADM = await mkParticipant(c, tag(), "admin");
  mp = (await run(c, `insert into mentor_profiles(profile_id) values ('${M}') returning id`))[0].id;
  cp = (await run(c, `insert into candidate_profiles(profile_id) values ('${K}') returning id`))[0].id;
  const K2 = await mkParticipant(c, tag());
  cp2 = (await run(c, `insert into candidate_profiles(profile_id) values ('${K2}') returning id`))[0].id;
  ma = (await run(c, `insert into mentor_assignments(mentor_id, candidate_id, status) values ('${mp}','${cp}','active') returning id`))[0].id;
  ep = (await run(c, `insert into employer_profiles(profile_id) values ('${E}') returning id`))[0].id;
  sp = (await run(c, `insert into school_profiles(profile_id, school_name) values ('${SU}','Synthetic School') returning id`))[0].id;
  proj = (await run(c, `insert into liveworks_projects(employer_id, title, description, category) values ('${ep}','p','d','c') returning id`))[0].id;
  conv = (await run(c, `insert into conversations(title) values ('t') returning id`))[0].id;
  await exec(`insert into conversation_participants(conversation_id, user_id) values ('${conv}','${K}'),('${conv}','${M}')`);
  mod = (await run(c, `insert into bridgefast_modules(title, description, behavioral_dimension) values ('m','d','x') returning id`))[0].id;
  noteK = (await run(c, `insert into notifications(user_id, type, title, message) values ('${K}','t','t','m') returning id`))[0].id;
});
afterAll(async () => { await c.end(); });

describe("no write policy open to every signed-in account", () => {
  it("none remains anywhere in the public schema", async () => {
    const open = await run(c, `select c.relname||'.'||p.polname n from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace s on s.oid=c.relnamespace
      where s.nspname='public' and p.polcmd<>'r' and (pg_get_expr(p.polqual,p.polrelid)='true' or pg_get_expr(p.polwithcheck,p.polrelid)='true') order by 1`);
    expect(open.map((r) => r.n)).toEqual([]);
  });
});

describe("notifications", () => {
  it("a person leaves a notification for themselves or for someone they work with, and a stranger neither leaves, changes nor removes one", async () => {
    const note = (u: string, to: string) => ok(u, `insert into notifications(user_id, type, title, message) values ('${to}','t','t','m')`);
    expect(await note(K, K)).toBe(true);
    expect(await note(M, K)).toBe(true);        // mentor to their mentee
    expect(await note(K, M)).toBe(true);        // mentee to their mentor
    expect(await note(ADM, K)).toBe(true);
    expect(await note(S, K)).toBe(false);
    expect(await note(K, S)).toBe(false);
    expect(await reached(S, `update notifications set is_read=true where id='${noteK}'`)).toBe(0);
    expect(await reached(S, `delete from notifications where id='${noteK}'`)).toBe(0);
    expect(await reached(K, `update notifications set is_read=true where id='${noteK}'`)).toBe(1);
    expect(await count(S, `select 1 from notifications where id='${noteK}'`)).toBe(0);
  });
  it("an employer reaches a candidate who applied to their project, and not one who did not", async () => {
    await exec(`insert into liveworks_applications(project_id, candidate_id) values ('${proj}','${cp}')`);
    expect(await ok(E, `insert into notifications(user_id, type, title, message) values ('${K}','t','t','m')`)).toBe(true);
    expect(await ok(E, `insert into notifications(user_id, type, title, message) values ('${S}','t','t','m')`)).toBe(false);
  });
});

describe("mentor_assignments", () => {
  it("the mentor and the candidate read it, a stranger does not; a stranger changes and removes nothing", async () => {
    expect(await count(M, `select 1 from mentor_assignments where id='${ma}'`)).toBe(1);
    expect(await count(K, `select 1 from mentor_assignments where id='${ma}'`)).toBe(1);
    expect(await count(S, `select 1 from mentor_assignments where id='${ma}'`)).toBe(0);
    expect(await reached(S, `update mentor_assignments set status='ended' where id='${ma}'`)).toBe(0);
    expect(await reached(S, `delete from mentor_assignments where id='${ma}'`)).toBe(0);
    expect(await reached(K, `update mentor_assignments set status='ended' where id='${ma}'`)).toBe(0);   // the candidate cannot end their own mentoring
    expect(await reached(M, `update mentor_assignments set status='active' where id='${ma}'`)).toBe(1);
  });
  it("the mentor request runs end to end: the candidate asks for themselves as pending, the mentor accepts or declines, and nobody else can ask, accept or decline", async () => {
    const why = async (u: string, sql: string) => (await as(u, sql)).msg;
    const ins = (cand: string, status: string) => `insert into mentor_assignments(mentor_id, candidate_id, status) values ('${mp}','${cand}','${status}')`;
    expect(await why(K, ins(cp, "pending"))).toBe("ok");
    expect(await why(K, ins(cp2, "pending"))).toMatch(/row-level security/);                     // for someone else
    expect(await why(K, ins(cp, "active"))).toMatch(/row-level security/);                       // not straight to active
    expect(await why(S, ins(cp, "pending"))).toMatch(/row-level security/);                      // not by a stranger
    const req = (await run(c, `select id from mentor_assignments where mentor_id='${mp}' and candidate_id='${cp}' and status='pending' limit 1`))[0].id;
    expect(await reached(K, `update mentor_assignments set status='active' where id='${req}'`)).toBe(0);   // the candidate cannot accept their own request
    expect(await reached(S, `update mentor_assignments set status='active' where id='${req}'`)).toBe(0);
    expect(await reached(M, `update mentor_assignments set status='declined' where id='${req}'`)).toBe(1);
    expect(await reached(M, `update mentor_assignments set status='active' where id='${req}'`)).toBe(1);
  });
});

describe("employers, projects and payments", () => {
  it("employer_profiles: only the owner changes the profile", async () => {
    expect(await reached(S, `update employer_profiles set company_name='x' where id='${ep}'`)).toBe(0);
    expect(await reached(S, `delete from employer_profiles where id='${ep}'`)).toBe(0);
    expect(await reached(E, `update employer_profiles set company_name='x' where id='${ep}'`)).toBe(1);
  });
  it("liveworks_projects: only the employer writes, everyone signed in reads", async () => {
    expect(await reached(S, `update liveworks_projects set title='x' where id='${proj}'`)).toBe(0);
    expect(await ok(S, `insert into liveworks_projects(employer_id, title, description, category) values ('${ep}','p','d','c')`)).toBe(false);
    expect(await reached(E, `update liveworks_projects set title='y' where id='${proj}'`)).toBe(1);
    expect(await count(S, `select 1 from liveworks_projects where id='${proj}'`)).toBe(1);
  });
  it("escrow_transactions: the paying employer writes and reads, a stranger neither", async () => {
    expect(await ok(S, `insert into escrow_transactions(project_id, employer_id, amount) values ('${proj}','${ep}',1)`)).toBe(false);
    expect(await ok(E, `insert into escrow_transactions(project_id, employer_id, amount) values ('${proj}','${ep}',1)`)).toBe(true);
    expect(await count(S, `select 1 from escrow_transactions`)).toBe(0);
    expect(await count(E, `select 1 from escrow_transactions`)).toBe(1);
  });
});

describe("messages, queues and settings", () => {
  it("a conversation changes only for its participants", async () => {
    expect(await reached(S, `update conversations set updated_at=now() where id='${conv}'`)).toBe(0);
    expect(await reached(M, `update conversations set updated_at=now() where id='${conv}'`)).toBe(1);
    expect(await ok(S, `insert into messages(conversation_id, sender_id, content) values ('${conv}','${S}','hi')`)).toBe(false);
    expect(await ok(M, `insert into messages(conversation_id, sender_id, content) values ('${conv}','${M}','hi')`)).toBe(true);
    expect(await reached(S, `update messages set is_deleted=true where conversation_id='${conv}'`)).toBe(0);
  });
  it("email_queue: anyone signed in queues an email, only an administrator reads or changes the queue", async () => {
    expect(await ok(K, `insert into email_queue(to_email, to_name, template, template_data, status) values ('a@t.local','a','t','{}','pending')`)).toBe(true);
    expect(await count(K, `select 1 from email_queue`)).toBe(0);
    expect(await reached(K, `update email_queue set status='sent'`)).toBe(0);
    expect(await count(ADM, `select 1 from email_queue`)).toBeGreaterThan(0);
  });
  it("admin_settings: only an administrator writes", async () => {
    expect(await ok(S, `insert into admin_settings(key, value) values ('k-${randomUUID()}','v')`)).toBe(false);
    expect(await ok(ADM, `insert into admin_settings(key, value) values ('k-${randomUUID()}','v')`)).toBe(true);
  });
  it("bridgefast: content is read by everyone signed in and written by an administrator; progress is the candidate's own, read by their mentor", async () => {
    expect(await ok(S, `insert into bridgefast_modules(title, description, behavioral_dimension) values ('m','d','x')`)).toBe(false);
    expect(await ok(ADM, `insert into bridgefast_modules(title, description, behavioral_dimension) values ('m','d','x')`)).toBe(true);
    expect(await count(S, `select 1 from bridgefast_modules`)).toBeGreaterThan(0);
    expect(await ok(K, `insert into bridgefast_progress(candidate_id, module_id) values ('${K}','${mod}')`)).toBe(true);
    expect(await ok(S, `insert into bridgefast_progress(candidate_id, module_id) values ('${K}','${mod}')`)).toBe(false);
    expect(await count(S, `select 1 from bridgefast_progress`)).toBe(0);
    expect(await count(M, `select 1 from bridgefast_progress where candidate_id='${K}'`)).toBe(1);
  });
});

describe("schools", () => {
  it("school_cohorts: only the school writes and reads its cohorts", async () => {
    expect(await ok(S, `insert into school_cohorts(school_id, name) values ('${sp}','c')`)).toBe(false);
    expect(await ok(SU, `insert into school_cohorts(school_id, name) values ('${sp}','c')`)).toBe(true);
    expect(await count(S, `select 1 from school_cohorts`)).toBe(0);
    expect(await count(SU, `select 1 from school_cohorts`)).toBe(1);
  });
});
