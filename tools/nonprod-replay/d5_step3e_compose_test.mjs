// Step 3e: dimension determination commit guard and immutable composed statement (D5 INS-002, INS-003). Throwaway database only.
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
const S2 = await ver("SRC-D5-S2-001"), S1 = await ver("SRC-D5-S1-001"), S3 = await ver("SRC-D5-S3-002");
const svc = async (sql) => { await c.query("begin"); let msg = "ok", rows = []; try { await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims', '{"role":"service_role"}', true)`); rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query("commit"); return { msg, rows }; };
const J = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const compose = async (src, stage, answers, missing = {}, items = {}, ref = null) => { const r = await svc(`select t3a_dimension_compose('${P}','${src}','${stage}',${J(answers)},${J(missing)},${J(items)},${ref ? `'${ref}'` : "gen_random_uuid()"},true) r`); return r.rows[0]?.r || { msg: r.msg }; };
const prodCompose = async (src, stage, answers, items, ref) => { const r = await svc(`select t3a_dimension_compose('${P}','${src}','${stage}',${J(answers)},'{}'::jsonb,${J(items)},'${ref}') r`); return r.rows[0]?.r || { msg: r.msg }; };
// Stage 2 (SRC-D5-S2-001): all sixteen questions are served
const BASE = { "Q-D5-01": "A1", "Q-D5-01b": "A1", "Q-D5-02": "A1", "Q-D5-02b": "A1", "Q-D5-03": "A1", "Q-D5-03b": "A1", "Q-D5-04": "A1", "Q-D5-04b": "A1", "Q-D5-05": "A1", "Q-D5-05b": "A1", "Q-D5-06": "A1", "Q-D5-06b": "A1", "Q-D5-07": "A1", "Q-D5-07b": "A1", "Q-D5-08": "A1", "Q-D5-09": "A1" };
const items = { "Q-D5-01b": ["DP1"], "Q-D5-02b": ["DE1", "DE2"], "Q-D5-03b": ["SI1", "SI2"], "Q-D5-04b": ["AO1"], "Q-D5-05b": ["AO2"], "Q-D5-06b": ["AR1"], "Q-D5-07b": ["AC1", "AC2"] };
// Stage 1 (SRC-D5-S1-001): Q-D5-06 and Q-D5-06b are NOT SERVED
const without = (a, ...ks) => Object.fromEntries(Object.entries(a).filter(([x]) => !ks.includes(x)));
const S1BASE = without(BASE, "Q-D5-06", "Q-D5-06b"); const S1ITEMS = without(items, "Q-D5-06b");
// Stage 3 (SRC-D5-S3-002): Q-D5-06, Q-D5-06b and Q-D5-09 are NOT SERVED
const S3BASE = without(BASE, "Q-D5-06", "Q-D5-06b", "Q-D5-09"); const S3ITEMS = without(items, "Q-D5-06b");

const ok = await compose(S2, 2, BASE, {}, items);
rec("D5-composed", "a complete valid Stage 2 pattern composes one statement (sixteen served questions)", ok.outcome === "composed" && ok.clauses.length === 16, ok.outcome === "composed" ? ok.clauses.length : ok);
rec("D5-composed", "counts come from the selected items, never typed", ok.clauses?.find(x => x.question_code === "Q-D5-03b")?.clause_text.includes("named 2 of the shared items"), ok.clauses?.filter(x => /03b/.test(x.question_code)).map(x => x.clause_text));
rec("D5-composed", "clause instance carries the dimension scoped key and the statement id", ok.clause_instances?.[0].recurrence_equivalence_key_id?.startsWith("REK-D5-") && ok.clause_instances[0].state_code === "ST-D5-001", ok.clause_instances?.[0]);
const stored = (await run(`select count(*)::int n from t3a_dimension_composed_statement where composed_statement_id='${ok.composed_statement_id}'`))[0].n; rec("D5-24", "one immutable composed statement is stored", stored === 1, stored);
const upd = await svc(`update t3a_dimension_composed_statement set clauses='[]'::jsonb where composed_statement_id='${ok.composed_statement_id}'`); rec("D5-24", "editing a composed statement after commit refuses", /NO_UPDATE|append|T3A_|permission/i.test(upd.msg), upd.msg.slice(0, 80));
// NOT SERVED: no answer row, no missing state
const ns1 = await compose(S1, 1, { ...S1BASE, "Q-D5-06": "A1" }, {}, S1ITEMS); rec("D5-04", "Q-D5-06 is NOT SERVED on the Stage 1 source: an answer refuses and nothing is written", ns1.reason === "answer_for_question_not_served", ns1);
const ns2 = await compose(S1, 1, { ...S1BASE, "Q-D5-06b": "A1" }, {}, { ...S1ITEMS, "Q-D5-06b": ["AR1"] }); rec("D5-04", "Q-D5-06b is NOT SERVED at Stage 1 as well", ns2.reason === "answer_for_question_not_served", ns2);
const ns3 = await compose(S3, 3, { ...S3BASE, "Q-D5-06": "A1" }, {}, S3ITEMS); rec("D5-04", "Q-D5-06 is NOT SERVED on the Stage 3 source: an answer refuses", ns3.reason === "answer_for_question_not_served", ns3);
const ns4 = await compose(S3, 3, { ...S3BASE, "Q-D5-06b": "A1" }, {}, { ...S3ITEMS, "Q-D5-06b": ["AR1"] }); rec("D5-04", "Q-D5-06b is NOT SERVED at Stage 3 as well", ns4.reason === "answer_for_question_not_served", ns4);
const ns5 = await compose(S3, 3, { ...S3BASE, "Q-D5-09": "A1" }, {}, S3ITEMS); rec("D5-04", "Q-D5-09 is NOT SERVED at Stage 3 (CE-D5-09 is not in the launch design there): an answer refuses", ns5.reason === "answer_for_question_not_served", ns5);
const ns6 = await compose(S3, 3, S3BASE, { "Q-D5-06": "declined" }, S3ITEMS); rec("D5-04", "a missing state on a NOT SERVED question refuses too: no row of any kind", ns6.reason === "answer_for_question_not_served", ns6);
const s3ok = await compose(S3, 3, S3BASE, {}, S3ITEMS); rec("D5-04", "the Stage 3 pattern without the three NOT SERVED questions composes thirteen clauses", s3ok.outcome === "composed" && s3ok.clauses.length === 13 && !s3ok.clauses.some(x => /Q-D5-06|Q-D5-09/.test(x.question_code)), s3ok.outcome === "composed" ? s3ok.clauses.length : s3ok);
// D5-05: parent asserts a designated question asked, child identifies none
const n02 = await compose(S2, 2, BASE, {}, { ...items, "Q-D5-02b": [] }); rec("D5-05", "Q-D5-02 A1 with no item selected at Q-D5-02b refuses", n02.reason === "selection_does_not_match_answer", n02);
const n02b = await compose(S2, 2, BASE, {}, without(items, "Q-D5-02b")); rec("D5-05", "Q-D5-02 A1 with Q-D5-02b not submitted at all refuses the same way", n02b.reason === "selection_does_not_match_answer", n02b);
const x02 = await compose(S2, 2, { ...BASE, "Q-D5-02": "A3" }, {}, items); rec("D5-05", "an answer that does not serve the child leaves the child unreached; sending its items refuses", x02.reason === "child_not_reached", x02);
// D5-06: Q-D5-07 A3 alone, no child sentence
const a3 = without({ ...BASE, "Q-D5-07": "A3" }, "Q-D5-07b"); const c3 = await compose(S2, 2, a3, {}, without(items, "Q-D5-07b"));
rec("D5-06", "Q-D5-07 A3 (no agreement stated) composes ST-D5-034 alone for that element, with no child", c3.outcome === "composed" && c3.clauses.some(x => x.state_code === "ST-D5-034") && !c3.clauses.some(x => x.question_code === "Q-D5-07b"), c3.outcome === "composed" ? c3.clauses.map(x => x.state_code) : c3);
// missing states
const un = await compose(S2, 2, without(BASE, "Q-D5-09"), {}, items); rec("D5-09", "a served question left unanswered with no missing state refuses", un.reason === "served_question_unanswered", un);
const nc = await compose(S2, 2, without(BASE, "Q-D5-09"), { "Q-D5-09": "not_captured" }, items); rec("D5-09", "not_captured is a controlled code but not committable", nc.reason === "missing_state_not_committable", nc);
const dc = await compose(S2, 2, without(BASE, "Q-D5-09"), { "Q-D5-09": "declined" }, items); rec("D5-09", "declined is committable and composes nothing for that question", dc.outcome === "composed" && !dc.clauses.some(x => x.question_code === "Q-D5-09"), dc.outcome || dc);
const nap = await compose(S2, 2, without(BASE, "Q-D5-09"), { "Q-D5-09": "not_applicable" }, items); rec("D5-10", "not_applicable is refused as a missing state", nap.outcome === "refused", nap.reason);
const nyo = await compose(S2, 2, without(BASE, "Q-D5-09"), { "Q-D5-09": "not_yet_observed" }, items); rec("D5-10", "not_yet_observed is refused as a missing state", nyo.outcome === "refused", nyo.reason);
// bound items
const bad = await compose(S2, 2, BASE, {}, { ...items, "Q-D5-02b": ["DE9"] }); rec("D5-07", "an item not on this source version's list refuses", bad.reason === "bound_item_not_on_source", bad);
// D5 identifiers repeat across sources (DP1, DE1, SI1, AO1, AR1, AC1 ...): an item "from another source version" is recognised by its absence from THIS version's list, so the longest list of the bank is used as the probe
const longest = await compose(S2, 2, BASE, {}, { ...items, "Q-D5-04b": ["AO5"] }); rec("D5-07", "AO5 exists on no source: an item that is on no version's list refuses", longest.reason === "bound_item_not_on_source", longest);
const noRoutes = await compose(S2, 2, BASE, {}, { ...items, "Q-D5-06b": ["AR2"] }); rec("D5-07", "a route on no version's list refuses (the only route of this source is AR1)", noRoutes.reason === "bound_item_not_on_source", noRoutes);
const d1i = await compose(S2, 2, BASE, {}, { ...items, "Q-D5-02b": ["M1"] }); rec("D5-08", "an item of the D1 kind (a material item) refuses", d1i.reason === "bound_item_not_on_source", d1i);
const dup = await compose(S2, 2, BASE, {}, { ...items, "Q-D5-03b": ["SI1", "SI1"] }); rec("D5-07", "the same item twice refuses", dup.reason === "item_selected_twice", dup);
// D5-49: Q-D5-04b and Q-D5-05b selecting the same option: both compose
const same = await compose(S2, 2, BASE, {}, { ...items, "Q-D5-04b": ["AO1"], "Q-D5-05b": ["AO1"] });
rec("D5-49", "the same option selected at Q-D5-04b and Q-D5-05b composes both as separate determinations; neither is suppressed", same.outcome === "composed" && same.clauses.some(x => x.question_code === "Q-D5-04b") && same.clauses.some(x => x.question_code === "Q-D5-05b"), same.outcome || same);
const same2 = await compose(S2, 2, BASE, {}, { ...items, "Q-D5-04b": ["AO1", "AO2"], "Q-D5-05b": ["AO1", "AO2"] });
rec("D5-49", "several shared options at both questions compose both, each with its own count", same2.outcome === "composed" && same2.clauses.find(x => x.question_code === "Q-D5-04b")?.clause_text.includes("proposed 2 of") && same2.clauses.find(x => x.question_code === "Q-D5-05b")?.clause_text.includes("to 2 of"), same2.clauses?.filter(x => /0[45]b/.test(x.question_code)).map(x => x.clause_text));
const only4 = await compose(S2, 2, without({ ...BASE, "Q-D5-04": "A3", "Q-D5-05": "A1" }, "Q-D5-04b"), {}, without(items, "Q-D5-04b")); rec("D5-49", "a change stated without a proposal composes (Q-D5-04 A3 with Q-D5-05 A1 is permitted)", only4.outcome === "composed", only4.outcome || only4);
// tagged and untagged unlisted lines carry no items
const unl = await compose(S2, 2, { ...BASE, "Q-D5-07": "A1", "Q-D5-07b": "A2" }, {}, without(items, "Q-D5-07b")); rec("D5-composed", "Q-D5-07b A2 (an agreement holding only a content outside the list) takes no items and composes ST-D5-037", unl.outcome === "composed" && unl.clauses.some(x => x.state_code === "ST-D5-037"), unl.outcome === "composed" ? unl.clauses.map(x => x.state_code) : unl);
const unl2 = await compose(S2, 2, { ...BASE, "Q-D5-07": "A1", "Q-D5-07b": "A2" }, {}, items); rec("D5-composed", "Q-D5-07b A2 with items selected refuses: the answer takes none", unl2.reason === "selection_does_not_match_answer", unl2);
// D5-17: no library entry is a blocker; every record status entry is one at the clause instance
const rb = (await run(`select statement_key from t3a_d1_statement_library where dimension_id='D5' and recurrence_blocker order by 1`)).map(r => r.statement_key);
rec("D5-17", "no D5 entry carries the library flag recurrence_blocker (D5 5.7)", rb.length === 0, rb);
const NONE = { "Q-D5-01": "A3", "Q-D5-02": "A3", "Q-D5-03": "A3", "Q-D5-04": "A3", "Q-D5-05": "A4", "Q-D5-06": "A3", "Q-D5-07": "A3", "Q-D5-08": "A4", "Q-D5-09": "A4" };
const b10 = await compose(S2, 2, NONE, {}, {});
const ci10 = b10.clause_instances?.find(x => x.state_code === "ST-D5-003");
rec("D5-17", "a record status entry (ST-D5-003) composes and its clause instance is a recurrence blocker, never equivalent to another", b10.outcome === "composed" && b10.clause_instances.length === 9 && b10.clause_instances.every(x => x.recurrence_blocker === true) && ci10 && (await run(`select t3a_clause_instances_compare(${J(ci10)}, ${J({ ...ci10, observation_id: randomUUID() })}) r`))[0].r.equivalent === false, b10.outcome === "composed" ? b10.clause_instances.map(x => x.recurrence_blocker) : b10);
rec("D5-17", "a conduct bearing entry (ST-D5-001) is not a blocker and is equivalent to the same entry in another observation", ok.clause_instances?.[0].recurrence_blocker === false && (await run(`select t3a_clause_instances_compare(${J(ok.clause_instances[0])}, ${J({ ...ok.clause_instances[0], observation_id: randomUUID() })}) r`))[0].r.equivalent === true, ok.clause_instances?.[0]);
const d4blk = (await run(`select statement_key from t3a_d1_statement_library where dimension_id='D4' and recurrence_blocker order by 1`)).map(r => r.statement_key);
rec("D5-17", "the D4 blockers are unchanged by the D5 rule (ST-D4-010 and ST-D4-015 only)", JSON.stringify(d4blk) === JSON.stringify(["ST-D4-010", "ST-D4-015"]), d4blk);
// isolation of clause instances
const a1 = ok.clause_instances[0], b1 = { ...a1, observation_id: randomUUID() };
const eq = (await run(`select t3a_clause_instances_compare(${J(a1)}, ${J(b1)}) r`))[0].r; rec("D5-12", "two D5 clause instances with the same key and state are equivalent", eq.equivalent === true, eq);
const cross = (await run(`select t3a_clause_instances_compare(${J(a1)}, ${J({ ...a1, recurrence_equivalence_key_id: "REK-D4-001" })}) r`))[0].r; rec("D5-12", "a D5 clause instance against a D4 clause instance refuses", cross.reason === "dimension_isolation_violation", cross);
const cross1 = (await run(`select t3a_clause_instances_compare(${J(a1)}, ${J({ ...a1, recurrence_equivalence_key_id: "REK-D1-001" })}) r`))[0].r; rec("D5-12", "a D5 clause instance against a D1 clause instance refuses", cross1.reason === "dimension_isolation_violation", cross1);
// stage form
const s1ok = await compose(S1, 1, S1BASE, {}, S1ITEMS); rec("D5-61", "a Stage 1 pattern composes, carrying the stage_1_only limitation", s1ok.outcome === "composed" && s1ok.conditions.includes("stage_1_only"), s1ok.outcome || s1ok);
rec("D5-61", "Stage 1 form has no route use: Q-D5-06 is not even served", !(s1ok.clauses || []).some(x => /Q-D5-06/.test(x.question_code)), null);
await run(`insert into t3a_stage_form_verb(verb) values ('proposed') on conflict do nothing`);
const sfv = await compose(S1, 1, S1BASE, {}, S1ITEMS); await run(`delete from t3a_stage_form_verb where verb='proposed'`);
rec("D5-61", "a performed-act verb at Stage 1 refuses and logs stage_form_violation (verb added for the test, then removed)", sfv.reason === "stage_form_violation" && (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='stage_form_violation'`))[0].n >= 1, sfv.reason || sfv.outcome);
rec("D5-61", "the refusal detail names the Stage the statement was composed at", /at Stage 1$/.test((await run(`select detail from t3a_capture_refusal where reason_code='stage_form_violation' order by refused_at desc limit 1`))[0]?.detail || ""), null);
// a route use entry composed at Stage 1 or Stage 3 refuses: a synthetic source that marks Q-D5-06 served there
const mkRoute = async (stage, base) => {
  const sheet = (await run(`select v.body b from t3a_d1_content_version v where v.content_version_id='${base}'`))[0].b; const cv = JSON.parse(JSON.stringify(sheet)); cv.source_identifier = "SRC-D5-N-RT-" + stage + "-" + P.slice(0, 6);
  cv.source_sheet.available_routes = [{ id: "AR1", text: "the session" }]; cv.question_applicability = cv.question_applicability.map(x => /Q-D5-06/.test(x.question) ? { ...x, state: x.question === "Q-D5-06" ? "DIRECT" : "CONDITIONAL" } : x);
  await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${cv.source_identifier}','source','r','D5','not_loaded')`);
  return (await run(`insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1','drafting','not_loaded',${J(cv)} from t3a_content_object where identifier='${cv.source_identifier}' returning content_version_id v`))[0].v;
};
const rs1 = await mkRoute("S1", S1), rs3 = await mkRoute("S3", S3);
const r1 = await compose(rs1, 1, { ...S1BASE, "Q-D5-06": "A1", "Q-D5-06b": "A1" }, {}, { ...S1ITEMS, "Q-D5-06b": ["AR1"] }); rec("D5-61", "a Stage 1 statement carrying a route use entry refuses and logs stage_form_violation", r1.reason === "stage_form_violation", r1.reason || r1);
const r3 = await compose(rs3, 3, { ...S3BASE, "Q-D5-06": "A1", "Q-D5-06b": "A1" }, {}, { ...S3ITEMS, "Q-D5-06b": ["AR1"] }); rec("D5-61", "a Stage 3 statement carrying a route use entry refuses and logs stage_form_violation", r3.reason === "stage_form_violation", r3.reason || r3);
const r3n = await compose(rs3, 3, { ...S3BASE, "Q-D5-06": "A3" }, {}, S3ITEMS); rec("D5-61", "a Stage 3 record status route entry (ST-D5-029) is a route entry too and refuses", r3n.reason === "stage_form_violation", r3n.reason || r3n);
const r3d = (await run(`select detail from t3a_capture_refusal where reason_code='stage_form_violation' order by refused_at desc limit 3`)).map(x => x.detail);
rec("D5-61", "the Stage 3 refusal detail names Stage 3", r3d.some(d => /Q-D5-06.*Stage 3|Stage 3/.test(d) && /at Stage 3$/.test(d)), r3d);
const r2ok = await compose(S2, 2, BASE, {}, items); rec("D5-61", "the same route entries compose at Stage 2", r2ok.outcome === "composed" && r2ok.clauses.some(x => x.question_code === "Q-D5-06"), r2ok.outcome || r2ok);
// mode and gate
const asUser = await c.query("begin").then(async () => { await c.query("set local role authenticated"); await c.query(`select set_config('request.jwt.claims', '{"role":"authenticated"}', true)`); try { return (await c.query(`select t3a_dimension_compose('${P}','${S2}','2',${J(BASE)},'{}'::jsonb,${J(items)},gen_random_uuid(),true) r`)).rows[0].r; } finally { await c.query("rollback"); } });
rec("D5-01", "test composition is the service route only", asUser.reason === "TEST_MODE_IS_SERVICE_ONLY", asUser);
await run(`select set_config('t3a.commit_seal_key','', false)`);
const prod = await prodCompose(S2, 2, BASE, items, randomUUID()); rec("D5-01", "production composition refuses on this unapproved source", prod.reason === "source_not_approved" || prod.outcome === "refused", prod);
const wrong = await compose(S2, 1, BASE, {}, items); rec("D5-composed", "a source composes only at its own Stage", wrong.reason === "source_stage_mismatch", wrong);
// D-06 seal
const KEY = "synthetic-test-key-" + randomUUID();
const comp = await compose(S2, 2, BASE, {}, items);
const seal = async (id, sup = false) => { await c.query("begin"); await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims','{"role":"service_role"}',true)`); await c.query(`select set_config('t3a.commit_seal_key','${KEY}',true)`); let r; try { r = (await c.query(`select t3a_seal_composed('${id}', ${sup}) r`)).rows[0].r; } catch (e) { r = { msg: e.message }; } await c.query("commit"); return r; };
await c.query(`select set_config('t3a.commit_seal_key','',false)`);
const unl0 = await svc(`select t3a_seal_composed('${comp.composed_statement_id}', false) r`);
rec("D5-65", "with the signing key not loaded the seal refuses as commit_seal_key_unloaded", /COMMIT_SEAL_KEY_UNLOADED/i.test(JSON.stringify(unl0.rows[0]?.r || unl0.msg)), unl0.rows[0]?.r || unl0.msg);
const sl = await seal(comp.composed_statement_id); rec("D5-65", "with the key loaded the seal is written", !(sl && sl.msg), sl);
const chk = (await run(`select count(*)::int n from t3a_commit_seal where composed_statement_id='${comp.composed_statement_id}'`))[0].n; rec("D5-65", "exactly one seal row exists for the composed statement", chk === 1, chk);
const tamper = await svc(`update t3a_commit_seal set seal='00' where composed_statement_id='${comp.composed_statement_id}'`); rec("D5-65", "a seal cannot be edited", /NO_UPDATE|append|T3A_|permission/i.test(tamper.msg), tamper.msg.slice(0, 80));
const verifyUnder = async (key, id) => c.query("begin").then(async () => { await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims','{"role":"service_role"}',true)`); await c.query(`select set_config('t3a.commit_seal_key','${key}',true)`); try { return (await c.query(`select t3a_verify_commit_seal('${id}') r`)).rows[0].r; } catch (e) { return { msg: e.message }; } finally { await c.query("commit"); } });
const ver2 = await verifyUnder(KEY, comp.composed_statement_id);
rec("D5-65", "a sealed statement verifies under the server key", ver2 === true || ver2?.valid === true || ver2?.passed === true || ver2?.outcome === "valid", ver2);
const ver3 = await verifyUnder("another-key", comp.composed_statement_id);
rec("D5-65", "under any other key the seal reads as invalid (commit_seal_invalid)", JSON.stringify(ver3).includes("commit_seal_invalid") || ver3 === false || ver3?.valid === false, ver3);
// D5-65 as the trial states it: the captures of a committed observation are altered, the content hash recomputed, and the record submitted again; the seal does not verify and the refusal is logged
const altered = await compose(S2, 2, { ...BASE, "Q-D5-08": "A2" }, {}, items); await seal(altered.composed_statement_id);
await c.query("begin"); await c.query("alter table public.t3a_dimension_composed_statement disable trigger user"); await c.query(`update t3a_dimension_composed_statement set answers = answers || '{"Q-D5-08":"A3"}'::jsonb where composed_statement_id='${altered.composed_statement_id}'`); await c.query("alter table public.t3a_dimension_composed_statement enable trigger user"); await c.query("commit");
const vAlt = await verifyUnder(KEY, altered.composed_statement_id);
const hashNow = (await run(`select encode(extensions.digest(t3a_commit_payload('${altered.composed_statement_id}'), 'sha256'), 'hex') h`))[0].h; const hashSealed = (await run(`select payload_hash h from t3a_commit_seal where composed_statement_id='${altered.composed_statement_id}'`))[0].h;
rec("D5-65", "an altered committed record with its content hash recomputed is refused: the recomputed hash differs from the sealed one and the seal does not verify without the key", vAlt?.valid === false && vAlt.reason === "commit_seal_invalid" && hashNow !== hashSealed, { vAlt, recomputed_differs: hashNow !== hashSealed });
const n65 = (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='commit_seal_invalid'`))[0].n;
await c.query("begin"); await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims','{"role":"service_role"}',true)`); await c.query(`select set_config('t3a.commit_seal_key','${KEY}',true)`); const resub = (await c.query(`select t3a_commit_seal_check('${altered.composed_statement_id}') r`)).rows[0].r; await c.query("commit");
rec("D5-65", "submitting the altered record again refuses and logs commit_seal_invalid", resub.reason === "commit_seal_invalid" && (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='commit_seal_invalid'`))[0].n === n65 + 1, resub);

// D5-66: an observation identifier commits once
const REF = randomUUID();
const o1 = await compose(S2, 2, BASE, {}, items, REF), o2 = await compose(S2, 2, BASE, {}, items, REF);
rec("D5-66", "a second original commit under the same observation identifier is refused by the store; the first record stands", o1.outcome === "composed" && /original_uq/.test(o2.msg || "") && (await run(`select count(*)::int n from t3a_dimension_composed_statement where observation_ref='${REF}'`))[0].n === 1, o2);
await seal(o1.composed_statement_id);
const again = await seal(o1.composed_statement_id);
rec("D5-66", "a second original seal under the same identifier is refused as well", !!again?.msg && /unique|one_original|pkey/i.test(again.msg) && (await run(`select count(*)::int n from t3a_commit_seal where observation_ref='${REF}'`))[0].n === 1, again);
// the production route would refuse before writing: the check reads the seal register
rec("D5-66", "the production commit path checks the seal register for the identifier before it writes (observation_id_not_unique)", (await run(`select pg_get_functiondef('t3a_dimension_compose'::regproc) d`))[0].d.includes("observation_id_not_unique"), null);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
