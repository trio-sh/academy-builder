// Step 3e: dimension determination commit guard and immutable composed statement (D2 INS-002, INS-003). Throwaway database only.
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
const S2 = await ver("SRC-D2-S2-001"), S1 = await ver("SRC-D2-S1-001");
const svc = async (sql) => { await c.query("begin"); let msg = "ok", rows = []; try { await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims', '{"role":"service_role"}', true)`); rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query("commit"); return { msg, rows }; };
const J = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const compose = async (src, stage, answers, missing = {}, items = {}) => { const r = await svc(`select t3a_dimension_compose('${P}','${src}','${stage}',${J(answers)},${J(missing)},${J(items)},gen_random_uuid(),true) r`); return r.rows[0]?.r || { msg: r.msg }; };
const full = { "Q-D2-01": "A1", "Q-D2-02": "A1", "Q-D2-02b": "A1", "Q-D2-03a": "A1", "Q-D2-03b": "A1", "Q-D2-04a": "A1", "Q-D2-04b": "A1", "Q-D2-05a": "A2", "Q-D2-05b": "A3", "Q-D2-06a": "A1", "Q-D2-06b": "A1", "Q-D2-07a": "A1", "Q-D2-07b": "A1", "Q-D2-08a": "A1", "Q-D2-09": "A1" };
const items = { "Q-D2-02b": ["ACT1", "ACT3"], "Q-D2-03b": ["MD1", "MD2"], "Q-D2-05b": { omitted: ["CR1"], contradicted: ["CR3"] }, "Q-D2-06b": ["AS1"], "Q-D2-07b": ["AA1"] };
const refusedCode = (r) => r.reason;

const ok = await compose(S2, 2, full, {}, items);
rec("D2-composed", "a complete valid Stage 2 pattern composes one statement", ok.outcome === "composed" && ok.clauses.length === 15, ok.outcome || ok);
rec("D2-composed", "counts come from the selected items, never typed", ok.clauses.find(x => x.question_code === "Q-D2-02b").clause_text.includes("2 of the actions") && ok.clauses.find(x => x.question_code === "Q-D2-03b").clause_text.includes("2 of the items"), ok.clauses.filter(x => /02b|03b/.test(x.question_code)).map(x => x.clause_text));
rec("D2-composed", "clause instance = observation + element + recurrence key + state code (state code is the statement id)", ok.clause_instances[0].recurrence_equivalence_key_id === "REK-D2-001" && ok.clause_instances[0].state_code === "ST-D2-001" && !!ok.clause_instances[0].observation_id, ok.clause_instances[0]);
const stored = (await run(`select count(*)::int n from t3a_dimension_composed_statement where composed_statement_id='${ok.composed_statement_id}'`))[0].n;
rec("D2-52", "one immutable composed statement is stored", stored === 1, stored);
const upd = await svc(`update t3a_dimension_composed_statement set clauses='[]'::jsonb where composed_statement_id='${ok.composed_statement_id}'`); rec("D2-52", "editing a composed statement after commit refuses", /NO_UPDATE|append|T3A_|permission/i.test(upd.msg), upd.msg.slice(0, 80));
// commit guard
const un = await compose(S2, 2, Object.fromEntries(Object.entries(full).filter(([k]) => k !== "Q-D2-09")), {}, items); rec("D2-43", "a served question left unanswered with no missing state refuses", un.reason === "served_question_unanswered", un);
const nc = await compose(S2, 2, Object.fromEntries(Object.entries(full).filter(([k]) => k !== "Q-D2-09")), { "Q-D2-09": "not_captured" }, items); rec("D2-43", "not_captured is a controlled code but not committable", nc.reason === "missing_state_not_committable", nc);
const dc = await compose(S2, 2, Object.fromEntries(Object.entries(full).filter(([k]) => k !== "Q-D2-09")), { "Q-D2-09": "declined" }, items); rec("D2-35", "declined is committable and composes nothing for that question", dc.outcome === "composed" && !dc.clauses.some(x => x.question_code === "Q-D2-09"), dc.outcome || dc);
const syn = await compose(S2, 2, Object.fromEntries(Object.entries(full).filter(([k]) => k !== "Q-D2-09")), { "Q-D2-09": "no answer given" }, items); rec("D2-35", "a coined missing state refuses", syn.reason === "missing_state_not_postable", syn);
const tf = await compose(S2, 2, Object.fromEntries(Object.entries(full).filter(([k]) => k !== "Q-D2-09")), { "Q-D2-09": "technical_failure" }, items); rec("D2-5.8", "technical_failure attaches the conditions-compromised limitation", tf.outcome === "composed" && tf.conditions.includes("conditions_compromised"), tf.conditions);
// NOT SERVED
const ns = await compose(S1, 1, { "Q-D2-01": "A1", "Q-D2-02": "A2", "Q-D2-02b": "A1" }, {}, { "Q-D2-02b": ["ACT1"] }); rec("D2-40", "an answer for a question the source marks NOT SERVED refuses; no row is written", ns.reason === "answer_for_question_not_served", ns);
// child handling
const noKid = { ...full }; delete noKid["Q-D2-02b"]; noKid["Q-D2-02"] = "A2"; const nk = await compose(S2, 2, noKid, {}, { ...items, "Q-D2-02b": undefined }); rec("D2-41", "a parent that does not serve its child leaves the child out, and that is not a missing value", nk.outcome === "composed" && !nk.clauses.some(x => x.question_code === "Q-D2-02b"), nk.outcome || nk);
const kid = { ...full, "Q-D2-02": "A2" }; const kd = await compose(S2, 2, kid, {}, items); rec("D2-41", "a child answered although its parent did not serve it refuses", kd.reason === "child_not_reached", kd);
const pm2 = await compose(S2, 2, (() => { const x = { ...full }; delete x["Q-D2-03a"]; return x; })(), { "Q-D2-03a": "declined" }, items); rec("D2-41", "a child answered under a missing parent refuses", pm2.reason === "child_not_reached", pm2);
// bound items
const badItem = await compose(S2, 2, full, {}, { ...items, "Q-D2-03b": ["MD1", "MD9"] }); rec("D2-42", "an item not on this source version's list refuses", badItem.reason === "bound_item_not_on_source", badItem);
const d1Item = await compose(S2, 2, full, {}, { ...items, "Q-D2-07b": ["M1"] }); rec("D2-42", "an item drawn from a D1 style list refuses", d1Item.reason === "bound_item_not_on_source", d1Item);
const dup = await compose(S2, 2, full, {}, { ...items, "Q-D2-03b": ["MD1", "MD1"] }); rec("D2-42", "the same item twice refuses", dup.reason === "item_selected_twice", dup);
const none = await compose(S2, 2, full, {}, { ...items, "Q-D2-03b": [] }); rec("D2-42", "a listed answer with no items refuses", none.reason === "selection_does_not_match_answer", none);
const extra = await compose(S2, 2, { ...full, "Q-D2-03b": "A2" }, {}, items); rec("D2-42", "an answer that takes no items refuses when items are sent", extra.reason === "selection_does_not_match_answer", extra);
const two = await compose(S2, 2, full, {}, { ...items, "Q-D2-06b": ["AS1", "AS1"] }); rec("D2-34", "exactly one item for a support selection", ["selection_does_not_match_answer", "item_selected_twice"].includes(two.reason), two);
const both = await compose(S2, 2, full, {}, { ...items, "Q-D2-05b": { omitted: ["CR1"], contradicted: ["CR1"] } }); rec("D2-34", "an item cannot be both omitted and contradicted", both.reason === "item_marked_twice", both);
// resolution refusals reach the commit
const rr = await compose(S1, 1, { "Q-D2-01": "A1", "Q-D2-02": "A1", "Q-D2-03a": "A3", "Q-D2-04a": "A3", "Q-D2-05a": "A1", "Q-D2-06a": "A3", "Q-D2-07a": "A2", "Q-D2-08a": "A1", "Q-D2-09": "A1" }, {}, {}); rec("D2-60", "Stage 1 cannot evidence an action performed (RR-D2-01)", rr.reason === "RR-D2-01", rr);
const txt = JSON.stringify((await compose(S1, 1, { "Q-D2-01": "A1", "Q-D2-02": "A2", "Q-D2-03a": "A1", "Q-D2-03b": "A1", "Q-D2-04a": "A1", "Q-D2-04b": "A1", "Q-D2-05a": "A1", "Q-D2-06a": "A3", "Q-D2-07a": "A1", "Q-D2-07b": "A2", "Q-D2-08a": "A1", "Q-D2-09": "A1" }, {}, { "Q-D2-03b": ["MD1"] })).clauses || []);
rec("D2-65", "Stage 1 rendered statements contain no took, began, completed, assigned, escalated or carried out", !/\b(took|began|completed|assigned|escalated|carried out)\b/i.test(txt), txt.slice(0, 200));
// mode and gate
const asUser = await c.query("begin").then(async () => { await c.query("set local role authenticated"); await c.query(`select set_config('request.jwt.claims', '{"role":"authenticated"}', true)`); try { return (await c.query(`select t3a_dimension_compose('${P}','${S2}','2',${J(full)},'{}'::jsonb,${J(items)},gen_random_uuid(),true) r`)).rows[0].r; } finally { await c.query("rollback"); } });
rec("D2-47", "test composition is the service route only", asUser.reason === "TEST_MODE_IS_SERVICE_ONLY", asUser);
const prod = await svc(`select t3a_dimension_compose('${P}','${S2}','2',${J(full)},'{}'::jsonb,${J(items)}) r`); rec("D2-26", "production composition needs a servable source and refuses on this unapproved one", prod.rows[0]?.r?.reason === "source_not_approved", prod.rows[0]?.r || prod.msg);
const wrong = await compose(S2, 1, full, {}, items); rec("D2-31", "a source composes only at its own Stage", wrong.reason === "source_stage_mismatch", wrong);
// comparison
const a = ok.clause_instances[0], b = { ...a, observation_id: randomUUID() };
const same = (await run(`select t3a_clause_instances_compare(${J(a)}, ${J(b)}) r`))[0].r; rec("D2-49", "two D2 clause instances with the same key and state are equivalent", same.equivalent === true, same);
const d1ci = { ...a, recurrence_equivalence_key_id: "REK-D1-001" };
const cross = (await run(`select t3a_clause_instances_compare(${J(a)}, ${J(d1ci)}) r`))[0].r; rec("D2-54", "a D2 clause instance against a D1 clause instance refuses (keys are dimension scoped)", cross.reason === "dimension_isolation_violation", cross);
const blk = await compose(S2, 2, { ...full, "Q-D2-09": "A5" }, {}, items); const ci9 = blk.clause_instances.find(x => x.state_code === "ST-D2-053");
rec("D2-49", "ST-D2-053 carries its key but is a recurrence blocker and never equivalent", ci9 && ci9.recurrence_blocker === true && (await run(`select t3a_clause_instances_compare(${J(ci9)}, ${J({ ...ci9, observation_id: randomUUID() })}) r`))[0].r.equivalent === false, ci9);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
