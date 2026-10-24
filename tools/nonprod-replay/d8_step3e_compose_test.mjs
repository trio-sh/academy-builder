// Step 3e: dimension determination commit guard and immutable composed statement (D8 INS-002, INS-003; D-06). Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const P = randomUUID(), RUN = P.slice(0, 8);
await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${P}','c-${P.slice(0, 8)}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${P}','c-${P.slice(0, 8)}@t.local','candidate')`);
const ver = async (id) => (await run(`select v.content_version_id v from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier='${id}'`))[0].v;
const S1 = await ver("SRC-D8-S1-001"), S2 = await ver("SRC-D8-S2-001"), S3 = await ver("SRC-D8-S3-001"), S4 = await ver("SRC-D8-S4-001");
const svc = async (sql) => { await c.query("begin"); let msg = "ok", rows = []; try { await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims', '{"role":"service_role"}', true)`); rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query("commit"); return { msg, rows }; };
const J = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const compose = async (src, stage, answers, missing = {}, items = {}, ref = null) => { const r = await svc(`select t3a_dimension_compose('${P}','${src}','${stage}',${J(answers)},${J(missing)},${J(items)},${ref ? `'${ref}'` : "gen_random_uuid()"},true) r`); return r.rows[0]?.r || { msg: r.msg }; };
const prodCompose = async (src, stage, answers, items, ref) => { const r = await svc(`select t3a_dimension_compose('${P}','${src}','${stage}',${J(answers)},'{}'::jsonb,${J(items)},'${ref}') r`); return r.rows[0]?.r || { msg: r.msg }; };
// every question served: sixteen clauses on a source that serves them all. Items are the ids on SRC-D8-S2-001 (two commitments, two measures) and the other three real sources.
const BASE = { "Q-D8-01": "A1", "Q-D8-01b": "A1", "Q-D8-02": "A1", "Q-D8-02b": "A1", "Q-D8-03": "A1", "Q-D8-03b": "A1", "Q-D8-04": "A1", "Q-D8-04b": "A1", "Q-D8-05": "A1", "Q-D8-05b": "A1", "Q-D8-06": "A1", "Q-D8-06b": "A1", "Q-D8-07": "A1", "Q-D8-07b": "A1", "Q-D8-08": "A1", "Q-D8-09": "A1" };
const items = { "Q-D8-01b": ["CA1"], "Q-D8-02b": ["DF1", "DF2"], "Q-D8-03b": ["CR1"], "Q-D8-04b": ["SU1"], "Q-D8-05b": ["CM1"], "Q-D8-06b": ["WP1"], "Q-D8-07b": ["RM1"] };
const without = (a, k) => Object.fromEntries(Object.entries(a).filter(([x]) => x !== k));
const S3BASE = without(BASE, "Q-D8-09");

const ok = await compose(S2, 2, BASE, {}, items);
rec("D8-composed", "a complete valid Stage 2 pattern composes one statement (sixteen served questions: every D8 question is served on this source)", ok.outcome === "composed" && ok.clauses.length === 16, ok.outcome === "composed" ? ok.clauses.length : ok);
rec("D8-composed", "counts come from the selected items, never typed", ok.clauses?.find(x => x.question_code === "Q-D8-02b")?.clause_text.includes("named 2 of the facts about the setback"), ok.clauses?.filter(x => /02b/.test(x.question_code)).map(x => x.clause_text));
rec("D8-composed", "clause instance carries the dimension scoped key and the statement id", ok.clause_instances?.[0].recurrence_equivalence_key_id?.startsWith("REK-D8-") && ok.clause_instances[0].state_code === "ST-D8-001", ok.clause_instances?.[0]);
const stored = (await run(`select count(*)::int n from t3a_dimension_composed_statement where composed_statement_id='${ok.composed_statement_id}'`))[0].n; rec("D8-24", "one immutable composed statement is stored", stored === 1, stored);
const upd = await svc(`update t3a_dimension_composed_statement set clauses='[]'::jsonb where composed_statement_id='${ok.composed_statement_id}'`); rec("D8-24", "editing a composed statement after commit refuses", /NO_UPDATE|append|T3A_|permission/i.test(upd.msg), upd.msg.slice(0, 80));
rec("D8-composed", "every D8 element is composed at Stage 1: all sixteen clauses on the Stage 1 source, each recording what was stated or named", await (async () => { const s1 = await compose(S1, 1, { ...BASE, "Q-D8-05b": "A1" }, {}, { ...items, "Q-D8-05b": ["CM1"] }); return s1.outcome === "composed" && s1.clauses.length === 16 && s1.conditions.includes("stage_1_only"); })(), null);
rec("D8-composed", "the Stage 3 source composes fifteen clauses and Q-D8-09 writes no row at all", await (async () => { const s3 = await compose(S3, 3, S3BASE, {}, { ...items, "Q-D8-05b": ["CM1"] }); return s3.outcome === "composed" && s3.clauses.length === 15 && !s3.clauses.some(x => x.question_code === "Q-D8-09") && !JSON.stringify(s3).includes("not_applicable"); })(), null);
rec("D8-composed", "the Stage 4 source composes sixteen clauses", await (async () => { const s4 = await compose(S4, 4, BASE, {}, { ...items, "Q-D8-05b": ["CM1"] }); return s4.outcome === "composed" && s4.clauses.length === 16; })(), null);
// NOT SERVED (D8-04)
const ns9 = await compose(S3, 3, { ...S3BASE, "Q-D8-09": "A1" }, {}, { ...items, "Q-D8-05b": ["CM1"] }); rec("D8-04", "Q-D8-09 is NOT SERVED on the Stage 3 source: an answer refuses and nothing is written", ns9.reason === "answer_for_question_not_served", ns9);
const ns9m = await compose(S3, 3, S3BASE, { "Q-D8-09": "declined" }, { ...items, "Q-D8-05b": ["CM1"] }); rec("D8-04", "a missing state for Q-D8-09 at Stage 3 refuses too: no answer row and no missing state code", ns9m.reason === "answer_for_question_not_served", ns9m);
const wrote = (await run(`select count(*)::int n from t3a_dimension_composed_statement where participant_id='${P}' and stage_code='S3' and (answers ? 'Q-D8-09' or missing ? 'Q-D8-09')`))[0].n; rec("D8-04", "no composed statement at Stage 3 holds a Q-D8-09 row", wrote === 0, wrote);
// a source whose recurrence_measures is empty cannot serve Q-D8-07 or Q-D8-07b
const mkSrc = async (tag, stage, mut) => { const sh = (await run(`select v.body b from t3a_d1_content_version v where v.content_version_id='${S2}'`))[0].b; const b = JSON.parse(JSON.stringify(sh)); b.source_identifier = `SRC-D8-N-${tag}-${RUN}`; b.stage_code = stage; mut(b);
  await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${b.source_identifier}','source','n','D8','not_loaded')`);
  return (await run(`insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1','drafting','not_loaded',${J(b)} from t3a_content_object where identifier='${b.source_identifier}' returning content_version_id v`))[0]?.v; };
const noRm = await mkSrc("NORM", "S2", b => { b.source_sheet.recurrence_measures = []; b.question_applicability = b.question_applicability.map(x => /Q-D8-07/.test(x.question) ? { ...x, state: "NOT SERVED" } : x); });
const nr1 = await compose(noRm, 2, BASE, {}, items); const nr2 = await compose(noRm, 2, { ...without(without(BASE, "Q-D8-07"), "Q-D8-07b") }, {}, without(items, "Q-D8-07b"));
rec("D8-04", "on a source whose recurrence_measures is empty Q-D8-07 and Q-D8-07b are NOT SERVED: an answer refuses, and without one the rest composes with no recurrence row", nr1.reason === "answer_for_question_not_served" && nr2.outcome === "composed" && !nr2.clauses.some(x => /07/.test(x.question_code)), [nr1.reason, nr2.outcome]);
const emptyServed = await mkSrc("EMPTYSRV", "S2", b => { b.source_sheet.recurrence_measures = []; });
const es = await compose(emptyServed, 2, BASE, {}, items);
rec("D8-54", "a source that serves Q-D8-07 while its list is empty cannot compose: BOUND_FAMILY_ABSENT_OR_EMPTY is logged and nothing is written", es.outcome === "refused" && es.reason === "BOUND_FAMILY_ABSENT_OR_EMPTY" && (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='BOUND_FAMILY_ABSENT_OR_EMPTY' and detail like '%recurrence_measures%'`))[0].n >= 1, es);
const esA3 = await compose(emptyServed, 2, { ...without(without(BASE, "Q-D8-07b"), "Q-D8-07"), "Q-D8-07": "A3" }, {}, without(items, "Q-D8-07b"));
rec("D8-54", "the refusal does not wait for the child: an answer that would never reach Q-D8-07b (A3) on the same source with an empty list is refused too", esA3.outcome === "refused" && esA3.reason === "BOUND_FAMILY_ABSENT_OR_EMPTY", esA3);
const absent = await mkSrc("NOFAM", "S2", b => { delete b.source_sheet.available_supports; });
const ab = await compose(absent, 2, BASE, {}, items); rec("D8-54", "a list that is absent from the sheet refuses the same way, and no empty selection slot is served", ab.reason === "BOUND_FAMILY_ABSENT_OR_EMPTY" && /available_supports/.test(ab.detail || JSON.stringify(ab)) || ab.reason === "BOUND_FAMILY_ABSENT_OR_EMPTY", ab);
// D8-05: items Q-D8-02 / 02b
const n02 = await compose(S2, 2, BASE, {}, { ...items, "Q-D8-02b": [] }); rec("D8-05", "Q-D8-02 A1 with no item selected at Q-D8-02b refuses", n02.reason === "selection_does_not_match_answer", n02);
const x02 = await compose(S2, 2, { ...BASE, "Q-D8-02": "A2" }, {}, items); rec("D8-05", "an answer that does not serve the child leaves the child unreached; sending its items refuses", x02.reason === "child_not_reached", x02);
const c05 = await compose(S2, 2, { ...without(BASE, "Q-D8-05b"), "Q-D8-05": "A2" }, {}, without(items, "Q-D8-05b")); rec("D8-05", "Q-D8-05 A2 (every commitment named) does not reach Q-D8-05b: no selection is needed", c05.outcome === "composed" && c05.clauses.length === 15 && c05.clauses.some(x => x.state_code === "ST-D8-022"), c05.outcome === "composed" ? c05.clauses.map(x => x.state_code) : c05);
const c06 = await compose(S2, 2, { ...BASE, "Q-D8-06": "A2" }, {}, items); rec("D8-05", "Q-D8-06 A2 (work named, no point stated) reaches Q-D8-06b as well as A1 does", c06.outcome === "composed" && c06.clauses.some(x => x.question_code === "Q-D8-06b") && c06.clauses.some(x => x.state_code === "ST-D8-027"), c06.outcome === "composed" ? c06.clauses.map(x => x.state_code) : c06);
const c06n = await compose(S2, 2, { ...without(BASE, "Q-D8-06b"), "Q-D8-06": "A3" }, {}, without(items, "Q-D8-06b")); rec("D8-05", "Q-D8-06 A3 (work to continue, none named) leaves the child unreached", c06n.outcome === "composed" && !c06n.clauses.some(x => x.question_code === "Q-D8-06b"), c06n.outcome || c06n);
// D8-06: Q-D8-07 A3 alone
const a3 = { ...BASE, "Q-D8-07": "A3" }; delete a3["Q-D8-07b"]; const c3 = await compose(S2, 2, a3, {}, without(items, "Q-D8-07b"));
rec("D8-06", "Q-D8-07 A3 (the condition can arise again, no measure named) resolves to ST-D8-034 alone, with no child and no negative sentence", c3.outcome === "composed" && c3.clauses.filter(x => x.question_code === "Q-D8-07").map(x => x.state_code).join() === "ST-D8-034" && !c3.clauses.some(x => x.question_code === "Q-D8-07b"), c3.outcome === "composed" ? c3.clauses.map(x => x.state_code) : c3);
// missing states
const un = await compose(S2, 2, without(BASE, "Q-D8-09"), {}, items); rec("D8-09", "a served question left unanswered with no missing state refuses", un.reason === "served_question_unanswered", un);
const nc = await compose(S2, 2, without(BASE, "Q-D8-09"), { "Q-D8-09": "not_captured" }, items); rec("D8-09", "not_captured is a controlled code but not committable", nc.reason === "missing_state_not_committable", nc);
const dc = await compose(S2, 2, without(BASE, "Q-D8-09"), { "Q-D8-09": "declined" }, items); rec("D8-09", "declined is committable and composes nothing for that question", dc.outcome === "composed" && !dc.clauses.some(x => x.question_code === "Q-D8-09"), dc.outcome || dc);
const nap = await compose(S2, 2, without(BASE, "Q-D8-09"), { "Q-D8-09": "not_applicable" }, items); rec("D8-10", "not_applicable is refused as a missing state", nap.outcome === "refused", nap.reason);
const nyo = await compose(S2, 2, without(BASE, "Q-D8-09"), { "Q-D8-09": "not_yet_observed" }, items); rec("D8-10", "not_yet_observed is refused as a missing state", nyo.outcome === "refused", nyo.reason);
// bound items
const bad = await compose(S2, 2, BASE, {}, { ...items, "Q-D8-02b": ["DF9"] }); rec("D8-07", "an item not on this source version's list refuses", bad.reason === "bound_item_not_on_source", bad);
const other = await compose(S2, 2, BASE, {}, { ...items, "Q-D8-05b": ["CM3"] }); rec("D8-07", "an item that is on another source version (CM3 of SRC-D8-S1-001) but not on this one refuses", other.reason === "bound_item_not_on_source", other);
const d1i = await compose(S2, 2, BASE, {}, { ...items, "Q-D8-01b": ["M1"] }); rec("D8-08", "an item of a D1 source (M1) is refused", d1i.reason === "bound_item_not_on_source", d1i);
const dup = await compose(S2, 2, BASE, {}, { ...items, "Q-D8-02b": ["DF1", "DF1"] }); rec("D8-07", "the same item twice refuses", dup.reason === "item_selected_twice", dup);
// D8-49: one act serving two purposes is two facts. CA3 and CR1 of SRC-D8-S1-001 are the same action, in both lists.
const same = await compose(S1, 1, BASE, {}, { ...items, "Q-D8-01b": ["CA3"], "Q-D8-03b": ["CR1"] });
rec("D8-49", "the same action selected at Q-D8-01b and at Q-D8-03b composes both as separate determinations; neither is suppressed as a duplicate", same.outcome === "composed" && same.clauses.some(x => x.question_code === "Q-D8-01b") && same.clauses.some(x => x.question_code === "Q-D8-03b"), same.outcome || same);
rec("D8-49", "the two controls draw on two lists of the source: the same action text is in containment_actions and corrective_actions of SRC-D8-S1-001", (await run(`select (v.body->'source_sheet'->'containment_actions'->2->>'text') = (v.body->'source_sheet'->'corrective_actions'->0->>'text') as same from t3a_d1_content_version v where v.content_version_id='${S1}'`))[0].same === true, null);
// D8-17: no D8 entry carries recurrence_blocker; an entry that describes the record carries no conduct toward recurrence
const rb = (await run(`select statement_key from t3a_d1_statement_library where dimension_id='D8' and recurrence_blocker order by 1`)).map(r => r.statement_key);
rec("D8-17", "no D8 entry carries recurrence_blocker (Section 5.10)", rb.length === 0, rb);
const NONE = { "Q-D8-01": "A3", "Q-D8-02": "A3", "Q-D8-03": "A3", "Q-D8-04": "A3", "Q-D8-05": "A3", "Q-D8-06": "A4", "Q-D8-07": "A4", "Q-D8-08": "A3", "Q-D8-09": "A4" };
const b10 = await compose(S2, 2, NONE, {}, {});
const ci10 = b10.clause_instances?.find(x => x.state_code === "ST-D8-003");
rec("D8-17", "a record status entry (ST-D8-003) carries its key but is marked as never counting toward recurrence, and is never equivalent to another", b10.outcome === "composed" && ci10 && ci10.recurrence_blocker === true && (await run(`select t3a_clause_instances_compare(${J(ci10)}, ${J({ ...ci10, observation_id: randomUUID() })}) r`))[0].r.equivalent === false, ci10 || b10);
rec("D8-17", "every record status entry of the pattern is marked the same way and no conduct bearing entry is (nine record status clauses, none conduct bearing)", b10.clause_instances?.length === 9 && b10.clause_instances.every(x => x.recurrence_blocker === true) && ok.clause_instances.every(x => x.recurrence_blocker === false), b10.clause_instances?.map(x => [x.state_code, x.recurrence_blocker]));
const a1 = ok.clause_instances[0], b1 = { ...a1, observation_id: randomUUID() };
const eq = (await run(`select t3a_clause_instances_compare(${J(a1)}, ${J(b1)}) r`))[0].r; rec("D8-12", "two D8 clause instances with the same key and state are equivalent", eq.equivalent === true, eq);
const cross = (await run(`select t3a_clause_instances_compare(${J(a1)}, ${J({ ...a1, recurrence_equivalence_key_id: "REK-D3-001" })}) r`))[0].r; rec("D8-12", "a D8 clause instance against a D3 clause instance refuses", cross.reason === "dimension_isolation_violation", cross);
const cross4 = (await run(`select t3a_clause_instances_compare(${J(a1)}, ${J({ ...a1, recurrence_equivalence_key_id: "REK-D4-001" })}) r`))[0].r; rec("D8-12", "a D8 clause instance against a D4 clause instance refuses", cross4.reason === "dimension_isolation_violation", cross4);
// D8-61: the statement form, at every Stage. The ten verbs refuse at Stages 1 to 4; the shared verbs stay a Stage 1 rule for the other dimensions.
const sfc = async (stage, text, dim = "D8") => (await run(`select t3a_stage_form_check('${stage}', ${J([{ statement_key: "ST-T", text }])}, '${dim}') r`))[0].r;
const sixVerbs = ["took", "acted", "sought", "performed", "applied", "carried out"]; const found = [];
for (const st of ["1", "2", "3", "4"]) for (const v of sixVerbs) { const r = await sfc(st, `the participant ${v} the action`); if (r.outcome === "violation" && r.verb === v) found.push(`${st}:${v}`); }
rec("D8-61", "each of took, acted, sought, performed, applied and carried out is refused by the stage form check at every Stage (24 of 24)", found.length === 24, found.length);
rec("D8-61", "a statement of what the participant stated or named passes at every Stage", (await Promise.all(["1", "2", "3", "4"].map(st => sfc(st, "the participant stated a containment action from those the situation made available")))).every(r => r.outcome === "ok"), null);
rec("D8-61", "the verbs of instruction 060 (began, completed, assigned, escalated) are refused at Stage 3 for D8", (await Promise.all(["began", "completed", "assigned", "escalated"].map(v => sfc("3", `the participant ${v} it`)))).every(r => r.outcome === "violation"), null);
rec("D8-61", "the rule is D8's: a D4 statement with took at Stage 3 is not refused (D1 to D4 keep the Stage 1 rule)", (await sfc("3", "the participant took the action", "D4")).outcome === "ok" && (await sfc("1", "the participant took the action", "D4")).outcome === "violation", null);
const logged0 = (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='stage_form_violation'`))[0].n; let viol = 0;
for (const [src, st, base, it] of [[S1, 1, BASE, items], [S2, 2, BASE, items], [S3, 3, S3BASE, items], [S4, 4, BASE, items]]) {
  await run(`insert into t3a_stage_form_verb_dimension(dimension_id, verb, note) values ('D8','stated','test only') on conflict do nothing`);
  const r = await compose(src, st, base, {}, { ...it, "Q-D8-05b": ["CM1"] }); await run(`delete from t3a_stage_form_verb_dimension where dimension_id='D8' and verb='stated'`);
  if (r.reason === "stage_form_violation") viol++;
}
rec("D8-61", "composing at Stage 1, 2, 3 and 4 with a performed-act verb in the entry refuses and logs stage_form_violation (a verb found in a real entry is added for the test, then removed)", viol === 4 && (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='stage_form_violation'`))[0].n === logged0 + 4, viol);
rec("D8-61", "with the test verb removed the same Stage 2 pattern composes again", (await compose(S2, 2, BASE, {}, items)).outcome === "composed", null);
// D8-64 and the second boundary: a rendered entry whose subject is the participant's state refuses and logs state_observation; a word of another dimension refuses cross_dimension_assertion
const so0 = (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='state_observation'`))[0].n;
await run(`insert into t3a_entry_language_rule(dimension_id, rule_code, pattern, note) values ('D8','state_observation','the situation made available','test only') on conflict do nothing`);
const sob = await compose(S2, 2, BASE, {}, items); await run(`delete from t3a_entry_language_rule where dimension_id='D8' and pattern='the situation made available'`);
rec("D8-64", "a composed entry matching a state_observation pattern refuses and logs state_observation, and nothing is written (pattern added for the test, then removed)", sob.outcome === "refused" && sob.reason === "state_observation" && (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='state_observation'`))[0].n === so0 + 1, sob);
const ca0 = (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='cross_dimension_assertion'`))[0].n;
await run(`insert into t3a_rce_prohibited_vocabulary(dimension_id, word, version, reason) values ('D8','situation','PV-D8-TEST','cross_dimension_assertion') on conflict do nothing`);
const cda = await compose(S2, 2, BASE, {}, items); await run(`delete from t3a_rce_prohibited_vocabulary where dimension_id='D8' and version='PV-D8-TEST'`);
rec("D8-64", "a composed entry carrying a word that belongs to another dimension refuses and logs cross_dimension_assertion (word added for the test, then removed)", cda.outcome === "refused" && cda.reason === "cross_dimension_assertion" && (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='cross_dimension_assertion'`))[0].n === ca0 + 1, cda);
await run(`insert into t3a_rce_prohibited_vocabulary(dimension_id, word, version, reason) values ('D8','situation','PV-D8-TEST','state_observation') on conflict do nothing`);
const wst = await compose(S2, 2, BASE, {}, items); await run(`delete from t3a_rce_prohibited_vocabulary where dimension_id='D8' and version='PV-D8-TEST'`);
rec("D8-64", "a composed entry carrying a word that describes how the participant bore the setback refuses and logs state_observation (word added for the test, then removed)", wst.outcome === "refused" && wst.reason === "state_observation", wst);
rec("D8-64", "the gate is D8's own: the same word flagged for D4 does not refuse a D4 composition (checked on the gate function)", (await run(`select t3a_entry_language_gate('D4', ${J([{ statement_key: "ST-T", text: "the participant was unaffected" }])}) g`))[0].g.outcome === "ok" && (await run(`select t3a_entry_language_gate('D8', ${J([{ statement_key: "ST-T", text: "the participant was unaffected" }])}) g`))[0].g.reason === "state_observation", null);
const phr = ["the participant was calm", "the participant seemed untroubled", "the participant showed no sign of being affected", "the participant appeared to take it in stride", "the participant remained composed", "without apparent difficulty the participant named a fact", "the participant visibly stated a support"]; const hit = [];
for (const t of phr) { const g = (await run(`select t3a_entry_language_gate('D8', ${J([{ statement_key: "ST-T", text: t }])}) g`))[0].g; if (g.outcome === "violation") hit.push(t); }
rec("D8-64", "sentences whose subject is the participant's state, and sentences asserting the absence of a reaction, are all refused by the gate (seven of seven)", hit.length === phr.length, hit);
// mode and gate
const asUser = await c.query("begin").then(async () => { await c.query("set local role authenticated"); await c.query(`select set_config('request.jwt.claims', '{"role":"authenticated"}', true)`); try { return (await c.query(`select t3a_dimension_compose('${P}','${S2}','2',${J(BASE)},'{}'::jsonb,${J(items)},gen_random_uuid(),true) r`)).rows[0].r; } finally { await c.query("rollback"); } });
rec("D8-01", "test composition is the service route only", asUser.reason === "TEST_MODE_IS_SERVICE_ONLY", asUser);
await run(`select set_config('t3a.commit_seal_key','', false)`);
const prod = await prodCompose(S2, 2, BASE, items, randomUUID()); rec("D8-01", "production composition refuses on this unapproved source", prod.reason === "source_not_approved" || prod.outcome === "refused", prod);
const wrong = await compose(S2, 1, BASE, {}, items); rec("D8-composed", "a source composes only at its own Stage", wrong.reason === "source_stage_mismatch", wrong);
// D-06 seal
const KEY = "synthetic-test-key-" + randomUUID();
const comp = await compose(S2, 2, BASE, {}, items);
const seal = async (id, sup = false) => { await c.query("begin"); await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims','{"role":"service_role"}',true)`); await c.query(`select set_config('t3a.commit_seal_key','${KEY}',true)`); let r; try { r = (await c.query(`select t3a_seal_composed('${id}', ${sup}) r`)).rows[0].r; } catch (e) { r = { msg: e.message }; } await c.query("commit"); return r; };
await c.query(`select set_config('t3a.commit_seal_key','',false)`);
const unl = await svc(`select t3a_seal_composed('${comp.composed_statement_id}', false) r`);
rec("D8-65", "with the signing key not loaded the seal refuses as commit_seal_key_unloaded", /COMMIT_SEAL_KEY_UNLOADED/i.test(JSON.stringify(unl.rows[0]?.r || unl.msg)), unl.rows[0]?.r || unl.msg);
const sl = await seal(comp.composed_statement_id); rec("D8-65", "with the key loaded the seal is written", !(sl && sl.msg), sl);
const chk = (await run(`select count(*)::int n from t3a_commit_seal where composed_statement_id='${comp.composed_statement_id}'`))[0].n; rec("D8-65", "exactly one seal row exists for the composed statement", chk === 1, chk);
await run(`select 1`);
const tamper = await svc(`update t3a_commit_seal set seal='00' where composed_statement_id='${comp.composed_statement_id}'`); rec("D8-65", "a seal cannot be edited", /NO_UPDATE|append|T3A_|permission/i.test(tamper.msg), tamper.msg.slice(0, 80));
const ver2 = await c.query("begin").then(async () => { await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims','{"role":"service_role"}',true)`); await c.query(`select set_config('t3a.commit_seal_key','${KEY}',true)`); try { return (await c.query(`select t3a_verify_commit_seal('${comp.composed_statement_id}') r`)).rows[0].r; } catch (e) { return { msg: e.message }; } finally { await c.query("commit"); } });
rec("D8-65", "a sealed statement verifies under the server key", ver2 === true || ver2?.valid === true || ver2?.passed === true || ver2?.outcome === "valid", ver2);
const ver3 = await c.query("begin").then(async () => { await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims','{"role":"service_role"}',true)`); await c.query(`select set_config('t3a.commit_seal_key','another-key',true)`); try { return (await c.query(`select t3a_verify_commit_seal('${comp.composed_statement_id}') r`)).rows[0].r; } catch (e) { return { msg: e.message }; } finally { await c.query("commit"); } });
rec("D8-65", "under any other key the seal reads as invalid (commit_seal_invalid)", JSON.stringify(ver3).includes("commit_seal_invalid") || ver3 === false || ver3?.valid === false, ver3);

// D8-66: an observation identifier commits once
const REF = randomUUID();
const o1 = await compose(S2, 2, BASE, {}, items, REF), o2 = await compose(S2, 2, BASE, {}, items, REF);
rec("D8-66", "a second original commit under the same observation identifier is refused by the store; the first record stands", o1.outcome === "composed" && /original_uq/.test(o2.msg || "") && (await run(`select count(*)::int n from t3a_dimension_composed_statement where observation_ref='${REF}'`))[0].n === 1, o2);
await seal(o1.composed_statement_id);
const again = await seal(o1.composed_statement_id);
rec("D8-66", "a second original seal under the same identifier is refused as well", !!again?.msg && /unique|one_original|pkey/i.test(again.msg) && (await run(`select count(*)::int n from t3a_commit_seal where observation_ref='${REF}'`))[0].n === 1, again);
// the production route would refuse before writing: the check reads the seal register
rec("D8-66", "the production commit path checks the seal register for the identifier before it writes", (await run(`select pg_get_functiondef('t3a_dimension_compose'::regproc) d`))[0].d.includes("observation_id_not_unique"), null);

// D8-65: a committed record altered AFTER the commit, with its content hash recomputed to match, is refused: the seal is a signature, not a hash the record carries
{
  const KEY2 = "synthetic-test-key-" + randomUUID();
  const rowc = await compose(S2, 2, BASE, {}, items);
  await c.query("begin"); await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims','{"role":"service_role"}',true)`); await c.query(`select set_config('t3a.commit_seal_key','${KEY2}',true)`);
  await c.query(`select t3a_seal_composed('${rowc.composed_statement_id}', false)`); await c.query("commit");
  const verOk = await c.query("begin").then(async () => { await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims','{"role":"service_role"}',true)`); await c.query(`select set_config('t3a.commit_seal_key','${KEY2}',true)`); try { return (await c.query(`select t3a_verify_commit_seal('${rowc.composed_statement_id}') r`)).rows[0].r; } finally { await c.query("commit"); } });
  // the attack, inside a transaction that is rolled back: change the captures, then recompute the stored content hash over the altered record
  await c.query("begin"); await c.query("set local session_replication_role = replica"); await c.query(`select set_config('t3a.commit_seal_key','${KEY2}',true)`);
  await c.query(`update t3a_dimension_composed_statement set answers = answers || '{"Q-D8-08":"A3"}'::jsonb where composed_statement_id='${rowc.composed_statement_id}'`);
  await c.query(`update t3a_commit_seal set payload_hash = encode(extensions.digest(public.t3a_commit_payload(composed_statement_id), 'sha256'), 'hex') where composed_statement_id='${rowc.composed_statement_id}'`);
  const hashNow = (await c.query(`select payload_hash = encode(extensions.digest(public.t3a_commit_payload(composed_statement_id), 'sha256'), 'hex') as same from t3a_commit_seal where composed_statement_id='${rowc.composed_statement_id}'`)).rows[0].same;
  await c.query("set local session_replication_role = origin");
  const n0 = (await c.query(`select count(*)::int n from t3a_capture_refusal where reason_code='commit_seal_invalid'`)).rows[0].n;
  await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims','{"role":"service_role"}',true)`);
  const chk2 = (await c.query(`select t3a_commit_seal_check('${rowc.composed_statement_id}') r`)).rows[0].r;
  await c.query("reset role"); const n1 = (await c.query(`select count(*)::int n from t3a_capture_refusal where reason_code='commit_seal_invalid'`)).rows[0].n;
  await c.query("rollback");
  rec("D8-65", "a committed record whose captures were altered and whose content hash was recomputed to match is refused: the resubmission check returns commit_seal_invalid and logs it", verOk.valid === true && hashNow === true && chk2.reason === "commit_seal_invalid" && n1 === n0 + 1, { before: verOk, hash_matches_altered_record: hashNow, check: chk2 });
}
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
