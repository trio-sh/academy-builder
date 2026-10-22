// CORR-007 Rev 1.6 CR-12 part 2: one active attempt, idempotency, callbacks counted once, refusals for an ending with no active attempt,
// fail-closed unclassified endings, reclassification that keeps the number. Throwaway database only; synthetic participants.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const conn = fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim();
const mk = async () => { const x = new Client({ connectionString: conn }); await x.connect(); await x.query("set search_path to public, extensions"); return x; };
const c = await mk(), cA = await mk(), cB = await mk();
const run = async (sql) => (await c.query(sql)).rows;
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const RUN = randomUUID().slice(0, 8);
const svcOn = async (cl, sql) => { await cl.query("begin"); let msg = "ok", rows = []; try { await cl.query("set local role service_role"); await cl.query(`select set_config('request.jwt.claims', '{"role":"service_role"}', true)`); rows = (await cl.query(sql)).rows; } catch (e) { msg = e.message; } await cl.query(msg === "ok" ? "commit" : "rollback"); return { msg, rows, r: rows[0]?.r }; };
const svc = (sql) => svcOn(c, sql);
const mkU = async (tag) => { const u = randomUUID(); await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','r12${tag}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','r12${tag}-${RUN}@t.local','candidate')`); return u; };
const begin = (u, key, at = "2027-04-01T09:00:00Z", d = "D2", s = "S2") => `select t3a_attempt_begin('${u}','${d}','${s}','${key}','${at}') r`;
const end = (u, ending, cb, at = "2027-04-01T10:00:00Z", d = "D2", s = "S2") => `select t3a_attempt_end('${u}','${d}','${s}','${ending}',${cb ? `'${cb}'` : "null"},'${at}') r`;
const refusals = async (code) => (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='${code}'`))[0].n;
const counted = async (u) => (await run(`select count(*)::int n from t3a_attempt_live where participant_id='${u}' and outcome='completed' and counted`))[0].n;

// T4: two start requests at once, then the same key repeated
let u = await mkU("a"); const a0 = await refusals("ATTEMPT_ACTIVE");
const [s1, s2] = await Promise.all([svcOn(cA, begin(u, "K1" + RUN)), svcOn(cB, begin(u, "K2" + RUN))]);
const started = [s1, s2].filter(x => x.r?.outcome === "started").length;
const active = (await run(`select count(*)::int n from t3a_attempt where participant_id='${u}' and outcome='initiated'`))[0].n;
rec("CR-12-T4", "two start requests at once: one active attempt, the other refused ATTEMPT_ACTIVE", started === 1 && active === 1 && [s1, s2].some(x => x.r?.reason === "ATTEMPT_ACTIVE") && (await refusals("ATTEMPT_ACTIVE")) === a0 + 1, [s1.r, s2.r]);
const winKey = (s1.r?.outcome === "started" ? "K1" : "K2") + RUN; const rep = await svc(begin(u, winKey, "2027-04-01T09:00:05Z"));
rec("CR-12-T4", "the same idempotency key again returns the existing attempt", rep.r?.outcome === "existing" && rep.r.attempt_id === (s1.r?.attempt_id || s2.r?.attempt_id), rep.r);
const nokey = await svc(`select t3a_attempt_begin('${u}','D2','S2','', now()) r`); rec("CR-12-T4", "a start with no idempotency key is refused", nokey.r?.reason_code === "IDEMPOTENCY_KEY_MISSING" || nokey.r?.refused === true || /IDEMPOTENCY/.test(JSON.stringify(nokey.r)), nokey.r);
let dbIdx = "ok"; try { await c.query(`insert into t3a_attempt(participant_id, dimension_id, stage_code) values ('${u}','D2','S2')`); } catch (e) { dbIdx = e.message; }
rec("CR-12-T4", "the database itself refuses a second active attempt from any route", /t3a_attempt_one_active|duplicate key/.test(dbIdx), dbIdx.slice(0, 90));
// T5: the same completion callback delivered twice, and two racing
const e1 = await svc(end(u, "completed_observation", "cb-" + RUN)); const e2 = await svc(end(u, "completed_observation", "cb-" + RUN));
rec("CR-12-T5", "the same callback twice is counted once, one number", e1.r?.outcome === "ended" && e2.r?.outcome === "already_recorded" && (await counted(u)) === 1, [e1.r, e2.r]);
let u5 = await mkU("b"); await svc(begin(u5, "R" + RUN, "2027-05-01T09:00:00Z"));
const [r1, r2] = await Promise.all([svcOn(cA, end(u5, "completed_observation", "race-" + RUN, "2027-05-01T10:00:00Z")), svcOn(cB, end(u5, "completed_observation", "race-" + RUN, "2027-05-01T10:00:00Z"))]);
rec("CR-12-T5", "two callbacks racing: counted once", (await counted(u5)) === 1 && [r1, r2].filter(x => x.r?.outcome === "ended").length === 1, [r1.r, r2.r]);
// T9, T10: no active attempt
const u9 = await mkU("c"); const n0 = await refusals("NO_ACTIVE_ATTEMPT"); const x9 = await svc(end(u9, "completed_observation", null));
rec("CR-12-T9", "a completion with no active attempt is refused and logged; no attempt and no count appear", (await refusals("NO_ACTIVE_ATTEMPT")) === n0 + 1 && (await run(`select count(*)::int n from t3a_attempt where participant_id='${u9}'`))[0].n === 0, x9.r);
const early = await svc(end(u9, "completed_observation", "late-" + RUN)); await svc(begin(u9, "S9" + RUN, "2027-06-01T09:00:00Z")); const later = await svc(end(u9, "completed_observation", "late-" + RUN, "2027-06-01T10:00:00Z"));
rec("CR-12-T10", "a refused early callback does not reserve its identifier: the same identifier counts once later", early.r?.reason_code === "NO_ACTIVE_ATTEMPT" || /NO_ACTIVE/.test(JSON.stringify(early.r)), early.r);
rec("CR-12-T10", "the later valid callback counts", later.r?.outcome === "ended" && (await counted(u9)) === 1, later.r);
// T6: unclassified ending
const u6 = await mkU("d"); await svc(begin(u6, "U" + RUN, "2027-04-01T09:00:00Z")); const m0 = await refusals("ENDING_UNCLASSIFIED");
const my = await svc(end(u6, "mystery_ending", null, "2027-04-01T09:10:00Z"));
rec("CR-12-T6", "an unknown ending counts nothing and is logged by name", my.r?.outcome === "unclassified" && my.r.counted === false && (await counted(u6)) === 0 && (await refusals("ENDING_UNCLASSIFIED")) === m0 + 1 && (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='ENDING_UNCLASSIFIED' and subject_ref='mystery_ending'`))[0].n >= 1, my.r);
const blocked = await svc(begin(u6, "U2" + RUN, "2027-05-01T09:00:00Z")); rec("CR-12-T6", "a new attempt is refused until the ending is classified", /ENDING_UNCLASSIFIED/.test(JSON.stringify(blocked.r)), blocked.r);
const cl = await svc(`select t3a_attempt_reclassify('${my.r.attempt_id}','technical_failure') r`); const after = await svc(begin(u6, "U3" + RUN, "2027-05-01T09:00:00Z"));
rec("CR-12-T6", "once classified, a new attempt may start", cl.r?.outcome === "reclassified" && after.r?.outcome === "started", [cl.r, after.r]);
// T7: reclassify a counted completion
const u7 = await mkU("e"); for (const [k, at, e] of [["A", "2027-01-11T12:00:00Z", "2027-01-11T12:30:00Z"], ["B", "2027-02-11T12:00:00Z", "2027-02-11T12:30:00Z"]]) { await svc(begin(u7, k + RUN, at)); await svc(end(u7, "completed_observation", null, e)); }
const second = (await run(`select attempt_id, attempt_no from t3a_attempt where participant_id='${u7}' and attempt_no=2`))[0];
const rc = await svc(`select t3a_attempt_reclassify('${second.attempt_id}','administration_failure') r`);
const rows7 = await run(`select attempt_id, attempt_no, outcome, counted, superseded_by, supersedes from t3a_attempt where participant_id='${u7}' order by created_at, attempt_no, superseded_by nulls last`);
const orig = rows7.find(x => x.attempt_id === second.attempt_id), repl = rows7.find(x => x.supersedes === second.attempt_id);
rec("CR-12-T7", "the original is kept and superseded; the replacement keeps number 2", rc.r?.outcome === "reclassified" && orig?.superseded_by === repl?.attempt_id && orig.outcome === "completed" && repl.attempt_no === 2 && repl.counted === false, rows7);
rec("CR-12-T7", "the count falls to one", (await counted(u7)) === 1, null);
const elig = (await run(`select t3a_attempt_eligibility('${u7}','D2','S2','2027-03-01T00:00:00Z') r`))[0].r; rec("CR-12-T7", "the wait is recalculated from the one remaining completion (7 days after 11 January: long passed)", elig.permitted === true && elig.counted_in_window === 1, elig);
await svc(begin(u7, "C" + RUN, "2027-03-01T12:00:00Z")); await svc(end(u7, "completed_observation", null, "2027-03-01T12:30:00Z"));
const nos = (await run(`select attempt_no from t3a_attempt where participant_id='${u7}' and outcome='completed' and counted and superseded_by is null order by attempt_no`)).map(x => x.attempt_no).join();
rec("CR-12-T7", "the next counted attempt takes number 3: the issued numbers stay and the gap (2) stays visible", nos === "1,3", nos);
// route access
const open = await (async () => { await c.query("begin"); let m = "ok"; try { await c.query("set local role authenticated"); await c.query(`select t3a_attempt_begin('${u7}','D2','S2','x','${new Date().toISOString()}')`); } catch (e) { m = e.message; } await c.query("rollback"); return m; })();
rec("CR-12-A", "the routes are not callable by a participant", /permission denied|SERVICE_ONLY/.test(open), open.slice(0, 80));
const failed = R.filter(x => !x.pass);
console.log(JSON.stringify({ failed, results: R }, null, 1)); await c.end(); await cA.end(); await cB.end(); process.exit(0);
