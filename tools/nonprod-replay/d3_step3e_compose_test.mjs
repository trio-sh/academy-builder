// Step 3e: dimension determination commit guard and immutable composed statement (D3 INS-002, INS-003). Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const P = randomUUID();
await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${P}','c-${P.slice(0, 8)}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${P}','c-${P.slice(0, 8)}@t.local','candidate')`);
const ver = async (id) => (await run(`select v.content_version_id v from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier='${id}'`))[0].v;
const S2 = await ver("SRC-D3-S2-001"), S1 = await ver("SRC-D3-S1-001");
const svc = async (sql) => { await c.query("begin"); let msg = "ok", rows = []; try { await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims', '{"role":"service_role"}', true)`); rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query("commit"); return { msg, rows }; };
const J = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const compose = async (src, stage, answers, missing = {}, items = {}) => { const r = await svc(`select t3a_dimension_compose('${P}','${src}','${stage}',${J(answers)},${J(missing)},${J(items)},gen_random_uuid(),true) r`); return r.rows[0]?.r || { msg: r.msg }; };
const BASE = { "Q-D3-01": "A1", "Q-D3-01b": "A1", "Q-D3-02": "A1", "Q-D3-02b": "A1", "Q-D3-03": "A1", "Q-D3-03b": "A1", "Q-D3-04": "A1", "Q-D3-04b": "A1", "Q-D3-05": "A1", "Q-D3-05b": "A1", "Q-D3-07": "A1", "Q-D3-07b": "A1", "Q-D3-08": "A1" };
const full = { ...BASE, "Q-D3-09": "A1" };
const items = { "Q-D3-01b": ["WI1", "WI2"], "Q-D3-02b": ["DC1"], "Q-D3-03b": ["SR1"], "Q-D3-04b": ["CK1"], "Q-D3-05b": ["MN1"], "Q-D3-07b": ["DC2"] };
const S1BASE = { "Q-D3-01": "A1", "Q-D3-01b": "A1", "Q-D3-02": "A4", "Q-D3-03": "A3", "Q-D3-04": "A2", "Q-D3-04b": "A1", "Q-D3-05": "A2", "Q-D3-05b": "A1", "Q-D3-07": "A3", "Q-D3-09": "A1" };
const S1ITEMS = { "Q-D3-01b": ["WI1"], "Q-D3-04b": ["CK1"], "Q-D3-05b": ["MN1"] };
const without = (a, k) => Object.fromEntries(Object.entries(a).filter(([x]) => x !== k));

const ok = await compose(S2, 2, full, {}, items);
rec("D3-composed", "a complete valid Stage 2 pattern composes one statement (fourteen served questions; 06a and 06b are not served on this source)", ok.outcome === "composed" && ok.clauses.length === 14, ok.outcome || ok);
rec("D3-composed", "counts come from the selected items, never typed", ok.clauses.find(x => x.question_code === "Q-D3-01b").clause_text.includes("placed 2 of the work items") && ok.clauses.find(x => x.question_code === "Q-D3-04b").clause_text.includes("1 of"), ok.clauses.filter(x => /01b|04b/.test(x.question_code)).map(x => x.clause_text));
rec("D3-composed", "clause instance = observation + element + recurrence key + state code (state code is the statement id)", ok.clause_instances[0].recurrence_equivalence_key_id === "REK-D3-001" && ok.clause_instances[0].state_code === "ST-D3-001" && !!ok.clause_instances[0].observation_id, ok.clause_instances[0]);
const stored = (await run(`select count(*)::int n from t3a_dimension_composed_statement where composed_statement_id='${ok.composed_statement_id}'`))[0].n;
rec("D3-24", "one immutable composed statement is stored", stored === 1, stored);
const upd = await svc(`update t3a_dimension_composed_statement set clauses='[]'::jsonb where composed_statement_id='${ok.composed_statement_id}'`); rec("D3-24", "editing a composed statement after commit refuses", /NO_UPDATE|append|T3A_|permission/i.test(upd.msg), upd.msg.slice(0, 80));
// commit guard
const un = await compose(S2, 2, without(full, "Q-D3-09"), {}, items); rec("D3-09", "a served question left unanswered with no missing state refuses", un.reason === "served_question_unanswered", un);
const nc = await compose(S2, 2, without(full, "Q-D3-09"), { "Q-D3-09": "not_captured" }, items); rec("D3-09", "not_captured is a controlled code but not committable", nc.reason === "missing_state_not_committable", nc);
const dc = await compose(S2, 2, without(full, "Q-D3-09"), { "Q-D3-09": "declined" }, items); rec("D3-09", "declined is committable and composes nothing for that question", dc.outcome === "composed" && !dc.clauses.some(x => x.question_code === "Q-D3-09"), dc.outcome || dc);
const syn = await compose(S2, 2, without(full, "Q-D3-09"), { "Q-D3-09": "no answer given" }, items); rec("D3-10", "a coined missing state refuses", syn.reason === "missing_state_not_postable", syn);
const nap = await compose(S2, 2, without(full, "Q-D3-09"), { "Q-D3-09": "not_applicable" }, items); const nyp = await compose(S2, 2, without(full, "Q-D3-09"), { "Q-D3-09": "not_yet_observed" }, items);
rec("D3-10", "not_applicable and not_yet_observed are refused as missing states", nap.outcome === "refused" && nyp.outcome === "refused", [nap.reason, nyp.reason]);
const tf = await compose(S2, 2, without(full, "Q-D3-09"), { "Q-D3-09": "technical_failure" }, items); rec("D3-composed", "technical_failure attaches the conditions-compromised limitation", tf.outcome === "composed" && tf.conditions.includes("conditions_compromised"), tf.conditions);
// NOT SERVED
const ns = await compose(S1, 1, { ...S1BASE, "Q-D3-08": "A1" }, {}, S1ITEMS); rec("D3-04", "an answer for a question the source marks NOT SERVED refuses (Q-D3-08 on this Stage 1 source); no row is written", ns.reason === "answer_for_question_not_served", ns);
const ns6 = await compose(S2, 2, { ...full, "Q-D3-06a": "A1" }, {}, items); rec("D3-04", "Q-D3-06a is NOT SERVED on this source: an answer refuses", ns6.reason === "answer_for_question_not_served", ns6);
// child handling
const noKid = { ...full }; delete noKid["Q-D3-02b"]; noKid["Q-D3-02"] = "A4"; const nk = await compose(S2, 2, noKid, {}, { ...items, "Q-D3-02b": undefined }); rec("D3-composed", "a parent that does not serve its child leaves the child out, and that is not a missing value", nk.outcome === "composed" && !nk.clauses.some(x => x.question_code === "Q-D3-02b"), nk.outcome || nk);
const kid = { ...full, "Q-D3-02": "A4" }; const kd = await compose(S2, 2, kid, {}, items); rec("D3-composed", "a child answered although its parent did not serve it refuses", kd.reason === "child_not_reached", kd);
const pm2 = await compose(S2, 2, without(full, "Q-D3-02"), { "Q-D3-02": "declined" }, items); rec("D3-composed", "a child answered under a missing parent refuses", pm2.reason === "child_not_reached", pm2);
// bound items
const badItem = await compose(S2, 2, full, {}, { ...items, "Q-D3-03b": ["SR1", "SR9"] }); rec("D3-07", "an item not on this source version's list refuses (another version's item)", badItem.reason === "bound_item_not_on_source", badItem);
const d1Item = await compose(S2, 2, full, {}, { ...items, "Q-D3-07b": ["M1"] }); rec("D3-08", "an item drawn from a D1 style list refuses", d1Item.reason === "bound_item_not_on_source", d1Item);
const dup = await compose(S2, 2, full, {}, { ...items, "Q-D3-03b": ["SR1", "SR1"] }); rec("D3-composed", "the same item twice refuses", dup.reason === "item_selected_twice", dup);
const none = await compose(S2, 2, full, {}, { ...items, "Q-D3-03b": [] }); rec("D3-05", "a listed answer with no items refuses", none.reason === "selection_does_not_match_answer", none);
const n02 = await compose(S2, 2, full, {}, { ...items, "Q-D3-02b": [] }); rec("D3-05", "Q-D3-02 A1 with Q-D3-02b nothing selected refuses (the parent asserts a component was affected, the child identifies none)", n02.reason === "selection_does_not_match_answer", n02);
const extra = await compose(S2, 2, { ...full, "Q-D3-03b": "A2" }, {}, items); rec("D3-composed", "an answer that takes no items refuses when items are sent", extra.reason === "selection_does_not_match_answer", extra);
// Q-D3-09 item level marks
const m3 = await compose(S2, 2, { ...BASE, "Q-D3-09": "A3" }, {}, { ...items, "Q-D3-09": { overstated: ["DC1"] } }); rec("D3-composed", "Q-D3-09 A3 composes from items marked overstated, with the count taken from the marks", m3.outcome === "composed" && m3.clauses.find(x => x.question_code === "Q-D3-09").clause_text.includes("1 of"), m3.outcome || m3.reason);
const m5 = await compose(S2, 2, { ...BASE, "Q-D3-09": "A5" }, {}, { ...items, "Q-D3-09": { overstated: ["DC1"], understated: ["DC2"] } }); rec("D3-composed", "the mixed position is its own answer: overstated and understated marks together compose", m5.outcome === "composed", m5.outcome || m5.reason);
const mx = await compose(S2, 2, { ...BASE, "Q-D3-09": "A5" }, {}, { ...items, "Q-D3-09": { overstated: ["DC1"], understated: ["DC1"] } }); rec("D3-composed", "the same component marked both ways refuses", mx.reason === "item_marked_twice", mx);
const mw = await compose(S2, 2, { ...BASE, "Q-D3-09": "A3" }, {}, { ...items, "Q-D3-09": { understated: ["DC1"] } }); rec("D3-composed", "marks that do not match the answer line refuse", mw.reason === "selection_does_not_match_answer", mw);
const mu = await compose(S2, 2, { ...BASE, "Q-D3-09": "A1" }, {}, { ...items, "Q-D3-09": { overstated: ["DC1"] } }); rec("D3-composed", "a matched answer takes no marks", mu.reason === "selection_does_not_match_answer", mu);
// D3-49: Q-D3-02b and Q-D3-07b selecting the same component both compose
const same = await compose(S2, 2, full, {}, { ...items, "Q-D3-02b": ["DC1"], "Q-D3-07b": ["DC1"] }); rec("D3-49", "Q-D3-02b and Q-D3-07b selecting the same component both compose as separate determinations; neither is suppressed", same.outcome === "composed" && same.clauses.some(x => x.question_code === "Q-D3-02b") && same.clauses.some(x => x.question_code === "Q-D3-07b"), same.outcome || same);
// resolution refusals reach the commit
const rr = await compose(S1, 1, { ...S1BASE, "Q-D3-04": "A1" }, {}, S1ITEMS); rec("D3-61", "a Stage 1 check performed refuses (RR-D3-01): a written response cannot evidence it", rr.reason === "RR-D3-01", rr);
const s1ok = await compose(S1, 1, S1BASE, {}, S1ITEMS);
rec("D3-61", "a Stage 1 statement for an action-bearing element resolves to the stated-plan variant", s1ok.outcome === "composed" && s1ok.clauses.find(x => x.question_code === "Q-D3-07").state_code === "ST-D3-064", s1ok.outcome || s1ok);
const txt = JSON.stringify(s1ok.clauses || []);
rec("D3-61", "Stage 1 rendered statements contain none of the closed performed act verbs", !/\b(took|began|completed|assigned|escalated|carried out|performed|applied)\b/i.test(txt), txt.slice(0, 200));
await run(`insert into t3a_stage_form_verb(verb) values ('stated') on conflict do nothing`);
const sfv = await compose(S1, 1, S1BASE, {}, S1ITEMS);
await run(`delete from t3a_stage_form_verb where verb = 'stated'`);
rec("D3-61", "a performed act verb at Stage 1 refuses and logs stage_form_violation (checked with a verb added for the test, then removed)", sfv.reason === "stage_form_violation" && (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='stage_form_violation'`))[0].n >= 1, sfv.reason || sfv.outcome);
// mode and gate
const asUser = await c.query("begin").then(async () => { await c.query("set local role authenticated"); await c.query(`select set_config('request.jwt.claims', '{"role":"authenticated"}', true)`); try { return (await c.query(`select t3a_dimension_compose('${P}','${S2}','2',${J(full)},'{}'::jsonb,${J(items)},gen_random_uuid(),true) r`)).rows[0].r; } finally { await c.query("rollback"); } });
rec("D3-01", "test composition is the service route only", asUser.reason === "TEST_MODE_IS_SERVICE_ONLY", asUser);
const prod = await svc(`select t3a_dimension_compose('${P}','${S2}','2',${J(full)},'{}'::jsonb,${J(items)}) r`); rec("D3-01", "production composition needs a servable source and refuses on this unapproved one", prod.rows[0]?.r?.reason === "source_not_approved", prod.rows[0]?.r || prod.msg);
const wrong = await compose(S2, 1, full, {}, items); rec("D3-composed", "a source composes only at its own Stage", wrong.reason === "source_stage_mismatch", wrong);
// comparison
const a = ok.clause_instances[0], b = { ...a, observation_id: randomUUID() };
const same2 = (await run(`select t3a_clause_instances_compare(${J(a)}, ${J(b)}) r`))[0].r; rec("D3-12", "two D3 clause instances with the same key and state are equivalent", same2.equivalent === true, same2);
const d1ci = { ...a, recurrence_equivalence_key_id: "REK-D1-001" };
const cross = (await run(`select t3a_clause_instances_compare(${J(a)}, ${J(d1ci)}) r`))[0].r; rec("D3-12", "a D3 clause instance against a D1 clause instance refuses (keys are dimension scoped)", cross.reason === "dimension_isolation_violation", cross);
const c9 = await compose(S2, 2, { ...full, "Q-D3-07": "A4" }, {}, without(items, "Q-D3-07b")); const nb = { ...full, "Q-D3-07": "A4" }; delete nb["Q-D3-07b"];
const c9b = await compose(S2, 2, nb, {}, without(items, "Q-D3-07b")); const ci43 = c9b.clause_instances?.find(x => x.state_code === "ST-D3-043");
rec("D3-17", "ST-D3-043 carries its key but is a recurrence blocker and never equivalent", ci43 && ci43.recurrence_blocker === true && (await run(`select t3a_clause_instances_compare(${J(ci43)}, ${J({ ...ci43, observation_id: randomUUID() })}) r`))[0].r.equivalent === false, ci43);
const m2 = await compose(S2, 2, { ...BASE, "Q-D3-09": "A2" }, {}, items); const ci51 = m2.clause_instances?.find(x => x.state_code === "ST-D3-051");
rec("D3-17", "ST-D3-051 carries its key but is a recurrence blocker and never equivalent", ci51 && ci51.recurrence_blocker === true && (await run(`select t3a_clause_instances_compare(${J(ci51)}, ${J({ ...ci51, observation_id: randomUUID() })}) r`))[0].r.equivalent === false, ci51 || m2);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
