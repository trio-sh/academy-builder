// `pg` is installed for test runs only: npm i --no-save pg (see CLAUDE.md).
import pg from "pg";
import { randomUUID } from "node:crypto";

const URL = process.env.T3A_TEST_DB_URL;

/** A test that needs the database fails loudly when it is not configured: skipping would hide a missing gate. */
export function dbUrl(): string {
  if (!URL) throw new Error("T3A_TEST_DB_URL is not set. Build the throwaway database (tools/nonprod-replay/local_pg/build.sh) and point T3A_TEST_DB_URL at it.");
  return URL;
}

export async function connect(): Promise<pg.Client> {
  const c = new pg.Client({ connectionString: dbUrl() });
  await c.connect();
  await c.query("set search_path to public, extensions");
  return c;
}

export const RUN = randomUUID().slice(0, 8);

/** Run one statement as a role inside its own transaction (committed on success, rolled back if it raises). */
export async function asRole(c: pg.Client, role: string, sub: string | null, sql: string) {
  await c.query("begin");
  let msg = "ok";
  let rows: any[] = [];
  try {
    await c.query(`set local role ${role}`);
    await c.query(`select set_config('request.jwt.claims', '${JSON.stringify(sub ? { role, sub } : { role })}', true)`);
    await c.query(`select set_config('request.jwt.claim.sub', '${sub ?? ""}', true)`);
    rows = (await c.query(sql)).rows;
  } catch (e: any) {
    msg = e.message;
  }
  await c.query(msg === "ok" ? "commit" : "rollback");
  return { msg, rows, r: rows[0]?.r };
}
export const asService = (c: pg.Client, sql: string) => asRole(c, "service_role", null, sql);

export async function run(c: pg.Client, sql: string) {
  return (await c.query(sql)).rows;
}

/** A synthetic participant with a verified email. */
export async function mkParticipant(c: pg.Client, tag: string, role = "candidate"): Promise<string> {
  const u = randomUUID();
  await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','${tag}-${RUN}@t.local',now())`);
  await c.query(`insert into profiles(id,email,role) values ('${u}','${tag}-${RUN}@t.local','${role}')`);
  return u;
}

export const iso = (t: unknown) => (t ? new Date(t as string).toISOString() : null);

// ---------------------------------------------------------------------------------------------------------------------------------
// Synthetic approved sources and participant history. Throwaway database only: every approval and clearance here is a test fixture.

export type SourceFixture = { version: string; object: string; identifier: string; key: string };

export async function mkApprovedSource(
  c: pg.Client,
  o: { dimension: string; stage: "S1" | "S2"; situationClass: string; identifier?: string; versionNo?: string; reviewer: string },
): Promise<SourceFixture> {
  const identifier = o.identifier ?? `SRC-${o.dimension}-${o.stage}-${randomUUID().slice(0, 8)}`;
  const versionNo = o.versionNo ?? "v2.1";
  const body = {
    source_identifier: identifier, stage_code: o.stage, source_version_hash: "a".repeat(64),
    source_sheet: { [`${o.dimension.toLowerCase()}_situation_class`]: o.situationClass }, title: identifier,
  };
  await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${identifier}','source','${identifier}','${o.dimension}','not_loaded')`);
  const v = (await run(c, `insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, '${versionNo}', 'drafting', 'not_loaded', '${JSON.stringify(body)}'::jsonb from t3a_content_object where identifier='${identifier}' returning content_version_id v, content_object_id o`))[0];
  await run(c, `insert into t3a_source_authorship(source_version_id, source_author_identity) values ('${v.v}', array['author-fixture'])`);
  for (const n of [1, 2]) await run(c, `insert into t3a_source_drafting_test(source_version_id, test_no, outcome, reviewer_identity, tested_on, version_tested_ref) values ('${v.v}', ${n}, 'recorded', 'reviewer-fixture', current_date, '${versionNo}')`);
  const sub = await asService(c, `select t3a_source_submit_for_approval('${v.v}') r`);
  if (sub.msg !== "ok") throw new Error("fixture source could not be submitted: " + sub.msg);
  await run(c, `insert into t3a_d1_source_name_clearance(source_version_id, presentation_variant_values, status, cleared_at, cleared_by) values ('${v.v}','{}','cleared',now(),'${o.reviewer}')`);
  await c.query("begin");
  const ap = (await c.query(`insert into t3a_d1_source_approval(source_id, source_version_id, status, approved_by, approved_at) values ('${v.o}','${v.v}','approved','${o.reviewer}',now()) returning source_approval_id a`)).rows[0].a;
  await c.query(`insert into t3a_d1_approval_basis(source_approval_id, basis_kind, basis_entered_on, recorded_under) values ('${ap}','READ_IN_FULL_IN_THIS_SCREEN',current_date,'SYNTHETIC TEST ONLY - throwaway database')`);
  await c.query("commit");
  await run(c, `update t3a_d1_content_version set approval_status='approved', operational_state='active', approved_by='${o.reviewer}', approved_at=now(), effective_at=now() where content_version_id='${v.v}'`);
  return { version: v.v, object: v.o, identifier, key: `${identifier}@${versionNo.replace(/^v/, "")}` };
}

/** The participant has met this source: a Stage entry event on it. */
export async function meet(c: pg.Client, participant: string, sourceVersion: string): Promise<void> {
  const st = (await run(c, `select body->>'stage_code' s, o.dimension_id d from t3a_d1_content_version cv join t3a_content_object o using (content_object_id) where cv.content_version_id='${sourceVersion}'`))[0];
  const gw = (await run(c, `insert into t3a_observation_path_gateway(participant_id, session_identity_method, observation_consent_version, assistance_rules_version, coaching_terminated_at) values ('${participant}','account_authentication','1.0','1.0',now()) returning observation_path_gateway_id g`))[0].g;
  const no = (await run(c, `select coalesce(max(attempt_no),0)+1 n from t3a_stage_instance where participant_id='${participant}' and stage_code='${st.s}' and dimension_id='${st.d}'`))[0].n;
  const inst = (await run(c, `insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${participant}','${st.s}','${st.d}',${no},'scheduled') returning stage_instance_id i`))[0].i;
  await run(c, `insert into t3a_stage_entry_event(participant_id, dimension_id, stage_code, observation_path_gateway_id, stage_instance_id, session_identity, assistance_rules_version, administration_conditions, dimensions_in_play, administration_conditions_snapshot, source_version_id) values ('${participant}','${st.d}','${st.s}','${gw}','${inst}','x','1.0','{}','{${st.d}}','{}','${sourceVersion}')`);
}

/** The participant has `n` counted completed attempts on the Stage and dimension, all long enough ago to be past every wait. */
export async function completedAttempts(c: pg.Client, participant: string, dimension: string, stage: string, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    const at = new Date(Date.now() - (150 - i * 40) * 86400e3).toISOString();
    await run(c, `insert into t3a_attempt(participant_id, dimension_id, stage_code, outcome, counted, ended_at, attempt_event_class) values ('${participant}','${dimension}','${stage}','completed',true,'${at}','completed_observation')`);
  }
}

/** Fixture sources from an earlier run on the same database are retired, so a run starts from its own world and can be repeated. */
export async function retireFixtureSources(c: pg.Client): Promise<void> {
  await c.query(`update t3a_d1_content_version v set retired_at = now() from t3a_content_object o where o.content_object_id = v.content_object_id and o.identifier ~ '^SRC-D[0-9]-S[0-9]-[0-9a-f]{8}$' and v.retired_at is null`);
}
