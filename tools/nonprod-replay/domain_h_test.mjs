// Day 1 step 11.1.11 probes (Domain H structure and rules). Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
async function tryq(sql) { await c.query("begin"); let msg = "ok", rows = []; try { rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query("rollback"); return { msg, rows }; }
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const P = randomUUID(), RC = randomUUID(), SC = randomUUID(), IS = randomUUID(), RUN = P.slice(0, 8), H = "f".repeat(64);
for (const [u, e, r] of [[P, "p", "candidate"], [RC, "r", "mentor"], [SC, "s", "mentor"], [IS, "i", "admin"]]) { await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','h${e}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','h${e}-${RUN}@t.local','${r}')`); }
const st = (await run(`select (enum_range(null::${(await run(`select udt_name u from information_schema.columns where table_name='t3a_d1_ber_report' and column_name='status'`))[0].u}))[1] s`))[0].s;
const rep = (await run(`insert into t3a_d1_ber_report(participant_id, dimension_id, status, version_set) values ('${P}','D1','${st}','{}') returning ber_report_id i`))[0].i;
const legacyRep = (await run(`select (enum_range(null::${(await run(`select udt_name u from information_schema.columns where table_name='t3a_ber_report' and column_name='status'`))[0].u}))[1] s`))[0].s;
const lrep = (await run(`insert into t3a_ber_report(participant_id, version, status) values ('${P}',1,'${legacyRep}') returning ber_report_id i`))[0].i;
const gr = (await run(`select (enum_range(null::${(await run(`select udt_name u from information_schema.columns where table_name='t3a_challenge_case' and column_name='challenge_ground'`))[0].u}))[1] g, (enum_range(null::${(await run(`select udt_name u from information_schema.columns where table_name='t3a_challenge_case' and column_name='status'`))[0].u}))[1] s`))[0];
const ch = (extra = "") => `insert into t3a_challenge_case(ber_report_id, d1_ber_report_id, participant_id, challenge_ground, status, opened_by, issuance_hold ${extra ? ", " + extra.split("|")[0] : ""}) values ('${lrep}','${rep}','${P}','${gr.g}','${gr.s}','${P}', true ${extra ? ", " + extra.split("|")[1] : ""}) returning challenge_case_id`;
const ch1 = await run(ch());
rec("H-case", "a challenge is opened with its ground, opener and issuance hold", ch1.length === 1);
const sname = (await run(`select udt_name u from information_schema.columns where table_name='t3a_d1_report_issuance' and column_name='state'`))[0].u;
const issue = (by) => `insert into t3a_d1_report_issuance(ber_report_id, participant_id, dimension_id, issued_by, version_set_at_issuance, rendered_body_hash, state) values ('${rep}','${P}','D1','${by}','{}','${H}',(enum_range(null::${sname}))[1])`;
const held = await tryq(issue(IS)); rec("H-hold", "an open challenge with issuance_hold blocks issuance of the report", /ISSUANCE_HELD/.test(held.msg), held.msg.slice(0, 90));
const noReason = await tryq(`update t3a_challenge_case set challenge_outcome='not_upheld' where challenge_case_id='${ch1[0].challenge_case_id}'`); rec("H-outcome", "an outcome without a reason code and a resolution time is refused", /check|violat/i.test(noReason.msg), noReason.msg.slice(0, 90));
const noSecond = await tryq(`update t3a_challenge_case set challenge_outcome='upheld', outcome_reason_code='R_01', resolved_at=now() where challenge_case_id='${ch1[0].challenge_case_id}'`); rec("H-outcome", "an outcome that changes the report needs a second check", /SECOND_CHECK_REQUIRED/.test(noSecond.msg), noSecond.msg.slice(0, 90));
const self = await tryq(`update t3a_challenge_case set challenge_outcome='upheld', outcome_reason_code='R_01', resolved_at=now(), second_check_actor_id='${P}' where challenge_case_id='${ch1[0].challenge_case_id}'`); rec("H-outcome", "the second check is not the person who opened the challenge", /SECOND_CHECK_NOT_INDEPENDENT/.test(self.msg), self.msg.slice(0, 90));
const okRes = await run(`update t3a_challenge_case set challenge_outcome='not_upheld', outcome_reason_code='R_01', resolved_at=now() where challenge_case_id='${ch1[0].challenge_case_id}' returning challenge_case_id`); rec("H-outcome", "a not-upheld outcome with reason code and time is accepted", okRes.length === 1);
const issued = await tryq(issue(IS)); rec("H-hold", "once the challenge is resolved the hold is released (any other refusal is a later check)", !/ISSUANCE_HELD/.test(issued.msg), issued.msg.slice(0, 90));
const badOut = await tryq(`update t3a_challenge_case set challenge_outcome='dismissed' where challenge_case_id='${ch1[0].challenge_case_id}'`); rec("H-outcome", "an outcome outside the four listed values is refused", /check|violat/i.test(badOut.msg), badOut.msg.slice(0, 80));
const cr = (await run(`insert into t3a_correction_request(participant_id, ber_report_id) values ('${P}','${rep}') returning correction_request_id i`))[0].i; await run(`update t3a_correction_request set correction_outcome='corrected' where correction_request_id='${cr}'`);
const cr2 = await tryq(`update t3a_correction_request set correction_outcome='refused' where correction_request_id='${cr}'`); rec("H-correction", "a correction outcome is a controlled code set once", /SET_ONCE/.test(cr2.msg), cr2.msg.slice(0, 80));
const crFree = await tryq(`insert into t3a_correction_request(participant_id, correction_outcome) values ('${P}','The report was wrong, so we fixed it')`); rec("H-correction", "a free text outcome is refused", /check|violat/i.test(crFree.msg), crFree.msg.slice(0, 80));
const cp = (await run(`insert into t3a_complaint(participant_id) values ('${P}') returning complaint_id i`))[0].i; await run(`update t3a_complaint set complaint_acknowledged_at=now() where complaint_id='${cp}'`);
const cp2 = await tryq(`update t3a_complaint set complaint_acknowledged_at=now() + interval '1 day' where complaint_id='${cp}'`); rec("H-complaint", "the complaint acknowledgement time is set once", /SET_ONCE/.test(cp2.msg), cp2.msg.slice(0, 80));
const mapH = (await run(`select count(*)::int n from t3a_field_physical_map where qualified_name like 'H.%'`))[0].n; rec("DT-01(H)", "all 17 Domain H fields mapped", mapH === 17, mapH);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
