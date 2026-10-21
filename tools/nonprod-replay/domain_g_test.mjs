// Day 1 step 11.1.10 probes (DT-27, DT-28, Domain G structure). Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID, createHash } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
async function tryq(sql) { await c.query("begin"); let msg = "ok", rows = []; try { rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query("rollback"); return { msg, rows }; }
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const P = randomUUID(), RV = randomUUID(), IS = randomUUID(), RUN = P.slice(0, 8), H = "e".repeat(64);
for (const [u, e, r] of [[P, "p", "candidate"], [RV, "r", "mentor"], [IS, "i", "admin"]]) { await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','g${e}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','g${e}-${RUN}@t.local','${r}')`); }
const st = (await run(`select (enum_range(null::${(await run(`select udt_name u from information_schema.columns where table_name='t3a_d1_ber_report' and column_name='status'`))[0].u}))[1] s`))[0].s;
const mk = async () => (await run(`insert into t3a_d1_ber_report(participant_id, dimension_id, status, version_set, specimen_render_flag, report_type, ber_status) values ('${P}','D1','${st}','{}', true, 'ber', 'assembling') returning ber_report_id, verification_code`))[0];
const b1 = await mk(), b2 = await mk(), b3 = await mk();
// DT-28
const sha = createHash("sha256").update(b1.ber_report_id).digest("hex");
rec("DT-28", "a specimen gets a verification code on issue", !!b1.verification_code && b1.verification_code.length >= 16, b1.verification_code);
rec("DT-28", "the code is not derivable from ber_report_id (not the id, its hash, or a prefix of either)", ![b1.ber_report_id, sha, sha.slice(0, b1.verification_code.length), b1.ber_report_id.replace(/-/g, "")].some(x => x.toLowerCase().includes(b1.verification_code.toLowerCase())), { code: b1.verification_code });
rec("DT-28", "three reports get three different codes", new Set([b1.verification_code, b2.verification_code, b3.verification_code]).size === 3);
const dup = await tryq(`update t3a_d1_ber_report set verification_code='${b1.verification_code}' where ber_report_id='${b2.ber_report_id}'`); rec("DT-28", "two reports cannot share a verification code", /duplicate|unique|violat/i.test(dup.msg), dup.msg.slice(0, 80));
// DT-27
await run(`insert into t3a_evidence_review(ber_report_id, reviewer_id, version_set_hash, review_checklist_results) values ('${b1.ber_report_id}','${RV}','${H}','{"ok":true}')`);
const iss = (by, rep) => `insert into t3a_d1_report_issuance(ber_report_id, participant_id, dimension_id, issued_by, version_set_at_issuance, rendered_body_hash, state) values ('${rep}','${P}','D1','${by}','{}','${H}',(enum_range(null::${"t3a_issuance_state"}))[1])`;
const sname = (await run(`select udt_name u from information_schema.columns where table_name='t3a_d1_report_issuance' and column_name='state'`))[0].u;
const issq = (by, rep) => iss(by, rep).replace("t3a_issuance_state", sname);
const same = await tryq(issq(RV, b1.ber_report_id)); rec("DT-27", "issuing a report with issued_by = reviewer_id is refused", /REVIEWER_IS_ISSUER/.test(same.msg), same.msg.slice(0, 100));
const diff = await tryq(issq(IS, b1.ber_report_id)); rec("DT-27", "a different issuer passes this rule (any other refusal is a later check)", !/REVIEWER_IS_ISSUER/.test(diff.msg), diff.msg.slice(0, 100));
await run(issq(IS, b2.ber_report_id));
const rev2 = await tryq(`insert into t3a_evidence_review(ber_report_id, reviewer_id, version_set_hash, review_checklist_results) values ('${b2.ber_report_id}','${IS}','${H}','{}')`); rec("DT-27", "the issuer cannot be recorded as the reviewer afterwards", /REVIEWER_IS_ISSUER/.test(rev2.msg), rev2.msg.slice(0, 90));
// release
const rel = (await run(`insert into t3a_report_release(ber_report_id, release_mode, employer_visibility_state) values ('${b1.ber_report_id}','approved_employer_pool','available_to_approved_employers') returning recipient_release_id r`))[0].r;
const nrNo = await tryq(`insert into t3a_report_release(ber_report_id, release_mode) values ('${b1.ber_report_id}','named_pilot_recipient')`); rec("G-release", "a named recipient release needs a recipient address hash; a pool release has none", /check|violat/i.test(nrNo.msg), nrNo.msg.slice(0, 80));
const upd = await run(`update t3a_report_release set employer_visibility_state='future_availability_withdrawn' where recipient_release_id='${rel}' returning availability_changed_at`); rec("G-release", "withdrawing availability is accepted and stamps the change time", upd.length === 1 && upd[0].availability_changed_at !== null);
const back = await tryq(`update t3a_report_release set employer_visibility_state='available_to_approved_employers' where recipient_release_id='${rel}'`); rec("G-release", "a withdrawal of future availability cannot be reversed in place", /VISIBILITY_WITHDRAWN/.test(back.msg), back.msg.slice(0, 80));
const imm = await tryq(`update t3a_report_release set release_mode='named_pilot_recipient' where recipient_release_id='${rel}'`); rec("G-release", "release mode is fixed after creation", /IMMUTABLE_COLUMN/.test(imm.msg), imm.msg.slice(0, 80));
const badTok = await tryq(`update t3a_report_release set token_state='open' where recipient_release_id='${rel}'`); rec("G-release", "a token state outside the four listed values is refused", /check|violat/i.test(badTok.msg), badTok.msg.slice(0, 80));
const badSt = await tryq(`update t3a_d1_ber_report set ber_status='printed' where ber_report_id='${b1.ber_report_id}'`); rec("G-status", "ber_status outside the eleven listed values is refused", /check|violat/i.test(badSt.msg), badSt.msg.slice(0, 80));
const ac = await tryq(`insert into t3a_report_access(ber_report_id, accessor_id) values ('${b1.ber_report_id}','${P}') returning report_access_id`); const vc = await tryq(`insert into t3a_verification_check(ber_report_id, outcome) values ('${b1.ber_report_id}','match') returning verification_check_id`);
rec("G-access", "report access and verification check records are stored", ac.msg === "ok" && vc.msg === "ok", [ac.msg, vc.msg]);
const sock = await tryq(`insert into t3a_job_family_socket(job_family) values ('x')`); rec("G-socket", "job family socket refuses every write", /SOCKET_ROUTE_CLOSED/.test(sock.msg), sock.msg.slice(0, 80));
const de = await tryq(`insert into t3a_dimension_evidence(participant_id, dimension_id, evidence_state, sufficiency_rules_version, dimension_evidence_state, cross_cutting_condition_flags, cross_cutting_condition_flags_capture_state) values ('${P}','D1',(enum_range(null::${(await run(`select udt_name u from information_schema.columns where table_name='t3a_dimension_evidence' and column_name='evidence_state'`))[0].u}))[1],'1.0','SUFFICIENT','{single_observer}','captured')`); rec("G-evidence", "dimension evidence accepts the new state and flags", de.msg === "ok", de.msg.slice(0, 120));
const mapG = (await run(`select count(*)::int n from t3a_field_physical_map where qualified_name like 'G.%'`))[0].n; rec("DT-01(G)", "all 37 Domain G fields mapped", mapG === 37, mapG);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
