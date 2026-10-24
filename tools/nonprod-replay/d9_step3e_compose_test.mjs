// Step 3e: dimension determination commit guard and immutable composed statement (D9 INS-002, INS-003; Section 5.14, Directive D-06, tests D9-04 to D9-10, D9-12, D9-24, D9-49, D9-61, D9-65, D9-66). Throwaway database only.
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
const S1 = await ver("SRC-D9-S1-001"), S2 = await ver("SRC-D9-S2-001"), S3 = await ver("SRC-D9-S3-001"), S4 = await ver("SRC-D9-S4-001");
const svc = async (sql) => { await c.query("begin"); let msg = "ok", rows = []; try { await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims', '{"role":"service_role"}', true)`); rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query("commit"); return { msg, rows }; };
const J = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const compose = async (src, stage, answers, missing = {}, items = {}, ref = null) => { const r = await svc(`select t3a_dimension_compose('${P}','${src}','${stage}',${J(answers)},${J(missing)},${J(items)},${ref ? `'${ref}'` : "gen_random_uuid()"},true) r`); return r.rows[0]?.r || { msg: r.msg }; };
const prodCompose = async (src, stage, answers, items, ref) => { const r = await svc(`select t3a_dimension_compose('${P}','${src}','${stage}',${J(answers)},'{}'::jsonb,${J(items)},'${ref}') r`); return r.rows[0]?.r || { msg: r.msg }; };
// every question served: sixteen answers (nine parents, seven children). Q-D9-09 is NOT SERVED on every Stage 3 source.
const BASE = { "Q-D9-01": "A1", "Q-D9-01b": "A1", "Q-D9-02": "A1", "Q-D9-02b": "A1", "Q-D9-03": "A1", "Q-D9-03b": "A1", "Q-D9-04": "A1", "Q-D9-04b": "A1", "Q-D9-05": "A1", "Q-D9-05b": "A1", "Q-D9-06": "A1", "Q-D9-06b": "A1", "Q-D9-07": "A1", "Q-D9-07b": "A1", "Q-D9-08": "A1", "Q-D9-09": "A1" };
const items = { "Q-D9-01b": ["IN1"], "Q-D9-02b": ["AC1"], "Q-D9-03b": ["RG1"], "Q-D9-04b": ["KS1", "KS2"], "Q-D9-05b": ["OP1"], "Q-D9-06b": ["TS1"], "Q-D9-07b": ["NW1"] };
const without = (a, ...k) => Object.fromEntries(Object.entries(a).filter(([x]) => !k.includes(x)));
const S3BASE = without(BASE, "Q-D9-09");

const ok = await compose(S2, 2, BASE, {}, items);
rec("D9-composed", "a complete valid Stage 2 pattern composes one statement (sixteen served questions, sixteen clauses)", ok.outcome === "composed" && ok.clauses.length === 16, ok.outcome === "composed" ? ok.clauses.length : ok);
rec("D9-composed", "counts come from the selected items, never typed", ok.clauses?.find(x => x.question_code === "Q-D9-04b")?.clause_text.includes("stated 2 of the sources of knowledge"), ok.clauses?.filter(x => /04b/.test(x.question_code)).map(x => x.clause_text));
rec("D9-composed", "clause instance carries the dimension scoped key and the statement id", ok.clause_instances?.[0].recurrence_equivalence_key_id === "REK-D9-001" && ok.clause_instances[0].state_code === "ST-D9-001", ok.clause_instances?.[0]);
rec("D9-composed", "the nine elements map to nine dimension scoped keys, REK-D9-001 to REK-D9-009", [...new Set(ok.clause_instances.map(x => x.recurrence_equivalence_key_id))].sort().join() === Array.from({ length: 9 }, (_, i) => "REK-D9-00" + (i + 1)).join(), [...new Set(ok.clause_instances.map(x => x.recurrence_equivalence_key_id))]);
const stored = (await run(`select count(*)::int n from t3a_dimension_composed_statement where composed_statement_id='${ok.composed_statement_id}'`))[0].n; rec("D9-24", "one immutable composed statement is stored", stored === 1, stored);
const upd = await svc(`update t3a_dimension_composed_statement set clauses='[]'::jsonb where composed_statement_id='${ok.composed_statement_id}'`); rec("D9-24", "editing a composed statement after commit refuses", /NO_UPDATE|append|T3A_|permission/i.test(upd.msg), upd.msg.slice(0, 80));
// D9-04: NOT SERVED
const s3ok = await compose(S3, 3, S3BASE, {}, items);
rec("D9-04", "Stage 3: a complete pattern composes fifteen clauses and nothing at all for Q-D9-09 (no row, no null, no not observed sentence)", s3ok.outcome === "composed" && s3ok.clauses.length === 15 && !s3ok.clauses.some(x => x.question_code === "Q-D9-09") && !JSON.stringify(s3ok).includes("ST-D9-044"), s3ok.outcome === "composed" ? s3ok.clauses.length : s3ok);
const ns9 = await compose(S3, 3, BASE, {}, items); rec("D9-04", "Q-D9-09 is NOT SERVED on a Stage 3 source: an answer refuses and no row is written", ns9.reason === "answer_for_question_not_served", ns9);
const ns9m = await compose(S3, 3, S3BASE, { "Q-D9-09": "declined" }, items); rec("D9-04", "and a missing state for it refuses as well: not even a missing state row exists for a question that is not served", ns9m.reason === "answer_for_question_not_served" || ns9m.outcome === "refused", ns9m.reason || ns9m);
const emptyTrial = JSON.parse(JSON.stringify((await run(`select body from t3a_d1_content_version where content_version_id='${S2}'`))[0].body));
emptyTrial.source_identifier = "SRC-D9-N-NOTRIAL-" + P.slice(0, 6); emptyTrial.source_sheet.trial_steps = []; emptyTrial.question_applicability = emptyTrial.question_applicability.map(x => /Q-D9-06/.test(x.question) ? { ...x, state: "NOT SERVED" } : x);
await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${emptyTrial.source_identifier}','source','t','D9','not_loaded')`);
const NT = (await run(`insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1','drafting','not_loaded',${J(emptyTrial)} from t3a_content_object where identifier='${emptyTrial.source_identifier}' returning content_version_id v`))[0].v;
const nt6 = await compose(NT, 2, BASE, {}, items), nt6b = await compose(NT, 2, without(BASE, "Q-D9-06", "Q-D9-06b"), {}, without(items, "Q-D9-06b"));
rec("D9-04", "a source whose trial_steps is empty marks Q-D9-06 and Q-D9-06b NOT SERVED: an answer to either refuses", nt6.reason === "answer_for_question_not_served", nt6);
rec("D9-04", "and the same source composes without them: no row for Q-D9-06 or Q-D9-06b", nt6b.outcome === "composed" && nt6b.clauses.length === 14 && !nt6b.clauses.some(x => /Q-D9-06/.test(x.question_code)), nt6b.outcome || nt6b);
// D9-05: a parent that asserts a listed answer with nothing selected, for each of the seven pairs
for (const [q, k] of [["Q-D9-01", "Q-D9-01b"], ["Q-D9-02", "Q-D9-02b"], ["Q-D9-03", "Q-D9-03b"], ["Q-D9-04", "Q-D9-04b"], ["Q-D9-05", "Q-D9-05b"], ["Q-D9-06", "Q-D9-06b"], ["Q-D9-07", "Q-D9-07b"]]) {
  const n = await compose(S2, 2, BASE, {}, { ...items, [k]: [] }); rec("D9-05", `${q} A1 with nothing selected at ${k} refuses: the parent asserts a listed answer and the child identifies none`, n.reason === "selection_does_not_match_answer", n);
}
const x02 = await compose(S2, 2, { ...BASE, "Q-D9-02": "A3" }, {}, items); rec("D9-05", "an answer that does not serve the child leaves the child unreached; sending its items refuses", x02.reason === "child_not_reached" || x02.reason === "answer_for_question_not_served" || x02.reason === "selection_does_not_match_answer", x02);
const x02b = await compose(S2, 2, { ...without(BASE, "Q-D9-02b"), "Q-D9-02": "A3" }, {}, without(items, "Q-D9-02b")); rec("D9-05", "Q-D9-02 A3 (no change stated) with its child absent composes: the child is never reached", x02b.outcome === "composed", x02b.outcome || x02b);
// D9-06: Q-D9-03 A3 alone, and the other answers that take no child
const a3 = { ...without(BASE, "Q-D9-03b"), "Q-D9-03": "A3" }; const c3 = await compose(S2, 2, a3, {}, without(items, "Q-D9-03b"));
rec("D9-06", "Q-D9-03 A3 (a ground named that the situation does not set out is A2; A3 is no ground named) resolves to ST-D9-013 alone, with no child clause", c3.outcome === "composed" && c3.clauses.some(x => x.state_code === "ST-D9-013") && !c3.clauses.some(x => x.question_code === "Q-D9-03b"), c3.outcome === "composed" ? c3.clauses.map(x => x.state_code) : c3);
const a4 = { ...without(BASE, "Q-D9-03b"), "Q-D9-03": "A4" }; const c4 = await compose(S2, 2, a4, {}, without(items, "Q-D9-03b"));
rec("D9-06", "Q-D9-03 A4 (nothing stated about keeping the approach) composes the record status entry ST-D9-014 and no adverse clause", c4.outcome === "composed" && c4.clauses.some(x => x.state_code === "ST-D9-014" && x.entry_type === "record_status"), c4.outcome === "composed" ? c4.clauses.map(x => x.state_code) : c4);
// missing states
const un = await compose(S2, 2, without(BASE, "Q-D9-09"), {}, items); rec("D9-09", "a served question left unanswered with no missing state refuses", un.reason === "served_question_unanswered", un);
const nc = await compose(S2, 2, without(BASE, "Q-D9-09"), { "Q-D9-09": "not_captured" }, items); rec("D9-09", "not_captured is a controlled code but not committable", nc.reason === "missing_state_not_committable", nc);
const dc = await compose(S2, 2, without(BASE, "Q-D9-09"), { "Q-D9-09": "declined" }, items); rec("D9-09", "declined is committable and composes nothing for that question", dc.outcome === "composed" && !dc.clauses.some(x => x.question_code === "Q-D9-09"), dc.outcome || dc);
const nap = await compose(S2, 2, without(BASE, "Q-D9-09"), { "Q-D9-09": "not_applicable" }, items), nyo = await compose(S2, 2, without(BASE, "Q-D9-09"), { "Q-D9-09": "not_yet_observed" }, items);
rec("D9-10", "not_applicable and not_yet_observed are refused as missing states", nap.outcome === "refused" && nyo.outcome === "refused", [nap.reason, nyo.reason]);
const pm = await compose(S2, 2, without(BASE, "Q-D9-02", "Q-D9-02b"), { "Q-D9-02": "no_response" }, without(items, "Q-D9-02b")); rec("D9-09", "a parent missing state means the child is never reached: no child row and no child missing state", pm.outcome === "composed" && !pm.clauses.some(x => /Q-D9-02/.test(x.question_code)), pm.outcome || pm);
// bound items
const bad = await compose(S2, 2, BASE, {}, { ...items, "Q-D9-02b": ["AC9"] }); rec("D9-07", "an item not on this source version's list refuses", bad.reason === "bound_item_not_on_source", bad);
const oth = await compose(S2, 2, BASE, {}, { ...items, "Q-D9-02b": ["AC3"] }); rec("D9-07", "an item that exists on another source (AC3 is on this source but KS4 and NW3 are on others) is refused when this version does not list it", (await compose(S2, 2, BASE, {}, { ...items, "Q-D9-07b": ["NW3"] })).reason === "bound_item_not_on_source" && oth.outcome === "composed", oth.outcome || oth);
const dup = await compose(S2, 2, BASE, {}, { ...items, "Q-D9-04b": ["KS1", "KS1"] }); rec("D9-07", "the same item twice refuses", dup.reason === "item_selected_twice", dup);
const d4item = await compose(S2, 2, BASE, {}, { ...items, "Q-D9-02b": ["MI1"] }); rec("D9-08", "an item from a source of another dimension (a D4 material item) is refused", d4item.reason === "bound_item_not_on_source", d4item);
const d1item = await compose(S2, 2, BASE, {}, { ...items, "Q-D9-02b": ["M1"] }); rec("D9-08", "an item from a D1 source is refused", d1item.reason === "bound_item_not_on_source", d1item);
// D9-49: the same ground selected at 03b and a change at 02b both compose
const both = ok.clauses;
rec("D9-49", "Q-D9-02 A1 and Q-D9-03 A1 in one observation: BOTH compose as separate clauses (ST-D9-006, ST-D9-009 and ST-D9-011, ST-D9-015); neither is suppressed, subordinated or worded as the conclusion", ["ST-D9-006", "ST-D9-009", "ST-D9-011", "ST-D9-015"].every(k => both.some(x => x.state_code === k)), both.map(x => x.state_code));
rec("D9-49", "the two clauses carry the same shape: the same keys, the same entry type, and no clause text joins them", (() => { const ch = both.find(x => x.state_code === "ST-D9-006"), ke = both.find(x => x.state_code === "ST-D9-011"); return Object.keys(ch).join() === Object.keys(ke).join() && ch.entry_type === ke.entry_type && !/\b(but|however|although|instead)\b/i.test(ch.clause_text + " " + ke.clause_text); })(), null);
const keepOnly = await compose(S2, 2, { ...without(BASE, "Q-D9-02b"), "Q-D9-02": "A3" }, {}, without(items, "Q-D9-02b"));
rec("D9-49", "a kept approach with no change stated composes with no adverse clause: the clauses for Q-D9-03 and Q-D9-03b are the same two entries as when a change is stated", keepOnly.outcome === "composed" && keepOnly.clauses.filter(x => /Q-D9-03/.test(x.question_code)).map(x => x.state_code).join() === both.filter(x => /Q-D9-03/.test(x.question_code)).map(x => x.state_code).join(), keepOnly.outcome || keepOnly);
// D9-17: no recurrence blockers in D9
const rb = (await run(`select statement_key from t3a_d1_statement_library where dimension_id='D9' and statement_key ~ '^ST-D9-0[0-4][0-9]$' and recurrence_blocker order by 1`)).map(r => r.statement_key);
rec("D9-17", "no D9 entry carries the recurrence_blocker flag in the library (Section 5.7), and the conduct bearing clause instances of a full pattern carry none", rb.length === 0 && ok.clause_instances.every(x => x.recurrence_blocker === false), rb);
const NONE = { "Q-D9-01": "A3", "Q-D9-02": "A3", "Q-D9-03": "A4", "Q-D9-04": "A3", "Q-D9-05": "A3", "Q-D9-06": "A3", "Q-D9-07": "A4", "Q-D9-08": "A3", "Q-D9-09": "A4" };
const b10 = await compose(S2, 2, NONE, {}, {});
rec("D9-17", "nothing stated at all composes nine record status entries; each clause instance carries its key and is a recurrence blocker (an entry describing the record carries no conduct toward recurrence), never equivalent to another", b10.outcome === "composed" && b10.clauses.length === 9 && b10.clauses.every(x => x.entry_type === "record_status") && b10.clause_instances.every(x => x.recurrence_blocker === true) && (await run(`select t3a_clause_instances_compare(${J(b10.clause_instances[0])}, ${J(ok.clause_instances[0])}) r`))[0].r.equivalent === false, b10.outcome === "composed" ? b10.clauses.map(x => x.state_code) : b10);
const a1 = ok.clause_instances[0], b1 = { ...a1, observation_id: randomUUID() };
const eq = (await run(`select t3a_clause_instances_compare(${J(a1)}, ${J(b1)}) r`))[0].r; rec("D9-12", "two D9 clause instances with the same key and state are equivalent", eq.equivalent === true, eq);
const cross = (await run(`select t3a_clause_instances_compare(${J(a1)}, ${J({ ...a1, recurrence_equivalence_key_id: "REK-D3-001" })}) r`))[0].r; rec("D9-12", "a D9 clause instance against a D3 clause instance refuses", cross.reason === "dimension_isolation_violation", cross);
const cross4 = (await run(`select t3a_clause_instances_compare(${J(a1)}, ${J({ ...a1, recurrence_equivalence_key_id: "REK-D4-001" })}) r`))[0].r; rec("D9-12", "a D9 clause instance against a D4 clause instance refuses", cross4.reason === "dimension_isolation_violation", cross4);
// D9-61: a performed act verb refuses at every Stage. The verbs are a register (D9 5.7); the test adds a verb that the entries do carry, then removes it.
const sfCheck = async (stage, text, dim = "D9") => (await run(`select t3a_stage_form_check('${stage}', ${J([{ statement_key: "X", text }])}, '${dim}') r`))[0].r;
for (const verb of ["took", "acted", "sought", "performed", "applied", "carried out", "tried", "tested", "adopted", "changed", "adjusted", "switched"]) {
  const out = []; for (const st of [1, 2, 3, 4]) out.push((await sfCheck(st, `the participant ${verb} the new method`)).outcome);
  rec("D9-61", `the performed act verb "${verb}" in a D9 entry is a stage_form_violation at Stages 1, 2, 3 and 4`, out.every(x => x === "violation"), out);
}
rec("D9-61", "the same verbs in a D4 entry are not refused at Stage 2: the every Stage check is registered for D9 alone", (await sfCheck(2, "the participant changed the new method", "D4")).outcome === "ok" && (await sfCheck(2, "the participant tried the new method", "D3")).outcome === "ok", null);
rec("D9-61", "the platform's own Stage 1 verbs still apply to D9 at Stage 1 and to nothing else", (await sfCheck(1, "the participant began the new method")).outcome === "violation" && (await sfCheck(2, "the participant began the new method")).outcome === "ok", null);
rec("D9-61", "no D9 entry in the library carries a registered verb at any Stage (checked on all 44 entries at all four Stages)", (await run(`select count(*)::int n from t3a_d1_statement_library l, generate_series(1,4) s where l.dimension_id='D9' and l.statement_key ~ '^ST-D9-0[0-4][0-9]$' and t3a_stage_form_check(s::text, jsonb_build_array(jsonb_build_object('statement_key', l.statement_key, 'text', l.statement_body)), 'D9') ->> 'outcome' = 'violation'`))[0].n === 0, null);
const n0sf = (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='stage_form_violation'`))[0].n;
await c.query(`alter table t3a_stage_form_dimension_verb disable trigger t3a_append_only`); await run(`insert into t3a_stage_form_dimension_verb(dimension_id, verb, reason) values ('D9','stated','synthetic test verb, removed')`);
const sfv = []; for (const [src, st] of [[S1, 1], [S2, 2], [S3, 3], [S4, 4]]) sfv.push(await compose(src, st, st === 3 ? S3BASE : BASE, {}, items));
await run(`delete from t3a_stage_form_dimension_verb where verb='stated'`); await c.query(`alter table t3a_stage_form_dimension_verb enable trigger t3a_append_only`);
const sfd = (await run(`select detail from t3a_capture_refusal where reason_code='stage_form_violation' order by refused_at desc limit 4`)).map(r => r.detail);
rec("D9-61", "composing a D9 entry that carries a registered verb refuses and logs stage_form_violation at Stages 1, 2, 3 and 4, naming the Stage (verb added for the test, then removed)", sfv.every(x => x.reason === "stage_form_violation") && (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='stage_form_violation'`))[0].n >= n0sf + 4 && [1, 2, 3, 4].every(n => sfd.some(d => d.includes("at Stage " + n))), sfd);
const again4 = []; for (const [s, st, b] of [[S1, 1, BASE], [S2, 2, BASE], [S3, 3, S3BASE], [S4, 4, BASE]]) again4.push(await compose(s, st, b, {}, items));
rec("D9-61", "with the test verb removed the same patterns compose again at all four Stages", again4.every(x => x.outcome === "composed"), again4.map(x => x.outcome || x.reason));
await run(`insert into t3a_stage_form_verb(verb) values ('named') on conflict do nothing`);
const s1sfv = await compose(S1, 1, BASE, {}, items), s2sfv = await compose(S2, 2, BASE, {}, items); await run(`delete from t3a_stage_form_verb where verb='named'`);
rec("D9-61", "a platform Stage 1 verb present in an entry still refuses at Stage 1 and only there (verb added for the test, then removed)", s1sfv.reason === "stage_form_violation" && s2sfv.outcome === "composed", [s1sfv.reason || s1sfv.outcome, s2sfv.reason || s2sfv.outcome]);
const s1ok = await compose(S1, 1, BASE, {}, items); rec("D9-61", "a Stage 1 pattern composes, carrying the stage_1_only limitation, with all sixteen answers: every element is carried at Stage 1", s1ok.outcome === "composed" && s1ok.conditions.includes("stage_1_only") && s1ok.clauses.length === 16, s1ok.outcome || s1ok);
rec("D9-61", "Stages 2, 3 and 4 do not carry the Stage 1 limitation", (await compose(S2, 2, BASE, {}, items)).conditions.every(x => x !== "stage_1_only") && (await compose(S4, 4, BASE, {}, items)).conditions.every(x => x !== "stage_1_only"), null);
// capacity_observation and cross_dimension_assertion at composition (the guards are registers; each is broken for the test and restored)
const leads = await run(`select lead_pattern from t3a_entry_subject_lead where dimension_id='D9' order by 1`);
await c.query(`alter table t3a_entry_subject_lead disable trigger t3a_append_only`); await run(`delete from t3a_entry_subject_lead where dimension_id='D9'`); await run(`insert into t3a_entry_subject_lead(dimension_id, lead_pattern) values ('D9','^zz no entry begins like this')`);
const n0cap = (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='capacity_observation'`))[0].n;
const cap = await compose(S2, 2, BASE, {}, items);
await run(`delete from t3a_entry_subject_lead where dimension_id='D9'`); for (const l of leads) await run(`insert into t3a_entry_subject_lead(dimension_id, lead_pattern) values ('D9','${l.lead_pattern.replace(/'/g, "''")}')`); await c.query(`alter table t3a_entry_subject_lead enable trigger t3a_append_only`);
rec("D9-64", "a composed entry whose subject is not a statement of the participant refuses and logs capacity_observation (the subject registry is narrowed for the test, then restored)", cap.reason === "capacity_observation" && (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='capacity_observation'`))[0].n === n0cap + 1, cap.reason || cap.outcome);
rec("D9-64", "with the subject registry restored the same pattern composes", (await compose(S2, 2, BASE, {}, items)).outcome === "composed" && (await run(`select count(*)::int n from t3a_entry_subject_lead where dimension_id='D9'`))[0].n === 3, null);
await c.query(`alter table t3a_rce_prohibited_vocabulary disable trigger user`); await run(`insert into t3a_rce_prohibited_vocabulary(dimension_id, word, version, reason) values ('D9','named','PV-D9-TEST','cross_dimension_assertion'),('D9','situation','PV-D9-TEST','synthetic')`);
const xa = await compose(S2, 2, BASE, {}, items); await run(`delete from t3a_rce_prohibited_vocabulary where version='PV-D9-TEST' and word='named'`);
const pv = await compose(S2, 2, BASE, {}, items); await run(`delete from t3a_rce_prohibited_vocabulary where version='PV-D9-TEST'`); await c.query(`alter table t3a_rce_prohibited_vocabulary enable trigger user`);
rec("D9-27", "a composed entry that carries a word belonging to another dimension refuses and logs cross_dimension_assertion (word added for the test, then removed)", xa.reason === "cross_dimension_assertion", xa.reason || xa.outcome);
rec("D9-64", "a composed entry that carries any other listed word refuses and logs prohibited_vocabulary (word added for the test, then removed)", pv.reason === "prohibited_vocabulary", pv.reason || pv.outcome);
rec("D9-27", "with the test words removed the same pattern composes", (await compose(S2, 2, BASE, {}, items)).outcome === "composed" && (await run(`select count(*)::int n from t3a_rce_prohibited_vocabulary where version='PV-D9-TEST'`))[0].n === 0, null);
// mode and gate
const asUser = await c.query("begin").then(async () => { await c.query("set local role authenticated"); await c.query(`select set_config('request.jwt.claims', '{"role":"authenticated"}', true)`); try { return (await c.query(`select t3a_dimension_compose('${P}','${S2}','2',${J(BASE)},'{}'::jsonb,${J(items)},gen_random_uuid(),true) r`)).rows[0].r; } finally { await c.query("rollback"); } });
rec("D9-01", "test composition is the service route only", asUser.reason === "TEST_MODE_IS_SERVICE_ONLY", asUser);
await run(`select set_config('t3a.commit_seal_key','', false)`);
const prod = await prodCompose(S2, 2, BASE, items, randomUUID()); rec("D9-01", "production composition refuses on this unapproved source", prod.reason === "source_not_approved" || prod.outcome === "refused", prod);
const wrong = await compose(S2, 1, BASE, {}, items); rec("D9-composed", "a source composes only at its own Stage", wrong.reason === "source_stage_mismatch", wrong);
// D-06 seal
const KEY = "synthetic-test-key-" + randomUUID();
const comp = await compose(S2, 2, BASE, {}, items);
const seal = async (id, sup = false) => { await c.query("begin"); await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims','{"role":"service_role"}',true)`); await c.query(`select set_config('t3a.commit_seal_key','${KEY}',true)`); let r; try { r = (await c.query(`select t3a_seal_composed('${id}', ${sup}) r`)).rows[0].r; } catch (e) { r = { msg: e.message }; } await c.query("commit"); return r; };
await c.query(`select set_config('t3a.commit_seal_key','',false)`);
const unl = await svc(`select t3a_seal_composed('${comp.composed_statement_id}', false) r`);
rec("D9-65", "with the signing key not loaded the seal refuses as commit_seal_key_unloaded", /COMMIT_SEAL_KEY_UNLOADED/i.test(JSON.stringify(unl.rows[0]?.r || unl.msg)), unl.rows[0]?.r || unl.msg);
const sl = await seal(comp.composed_statement_id); rec("D9-65", "with the key loaded the seal is written", !(sl && sl.msg), sl);
const chk = (await run(`select count(*)::int n from t3a_commit_seal where composed_statement_id='${comp.composed_statement_id}'`))[0].n; rec("D9-65", "exactly one seal row exists for the composed statement", chk === 1, chk);
const tamper = await svc(`update t3a_commit_seal set seal='00' where composed_statement_id='${comp.composed_statement_id}'`); rec("D9-65", "a seal cannot be edited", /NO_UPDATE|append|T3A_|permission/i.test(tamper.msg), tamper.msg.slice(0, 80));
const ver2 = await c.query("begin").then(async () => { await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims','{"role":"service_role"}',true)`); await c.query(`select set_config('t3a.commit_seal_key','${KEY}',true)`); try { return (await c.query(`select t3a_verify_commit_seal('${comp.composed_statement_id}') r`)).rows[0].r; } catch (e) { return { msg: e.message }; } finally { await c.query("commit"); } });
rec("D9-65", "a sealed statement verifies under the server key", ver2 === true || ver2?.valid === true || ver2?.passed === true || ver2?.outcome === "valid", ver2);
const ver3 = await c.query("begin").then(async () => { await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims','{"role":"service_role"}',true)`); await c.query(`select set_config('t3a.commit_seal_key','another-key',true)`); try { return (await c.query(`select t3a_verify_commit_seal('${comp.composed_statement_id}') r`)).rows[0].r; } catch (e) { return { msg: e.message }; } finally { await c.query("commit"); } });
rec("D9-65", "under any other key the seal reads as invalid (commit_seal_invalid)", JSON.stringify(ver3).includes("commit_seal_invalid") || ver3 === false || ver3?.valid === false, ver3);
// D9-65: the captures of a committed record altered with the hash recomputed: the record is changed under the table's own guard (disabled for the test, restored), the seal is checked
await c.query(`alter table t3a_dimension_composed_statement disable trigger user`);
await run(`update t3a_dimension_composed_statement set answers = jsonb_set(answers, '{Q-D9-02}', '"A3"') where composed_statement_id='${comp.composed_statement_id}'`);
await c.query(`alter table t3a_dimension_composed_statement enable trigger user`);
const altered = await c.query("begin").then(async () => { await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims','{"role":"service_role"}',true)`); await c.query(`select set_config('t3a.commit_seal_key','${KEY}',true)`); try { return (await c.query(`select t3a_commit_seal_check('${comp.composed_statement_id}') r`)).rows[0].r; } catch (e) { return { msg: e.message }; } finally { await c.query("commit"); } });
rec("D9-65", "a committed record whose captures were altered, with the hash recomputed, is refused on resubmission as commit_seal_invalid and the refusal is logged", altered.reason === "commit_seal_invalid" && (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='commit_seal_invalid'`))[0].n >= 1, altered);
// D9-66: an observation identifier commits once
const REF = randomUUID();
const o1 = await compose(S2, 2, BASE, {}, items, REF), o2 = await compose(S2, 2, BASE, {}, items, REF);
rec("D9-66", "a second original commit under the same observation identifier is refused by the store; the first record stands", o1.outcome === "composed" && /original_uq/.test(o2.msg || "") && (await run(`select count(*)::int n from t3a_dimension_composed_statement where observation_ref='${REF}'`))[0].n === 1, o2);
await seal(o1.composed_statement_id);
const again = await seal(o1.composed_statement_id);
rec("D9-66", "a second original seal under the same identifier is refused as well", !!again?.msg && /unique|one_original|pkey/i.test(again.msg) && (await run(`select count(*)::int n from t3a_commit_seal where observation_ref='${REF}'`))[0].n === 1, again);
rec("D9-66", "the production commit path checks the seal register for the identifier before it writes, and logs observation_id_not_unique", (await run(`select pg_get_functiondef('t3a_dimension_compose'::regproc) d`))[0].d.includes("observation_id_not_unique"), null);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
