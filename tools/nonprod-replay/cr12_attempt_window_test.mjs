// CORR-007 Rev 1.6 CR-12 part 1: the trailing six month window, commit instants and expiry, the 7/14/21 day waits, rescheduling waits,
// no wait after welfare stop and technical failure, rule values that cannot change. Throwaway database only; synthetic participants.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const RUN = randomUUID().slice(0, 8);
const mkU = async (tag) => { const u = randomUUID(); await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','cr12${tag}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','cr12${tag}-${RUN}@t.local','candidate')`); return u; };
const done = (u, d, at, stage = "S2") => run(`insert into t3a_attempt(participant_id, dimension_id, stage_code, outcome, counted, ended_at, attempt_event_class) values ('${u}','${d}','${stage}','completed',true,'${at}','completed_observation')`);
const ending = (u, cls, at, outcome = "participant_withdrew", d = "D2", stage = "S2") => run(`insert into t3a_attempt(participant_id, dimension_id, stage_code, outcome, counted, ended_at, attempt_event_class) values ('${u}','${d}','${stage}','${outcome}',false,'${at}','${cls}')`);
const elig = async (u, at, d = "D2", stage = "S2") => (await run(`select t3a_attempt_eligibility('${u}','${d}','${stage}','${at}') r`))[0].r;
const iso = (t) => t ? new Date(t).toISOString() : null;

// T1
let u = await mkU("a"); for (const d of ["2027-01-11T12:00:00Z", "2027-05-01T12:00:00Z", "2027-06-01T12:00:00Z", "2027-07-11T12:00:00Z"]) await done(u, "D2", d);
let r = await elig(u, "2027-07-18T12:00:00Z");
rec("CR-12-T1", "four commits, a start on 18 July: ATTEMPT_CAP_REACHED, earliest eligible 1 November", r.refusal_code === "ATTEMPT_CAP_REACHED" && iso(r.earliest_eligible_at) === "2027-11-01T12:00:00.000Z" && r.counted_in_window === 3, r);
// T2
u = await mkU("b"); for (const d of ["2027-01-11T12:00:00Z", "2027-02-01T12:00:00Z", "2027-03-15T12:00:00Z", "2027-07-19T12:00:00Z"]) await done(u, "D2", d);
r = await elig(u, "2027-08-05T12:00:00Z");
rec("CR-12-T2", "5 August is refused by the 21 day wait", r.refusal_code === "SPECIFICATION_COOLDOWN_IN_FORCE" && iso(r.earliest_eligible_at) === "2027-08-09T12:00:00.000Z", r);
r = await elig(u, "2027-08-26T12:00:00Z"); rec("CR-12-T2", "26 August is admitted", r.permitted === true && r.counted_in_window === 2, r);
await done(u, "D2", "2027-08-26T13:00:00Z"); r = await elig(u, "2027-08-26T13:30:00Z");
rec("CR-12-T2", "after that commit there are three counted attempts in the trailing six months and the cap refuses", r.refusal_code === "ATTEMPT_CAP_REACHED" && r.counted_in_window === 3, r);
// T3 month end rule, stored expiry, display zone
u = await mkU("c"); await done(u, "D2", "2026-08-31T14:00:00Z"); await done(u, "D2", "2026-10-01T09:00:00Z"); await done(u, "D2", "2026-11-02T09:00:00Z");
const ex = (await run(`select exclusion_expiry_at e from t3a_attempt where participant_id='${u}' order by commit_at limit 1`))[0].e;
rec("CR-12-T3", "31 August 14:00 plus six calendar months is 28 February 14:00, stored", iso(ex) === "2027-02-28T14:00:00.000Z", ex);
r = await elig(u, "2027-02-28T13:59:00Z"); rec("CR-12-T3", "refused at 13:59 on 28 February", r.refusal_code === "ATTEMPT_CAP_REACHED", r);
r = await elig(u, "2027-02-28T14:00:00Z"); rec("CR-12-T3", "admitted at 14:00 on 28 February", r.permitted === true, r);
await c.query("set time zone 'Pacific/Auckland'"); r = await elig(u, "2027-02-28T13:59:00Z"); const ex2 = (await run(`select exclusion_expiry_at e from t3a_attempt where participant_id='${u}' order by commit_at limit 1`))[0].e; await c.query("set time zone 'UTC'");
rec("CR-12-T3", "a different display time zone changes neither the stored expiry nor the answer", r.refusal_code === "ATTEMPT_CAP_REACHED" && iso(ex2) === "2027-02-28T14:00:00.000Z", r);
// T8
const chg = await run(`select t3a_attempt_rule_change('cap','4') r`); const nref = (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='ATTEMPT_RULE_CHANGE_REFUSED'`))[0].n;
rec("CR-12-T8", "a runtime change of the cap is refused and logged", nref >= 1, chg[0].r);
let upd = "ok"; await c.query("begin"); try { await c.query("update t3a_attempt_rule set rule_value='4' where rule_key='cap'"); } catch (e) { upd = e.message; } await c.query("rollback");
rec("CR-12-T8", "the rule rows cannot be edited", /append|T3A_/i.test(upd), upd.slice(0, 80));
let del = "ok"; await c.query("begin"); try { await c.query("delete from t3a_attempt_rule"); } catch (e) { del = e.message; } await c.query("rollback");
rec("CR-12-T8", "the rule rows cannot be deleted", /append|T3A_/i.test(del), del.slice(0, 80));
// T11 offsets
const off = await run(`select ('2027-01-01T10:00:00-06:00'::timestamptz = '2027-01-01T16:00:00Z'::timestamptz) a, ('2027-03-14T03:30:00-06:00'::timestamptz = '2027-03-14T09:30:00Z'::timestamptz) b`);
u = await mkU("d"); await done(u, "D2", "2027-03-14T03:30:00-06:00");
const cm = (await run(`select commit_at, exclusion_expiry_at from t3a_attempt where participant_id='${u}'`))[0];
rec("CR-12-T11", "a commit carrying an offset is stored as the same UTC instant, and its expiry follows", off[0].a && off[0].b && iso(cm.commit_at) === "2027-03-14T09:30:00.000Z" && iso(cm.exclusion_expiry_at) === "2027-09-14T09:30:00.000Z", cm);
// waits by position
u = await mkU("e"); await done(u, "D2", "2027-03-01T12:00:00Z");
r = await elig(u, "2027-03-07T12:00:00Z"); rec("CR-12-W1", "7 days after the first counted attempt: refused on day 6", r.refusal_code === "SPECIFICATION_COOLDOWN_IN_FORCE" && iso(r.earliest_eligible_at) === "2027-03-08T12:00:00.000Z", r);
r = await elig(u, "2027-03-08T12:00:00Z"); rec("CR-12-W1", "admitted on day 7", r.permitted === true, r);
await done(u, "D2", "2027-03-20T12:00:00Z"); r = await elig(u, "2027-04-02T12:00:00Z");
rec("CR-12-W2", "14 days after the second: refused on day 13", r.refusal_code === "SPECIFICATION_COOLDOWN_IN_FORCE" && iso(r.earliest_eligible_at) === "2027-04-03T12:00:00.000Z", r);
// stage and dimension independence
rec("CR-12-S1", "another Stage has its own count", (await elig(u, "2027-03-21T12:00:00Z", "D2", "S1")).permitted === true, null);
rec("CR-12-S2", "another dimension has its own count", (await elig(u, "2027-03-21T12:00:00Z", "D3", "S2")).permitted === true, null);
// rescheduling waits
u = await mkU("f"); await ending(u, "participant_no_show", "2027-05-01T12:00:00Z");
r = await elig(u, "2027-05-07T12:00:00Z"); rec("CR-12-R1", "a no show with no counted attempt: 7 days, refused on day 6", r.refusal_code === "SPECIFICATION_COOLDOWN_IN_FORCE", r);
r = await elig(u, "2027-05-08T12:00:00Z"); rec("CR-12-R1", "admitted on day 7", r.permitted === true, r);
u = await mkU("g"); await done(u, "D2", "2027-01-05T12:00:00Z"); await done(u, "D2", "2027-02-10T12:00:00Z"); await ending(u, "identity_verification_failure", "2027-04-01T12:00:00Z", "abandoned");
r = await elig(u, "2027-04-14T12:00:00Z"); rec("CR-12-R2", "an identity failure with two counted attempts in the window: 14 days, refused on day 13", r.refusal_code === "SPECIFICATION_COOLDOWN_IN_FORCE" && iso(r.earliest_eligible_at) === "2027-04-15T12:00:00.000Z", r);
r = await elig(u, "2027-04-15T12:00:00Z"); rec("CR-12-R2", "admitted on day 14", r.permitted === true, r);
// no wait classes
for (const [cls, oc] of [["welfare_stop", "participant_withdrew"], ["technical_failure", "system_failure"], ["accommodation_interruption", "abandoned"], ["administration_failure", "system_failure"], ["cancelled_before_start", "abandoned"]]) {
  u = await mkU("n" + cls.slice(0, 3)); await ending(u, cls, "2027-06-01T12:00:00Z", oc); r = await elig(u, "2027-06-01T12:00:01Z");
  rec("CR-12-N", `${cls}: counts nothing and sets no wait`, r.permitted === true && r.counted_in_window === 0, r);
}
// the three argument question still answers
u = await mkU("h"); await done(u, "D2", new Date(Date.now() - 86400e3 * 2).toISOString());
const old = (await run(`select t3a_d1_next_attempt_permitted('${u}','D2','S2') r`))[0].r; rec("CR-12-Q", "the existing three argument route asks the same rule", old.refusal_code === "SPECIFICATION_COOLDOWN_IN_FORCE" && !!old.earliest_eligible_at, old);
// the older entry path's status text reads the same rule
{ const st = async (u0, stage = "S2") => (await run(`select t3a_cooldown_status('${u0}','D2','${stage}') s`))[0].s;
  const w = await mkU("w"); rec("CR-12-C1", "no attempts: AVAILABLE", (await st(w)) === "AVAILABLE", null);
  await done(w, "D2", new Date(Date.now() - 2 * 86400e3).toISOString()); const s1 = await st(w); rec("CR-12-C1", "two days after a first completion: ON_COOLDOWN with the instant", /^ON_COOLDOWN\(until=\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ\)$/.test(s1), s1);
  const w3 = await mkU("w3"); for (const d of [150, 120, 90]) await done(w3, "D2", new Date(Date.now() - d * 86400e3).toISOString()); rec("CR-12-C1", "three completions in the window: ATTEMPTS_EXCEEDED", (await st(w3)) === "ATTEMPTS_EXCEEDED", await st(w3));
  const wi = await mkU("wi"); await run(`insert into t3a_attempt(participant_id, dimension_id, stage_code) values ('${wi}','D2','S2')`); rec("CR-12-C1", "an attempt that never finished counts nothing", (await st(wi)) === "AVAILABLE", await st(wi)); }
const failed = R.filter(x => !x.pass);
console.log(JSON.stringify({ failed, results: R }, null, 1)); await c.end(); process.exit(0);
