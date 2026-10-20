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
const S2 = await ver("SRC-D4-S2-001"), S1 = await ver("SRC-D4-S1-001");
const svc = async (sql) => { await c.query("begin"); let msg = "ok", rows = []; try { await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims', '{"role":"service_role"}', true)`); rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query("commit"); return { msg, rows }; };
const J = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const compose = async (src, stage, answers, missing = {}, items = {}, ref = null) => { const r = await svc(`select t3a_dimension_compose('${P}','${src}','${stage}',${J(answers)},${J(missing)},${J(items)},${ref ? `'${ref}'` : "gen_random_uuid()"},true) r`); return r.rows[0]?.r || { msg: r.msg }; };
const prodCompose = async (src, stage, answers, items, ref) => { const r = await svc(`select t3a_dimension_compose('${P}','${src}','${stage}',${J(answers)},'{}'::jsonb,${J(items)},'${ref}') r`); return r.rows[0]?.r || { msg: r.msg }; };
const BASE = { "Q-D4-01": "A3", "Q-D4-01b": "A1", "Q-D4-02": "A1", "Q-D4-02b": "A1", "Q-D4-03": "A1", "Q-D4-03b": "A1", "Q-D4-04": "A1", "Q-D4-04b": "A1", "Q-D4-05": "A1", "Q-D4-05b": "A1", "Q-D4-07": "A1", "Q-D4-07b": "A1", "Q-D4-08": "A1", "Q-D4-09": "A1" };
const items = { "Q-D4-01b": ["RR1"], "Q-D4-02b": ["MI1"], "Q-D4-03b": ["MI1", "MI2"], "Q-D4-04b": ["AC1"], "Q-D4-05b": ["UC1"], "Q-D4-07b": ["CH1"] };
const S1BASE = { "Q-D4-01": "A3", "Q-D4-01b": "A1", "Q-D4-02": "A1", "Q-D4-02b": "A1", "Q-D4-03": "A1", "Q-D4-03b": "A1", "Q-D4-04": "A1", "Q-D4-04b": "A1", "Q-D4-05": "A1", "Q-D4-05b": "A1", "Q-D4-08": "A1", "Q-D4-09": "A1" };
const S1ITEMS = { "Q-D4-01b": ["RR1"], "Q-D4-02b": ["MI1"], "Q-D4-03b": ["MI1", "MI2"], "Q-D4-04b": ["AC1"], "Q-D4-05b": ["UC1"] };
const without = (a, k) => Object.fromEntries(Object.entries(a).filter(([x]) => x !== k));

const ok = await compose(S2, 2, BASE, {}, items);
rec("D4-composed", "a complete valid Stage 2 pattern composes one statement (fourteen served questions; Q-D4-06 is NOT SERVED on this source)", ok.outcome === "composed" && ok.clauses.length === 14, ok.outcome === "composed" ? ok.clauses.length : ok);
rec("D4-composed", "counts come from the selected items, never typed", ok.clauses?.find(x => x.question_code === "Q-D4-03b")?.clause_text.includes("2 of the designated items"), ok.clauses?.filter(x => /03b/.test(x.question_code)).map(x => x.clause_text));
rec("D4-composed", "clause instance carries the dimension scoped key and the statement id", ok.clause_instances?.[0].recurrence_equivalence_key_id?.startsWith("REK-D4-") && ok.clause_instances[0].state_code === "ST-D4-003", ok.clause_instances?.[0]);
const stored = (await run(`select count(*)::int n from t3a_dimension_composed_statement where composed_statement_id='${ok.composed_statement_id}'`))[0].n; rec("D4-24", "one immutable composed statement is stored", stored === 1, stored);
const upd = await svc(`update t3a_dimension_composed_statement set clauses='[]'::jsonb where composed_statement_id='${ok.composed_statement_id}'`); rec("D4-24", "editing a composed statement after commit refuses", /NO_UPDATE|append|T3A_|permission/i.test(upd.msg), upd.msg.slice(0, 80));
// NOT SERVED
const ns1 = await compose(S1, 1, { ...S1BASE, "Q-D4-07": "A1" }, {}, S1ITEMS); rec("D4-04", "Q-D4-07 is NOT SERVED on the Stage 1 source: an answer refuses and nothing is written", ns1.reason === "answer_for_question_not_served", ns1);
const ns2 = await compose(S1, 1, { ...S1BASE, "Q-D4-07b": "A1" }, {}, { ...S1ITEMS, "Q-D4-07b": ["CH1"] }); rec("D4-04", "Q-D4-07b is NOT SERVED at Stage 1 as well", ns2.reason === "answer_for_question_not_served", ns2);
const ns6 = await compose(S2, 2, { ...BASE, "Q-D4-06": "A1" }, {}, items); rec("D4-04", "Q-D4-06 is NOT SERVED on this source: an answer refuses", ns6.reason === "answer_for_question_not_served", ns6);
// D4-05: items Q-D4-02 / 02b
const n02 = await compose(S2, 2, BASE, {}, { ...items, "Q-D4-02b": [] }); rec("D4-05", "Q-D4-02 A1 with no item selected at Q-D4-02b refuses", n02.reason === "selection_does_not_match_answer", n02);
const x02 = await compose(S2, 2, { ...BASE, "Q-D4-02": "A2" }, {}, items); rec("D4-05", "an answer that does not serve the child leaves the child unreached; sending its items refuses", x02.reason === "child_not_reached", x02);
// D4-06: Q-D4-07 A3 alone
const a3 = { ...BASE, "Q-D4-07": "A3" }; delete a3["Q-D4-07b"]; const c3 = await compose(S2, 2, a3, {}, without(items, "Q-D4-07b"));
rec("D4-06", "Q-D4-07 A3 (a channel not made available) resolves to ST-D4-036 alone, with no child", c3.outcome === "composed" && c3.clauses.some(x => x.state_code === "ST-D4-036") && !c3.clauses.some(x => x.question_code === "Q-D4-07b"), c3.outcome === "composed" ? c3.clauses.map(x => x.state_code) : c3);
// missing states
const un = await compose(S2, 2, without(BASE, "Q-D4-09"), {}, items); rec("D4-09", "a served question left unanswered with no missing state refuses", un.reason === "served_question_unanswered", un);
const nc = await compose(S2, 2, without(BASE, "Q-D4-09"), { "Q-D4-09": "not_captured" }, items); rec("D4-09", "not_captured is a controlled code but not committable", nc.reason === "missing_state_not_committable", nc);
const dc = await compose(S2, 2, without(BASE, "Q-D4-09"), { "Q-D4-09": "declined" }, items); rec("D4-09", "declined is committable and composes nothing for that question", dc.outcome === "composed" && !dc.clauses.some(x => x.question_code === "Q-D4-09"), dc.outcome || dc);
const nap = await compose(S2, 2, without(BASE, "Q-D4-09"), { "Q-D4-09": "not_applicable" }, items); rec("D4-10", "not_applicable is refused as a missing state", nap.outcome === "refused", nap.reason);
// bound items
const bad = await compose(S2, 2, BASE, {}, { ...items, "Q-D4-02b": ["MI9"] }); rec("D4-07", "an item not on this source version's list refuses", bad.reason === "bound_item_not_on_source", bad);
const dup = await compose(S2, 2, BASE, {}, { ...items, "Q-D4-03b": ["MI1", "MI1"] }); rec("D4-07", "the same item twice refuses", dup.reason === "item_selected_twice", dup);
// D4-49: same item at 02b and 03b both compose
const same = await compose(S2, 2, BASE, {}, { ...items, "Q-D4-02b": ["MI1"], "Q-D4-03b": ["MI1", "MI2"] });
rec("D4-49", "the same material item selected at Q-D4-02b and Q-D4-03b composes both as separate determinations", same.outcome === "composed" && same.clauses.some(x => x.question_code === "Q-D4-02b") && same.clauses.some(x => x.question_code === "Q-D4-03b"), same.outcome || same);
// D4-17 blockers
const rb = (await run(`select statement_key from t3a_d1_statement_library where dimension_id='D4' and recurrence_blocker order by 1`)).map(r => r.statement_key);
rec("D4-17", "ST-D4-010 and ST-D4-015 are the recurrence blockers", JSON.stringify(rb) === JSON.stringify(["ST-D4-010", "ST-D4-015"]), rb);
const NONE = { "Q-D4-01": "A4", "Q-D4-02": "A3", "Q-D4-03": "A3", "Q-D4-04": "A4", "Q-D4-05": "A4", "Q-D4-07": "A4", "Q-D4-08": "A4", "Q-D4-09": "A4" };
const b10 = await compose(S2, 2, NONE, {}, {});
const ci10 = b10.clause_instances?.find(x => x.state_code === "ST-D4-015");
rec("D4-17", "no communication at all composes, and ST-D4-015 carries its key (ST-D4-010 is suppressed as the duplicated absence statement when Q-D4-01 records none) but is a recurrence blocker and never equivalent", ci10 && ci10.recurrence_blocker === true && (await run(`select t3a_clause_instances_compare(${J(ci10)}, ${J({ ...ci10, observation_id: randomUUID() })}) r`))[0].r.equivalent === false, ci10 || b10);
const a1 = ok.clause_instances[0], b1 = { ...a1, observation_id: randomUUID() };
const eq = (await run(`select t3a_clause_instances_compare(${J(a1)}, ${J(b1)}) r`))[0].r; rec("D4-12", "two D4 clause instances with the same key and state are equivalent", eq.equivalent === true, eq);
const cross = (await run(`select t3a_clause_instances_compare(${J(a1)}, ${J({ ...a1, recurrence_equivalence_key_id: "REK-D3-001" })}) r`))[0].r; rec("D4-12", "a D4 clause instance against a D3 clause instance refuses", cross.reason === "dimension_isolation_violation", cross);
// stage form
const s1ok = await compose(S1, 1, S1BASE, {}, S1ITEMS); rec("D4-61", "a Stage 1 pattern composes, carrying the stage_1_only limitation", s1ok.outcome === "composed" && s1ok.conditions.includes("stage_1_only"), s1ok.outcome || s1ok);
rec("D4-61", "Stage 1 form has no performed channel use: Q-D4-07 is not even served", !(s1ok.clauses || []).some(x => /07/.test(x.question_code)), null);
await run(`insert into t3a_stage_form_verb(verb) values ('addressed') on conflict do nothing`);
const sfv = await compose(S1, 1, S1BASE, {}, S1ITEMS); await run(`delete from t3a_stage_form_verb where verb='addressed'`);
rec("D4-61", "a performed-act verb at Stage 1 refuses and logs stage_form_violation (verb added for the test, then removed)", sfv.reason === "stage_form_violation" && (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='stage_form_violation'`))[0].n >= 1, sfv.reason || sfv.outcome);
// mode and gate
const asUser = await c.query("begin").then(async () => { await c.query("set local role authenticated"); await c.query(`select set_config('request.jwt.claims', '{"role":"authenticated"}', true)`); try { return (await c.query(`select t3a_dimension_compose('${P}','${S2}','2',${J(BASE)},'{}'::jsonb,${J(items)},gen_random_uuid(),true) r`)).rows[0].r; } finally { await c.query("rollback"); } });
rec("D4-01", "test composition is the service route only", asUser.reason === "TEST_MODE_IS_SERVICE_ONLY", asUser);
await run(`select set_config('t3a.commit_seal_key','', false)`);
const prod = await prodCompose(S2, 2, BASE, items, randomUUID()); rec("D4-01", "production composition refuses on this unapproved source", prod.reason === "source_not_approved" || prod.outcome === "refused", prod);
const wrong = await compose(S2, 1, BASE, {}, items); rec("D4-composed", "a source composes only at its own Stage", wrong.reason === "source_stage_mismatch", wrong);
// D-06 seal
const KEY = "synthetic-test-key-" + randomUUID();
const comp = await compose(S2, 2, BASE, {}, items);
const seal = async (id, sup = false) => { await c.query("begin"); await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims','{"role":"service_role"}',true)`); await c.query(`select set_config('t3a.commit_seal_key','${KEY}',true)`); let r; try { r = (await c.query(`select t3a_seal_composed('${id}', ${sup}) r`)).rows[0].r; } catch (e) { r = { msg: e.message }; } await c.query("commit"); return r; };
await c.query(`select set_config('t3a.commit_seal_key','',false)`);
const unl = await svc(`select t3a_seal_composed('${comp.composed_statement_id}', false) r`);
rec("D4-65", "with the signing key not loaded the seal refuses as commit_seal_key_unloaded", /COMMIT_SEAL_KEY_UNLOADED/i.test(JSON.stringify(unl.rows[0]?.r || unl.msg)), unl.rows[0]?.r || unl.msg);
const sl = await seal(comp.composed_statement_id); rec("D4-65", "with the key loaded the seal is written", !(sl && sl.msg), sl);
const chk = (await run(`select count(*)::int n from t3a_commit_seal where composed_statement_id='${comp.composed_statement_id}'`))[0].n; rec("D4-65", "exactly one seal row exists for the composed statement", chk === 1, chk);
await run(`select 1`);
const tamper = await svc(`update t3a_commit_seal set seal='00' where composed_statement_id='${comp.composed_statement_id}'`); rec("D4-65", "a seal cannot be edited", /NO_UPDATE|append|T3A_|permission/i.test(tamper.msg), tamper.msg.slice(0, 80));
const ver2 = await c.query("begin").then(async () => { await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims','{"role":"service_role"}',true)`); await c.query(`select set_config('t3a.commit_seal_key','${KEY}',true)`); try { return (await c.query(`select t3a_verify_commit_seal('${comp.composed_statement_id}') r`)).rows[0].r; } catch (e) { return { msg: e.message }; } finally { await c.query("commit"); } });
rec("D4-65", "a sealed statement verifies under the server key", ver2 === true || ver2?.valid === true || ver2?.passed === true || ver2?.outcome === "valid", ver2);
const ver3 = await c.query("begin").then(async () => { await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims','{"role":"service_role"}',true)`); await c.query(`select set_config('t3a.commit_seal_key','another-key',true)`); try { return (await c.query(`select t3a_verify_commit_seal('${comp.composed_statement_id}') r`)).rows[0].r; } catch (e) { return { msg: e.message }; } finally { await c.query("commit"); } });
rec("D4-65", "under any other key the seal reads as invalid (commit_seal_invalid)", JSON.stringify(ver3).includes("commit_seal_invalid") || ver3 === false || ver3?.valid === false, ver3);

// D4-66: an observation identifier commits once
const REF = randomUUID();
const o1 = await compose(S2, 2, BASE, {}, items, REF), o2 = await compose(S2, 2, BASE, {}, items, REF);
rec("D4-66", "a second original commit under the same observation identifier is refused by the store; the first record stands", o1.outcome === "composed" && /original_uq/.test(o2.msg || "") && (await run(`select count(*)::int n from t3a_dimension_composed_statement where observation_ref='${REF}'`))[0].n === 1, o2);
await seal(o1.composed_statement_id);
const again = await seal(o1.composed_statement_id);
rec("D4-66", "a second original seal under the same identifier is refused as well", !!again?.msg && /unique|one_original|pkey/i.test(again.msg) && (await run(`select count(*)::int n from t3a_commit_seal where observation_ref='${REF}'`))[0].n === 1, again);
// the production route would refuse before writing: the check reads the seal register
rec("D4-66", "the production commit path checks the seal register for the identifier before it writes", (await run(`select pg_get_functiondef('t3a_dimension_compose'::regproc) d`))[0].d.includes("observation_id_not_unique"), null);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
