// Day 1 step 11.1.12 probes (DT-33, DT-34, DT-35, Domain I structure). Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
async function tryq(sql) { await c.query("begin"); let msg = "ok", rows = []; try { rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query("rollback"); return { msg, rows }; }
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const U = randomUUID(), RUN = U.slice(0, 8);
await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${U}','i-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${U}','i-${RUN}@t.local','employer')`);
const ep = await run(`select column_name, is_nullable from information_schema.columns where table_name='t3a_employer_application' and is_nullable='NO' and column_default is null`);
const empProfile = await run(`select pg_get_constraintdef(oid) d from pg_constraint where conrelid='t3a_employer_application'::regclass and contype='f'`);
const profId = (await run(`select 1 x`)) && null;
// find the employer profile table the application references
const refTbl = /REFERENCES (?:public\.)?(\w+)\((\w+)\)/.exec(empProfile[0].d);
const reqCols = await run(`select column_name, data_type from information_schema.columns where table_name='${refTbl[1]}' and is_nullable='NO' and column_default is null`);
const vals = { text: "'x'", uuid: `'${U}'`, "character varying": "'x'", boolean: "true", integer: "1" };
const mkProfile = async () => { const u = randomUUID(); await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','ip-${u.slice(0, 8)}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','ip-${u.slice(0, 8)}@t.local','employer')`);
  return (await run(`insert into ${refTbl[1]}(${reqCols.map(r => r.column_name).join(",") || refTbl[2]}) values (${reqCols.map(r => r.column_name === refTbl[2] || r.column_name === "user_id" || r.column_name === "profile_id" ? `'${u}'` : vals[r.data_type] || "'x'").join(",") || `'${u}'`}) returning ${refTbl[2]} i`))[0].i; };
const app = async (email) => `insert into t3a_employer_application(employer_profile_id, work_email, creation_route, accepting_person_name, accepting_person_title, record_use_terms_version, terms_accepted_at) values ('${await mkProfile()}','${email}','application', 'Fixture Person', 'Director', '1.0', now()) returning application_id, free_provider_refused, application_status, email_domain, free_provider_refused_capture_state cs`;
const free = await run(await app(`x-${RUN}@gmail.com`)); rec("I-app", "a free email provider is refused: free_provider_refused true, status declined", free[0].free_provider_refused === true && free[0].application_status === "declined" && free[0].cs === "captured", free[0]);
const corp = await run(await app(`hr@acme-${RUN}.ca`)); rec("I-app", "a business domain is not refused; the domain is derived", corp[0].free_provider_refused === false && corp[0].email_domain === `acme-${RUN}.ca`, corp[0]);
const badSt = await tryq(`update t3a_employer_application set application_status='maybe' where application_id='${corp[0].application_id}'`); rec("I-app", "application_status outside the four listed values is refused", /check|violat/i.test(badSt.msg), badSt.msg.slice(0, 80));
const org = (await run(`insert into t3a_employer_organization(application_id) values ('${corp[0].application_id}') returning organization_id i`))[0].i;
const orgV = (await run(`insert into t3a_employer_organization(application_id, verification_status) values (null,'verified') returning organization_id i`))[0].i;
const imm = await tryq(`update t3a_employer_organization set application_id = null where organization_id='${org}'`); rec("I-org", "organization identity facts are fixed", /IMMUTABLE_COLUMN/.test(imm.msg), imm.msg.slice(0, 80));
// DT-35
const refusals = async () => (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='EMPLOYER_NOT_VERIFIED'`))[0].n;
const r0 = await refusals();
const q1 = (await run(`select t3a_pool_query('${org}', '{"country_of_residence":"CA"}') r`))[0].r;
const q2 = (await run(`select t3a_employer_gate('${org}', 'report') r`))[0].r;
const q3 = (await run(`select t3a_employer_gate('${org}', 'count') r`))[0].r;
rec("DT-35", "as a pending organization, pool, report and count requests are all refused", [q1, q2, q3].every(x => x.reason === "EMPLOYER_NOT_VERIFIED") && (await refusals()) === r0 + 3, [q1.reason, q2.reason, q3.reason]);
rec("DT-35", "the refusals return no count or metadata", [q1, q2, q3].every(x => Object.keys(x).sort().join() === "detail,outcome,reason"), Object.keys(q1));
// DT-34
const ok = (await run(`select t3a_pool_query('${orgV}', '{"country_of_residence":"CA","occupation_interest":["nurse"]}') r`))[0].r; rec("DT-34", "a verified organization may query on participant stated fields", ok.outcome === "accepted", ok);
for (const k of ["observed_stage", "conduct_pattern", "ber_status", "dimension_score", "stage_code"]) { const bad = (await run(`select t3a_pool_query('${orgV}', '{"${k}":"x"}') r`))[0].r; rec("DT-34", `${k}: an observed or conduct derived criterion is refused`, bad.reason === "POOL_CRITERION_NOT_ALLOWED", bad.reason); }
// DT-33
const hire = (await run(`insert into t3a_hire_record(organization_id) values ('${orgV}') returning hire_recorded_id i`))[0].i;
const hc = await run(`select column_name from information_schema.columns where table_name='t3a_hire_record'`);
rec("DT-33", "a hire is recorded; the row carries no participant or report reference", !!hire && !hc.some(x => /participant|report|account|ber_/.test(x.column_name)), hc.map(x => x.column_name));
for (const t of ["t3a_employer_attestation", "t3a_workspace_note"]) { const cols = await run(`select column_name from information_schema.columns where table_name='${t}'`); rec("DT-33", `${t} carries no participant or report reference`, !cols.some(x => /participant|report|account|ber_/.test(x.column_name)), cols.map(x => x.column_name)); }
const cr = (await run(`insert into t3a_employer_contact_request(organization_id) values ('${orgV}') returning contact_request_id i`))[0].i; const badCr = await tryq(`update t3a_employer_contact_request set contact_request_state='ghosted' where contact_request_id='${cr}'`); rec("I-contact", "contact request state outside the listed values is refused", /check|violat/i.test(badCr.msg), badCr.msg.slice(0, 80));
const sock = await tryq(`insert into t3a_employment_linkage_socket(linked_participant_id) values ('${U}')`); rec("I-socket", "employment linkage socket refuses every write", /SOCKET_ROUTE_CLOSED/.test(sock.msg), sock.msg.slice(0, 80));
const anon = await tryq(`set local role anon; select * from t3a_employer_organization`); rec("I-rls", "anonymous callers cannot read employer organizations", /permission denied/.test(anon.msg), anon.msg.slice(0, 80));
const mapI = (await run(`select count(*)::int n from t3a_field_physical_map where qualified_name like 'I.%'`))[0].n; rec("DT-01(I)", "all 34 Domain I fields mapped", mapI === 34, mapI);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
