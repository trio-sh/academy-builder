// Step 3n: the D5 counterpart boundary (D5 Sections 3.2, 5.2, 5.5; tests D5-64, D5-68, D5-69). Throwaway database only.
// The other party is present in every D5 source and is a condition of the situation, never a subject of the record: a bound family item with the counterpart as its subject refuses the source at load,
// the counterpart role and position are kept out of every readable surface, and a rendered sentence or entry with the counterpart as its subject refuses.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const RUN = randomUUID().slice(0, 8);
const asRole = async (role, sql, keep = false) => { await c.query("begin"); let msg = "ok", rows = []; try { await c.query(`set local role ${role}`); await c.query(`select set_config('request.jwt.claims', '${JSON.stringify({ role })}', true)`); rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query(keep && msg === "ok" ? "commit" : "rollback"); return { msg, rows, r: rows[0]?.r }; };
const svc = (sql, keep = false) => asRole("service_role", sql, keep);
const refused = async (code) => (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='${code}'`))[0].n;
const J = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const FAM = ["designated_positions", "designated_enquiries", "shared_items", "available_options", "available_routes", "agreement_contents"];
const ROLE = "The colleague who sets the rota.";
const clean = () => ({ d5_situation_class: "SC-D5-1", counterpart_role: ROLE, counterpart_position: "the first two weekends every month", designated_positions: [{ id: "DP1", text: "alternating first and second weekends" }], designated_enquiries: [{ id: "DE1", text: "what the first-weekend preference rests on" }],
  shared_items: [{ id: "SI1", text: "the rota template and its four weekends" }], available_options: [{ id: "AO1", text: "alternating months" }], available_routes: [{ id: "AR1", text: "this session" }], agreement_contents: [{ id: "AC1", text: "the split" }] });
// returns the number of versions the load wrote (0 = refused at load) and the version id
let seqNo = 0;
const load = async (tag, sheet, dim = "D5") => {
  const id = `SRC-${dim}-N-${tag}-${++seqNo}-${RUN}`;
  const body = { source_identifier: id, stage_code: "S2", source_version_hash: "a".repeat(64), source_sheet: sheet, title: id };
  await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${id}','source','${id}','${dim}','not_loaded')`);
  const r = await run(`insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1','drafting','not_loaded',${J(body)} from t3a_content_object where identifier='${id}' returning content_version_id v`);
  return { n: r.length, v: r[0]?.v, id };
};

// ---------------- D5-69: a bound family item with the counterpart as its subject refuses the source at load ----------------
let n0 = await refused("counterpart_as_subject");
const ok0 = await load("clean", clean());
rec("D5-69", "a source whose items name no counterpart as a subject loads", ok0.n === 1, ok0);
const badItems = { designated_positions: "the colleague declined the first weekend", designated_enquiries: "the colleague answers what the rota requires", shared_items: "the colleague holds the rota template", available_options: "the colleague takes the first weekends", available_routes: "the colleague receives a note", agreement_contents: "the colleagues settle the split" };
for (const f of FAM) {
  n0 = await refused("counterpart_as_subject");
  const sh = clean(); sh[f] = [{ id: "X1", text: badItems[f] }];
  const l = await load("bad-" + f, sh);
  const lastDetail = (await run(`select detail from t3a_capture_refusal where reason_code='counterpart_as_subject' and subject_ref='${l.id}'`))[0]?.detail;
  rec("D5-69", `an item of ${f} with the counterpart as its subject ("${badItems[f]}") refuses the source at load and logs counterpart_as_subject`, l.n === 0 && (await refused("counterpart_as_subject")) === n0 + 1 && new RegExp(`${f}:X1`).test(lastDetail || ""), { loaded: l.n, detail: lastDetail });
}
const subjectForms = ["the colleague declined", "the colleague who sets the rota moves", "the other side agrees and the colleague signs", "when the colleague replies the participant sends it", "because the colleague is away", "the colleagues are asked to settle it", "the colleague's agreement is recorded and the colleague files it"];
for (const t of subjectForms) { const sh = clean(); sh.available_options = [{ id: "X2", text: t }]; const l = await load("form", sh); rec("D5-69", `a subject form is refused: "${t}"`, l.n === 0, l.n); }
const notSubject = ["ask the colleague to restore it", "the participant asks the colleague what the rota requires", "what the colleague needs by Friday", "the colleague's note on the rota", "both weekends offered to the colleague", "alternating months, put to the colleague", "send the colleague a note listing what has been done"];
for (const t of notSubject) { const sh = clean(); sh.designated_enquiries = [{ id: "X3", text: t }]; const l = await load("obj", sh); rec("D5-69", `the counterpart as the object of the participant's act, or as a possessor, is not refused: "${t}"`, l.n === 1, l.n); }
// the rule is per source: the counterpart of another source is not this source's counterpart, and a third party may be named as a subject (an authority that decides)
{ const sh = clean(); sh.available_options = [{ id: "AO4", text: "the facilities coordinator decides" }]; const l = await load("third", sh); rec("D5-69", "a third party that is not the counterpart (an authority that decides) as the subject of an option is not refused", l.n === 1, l.n); }
{ const sh = clean(); sh.available_options = [{ id: "AO4", text: "the facilities coordinator decides" }]; sh.counterpart_role = "The facilities coordinator."; const l = await load("third2", sh); rec("D5-69", "the same item is refused when that third party is this source's counterpart", l.n === 0, l.n); }
// other dimensions are not subject to the D5 rule
{ const sh = { d4_situation_class: "SC-D4-1", counterpart_role: ROLE, available_channels: [{ id: "CH1", text: "the colleague declined the call" }] }; const l = await load("d4", sh, "D4"); rec("D5-69", "a D4 source with the same wording loads: the counterpart rule belongs to the dimensions that register it", l.n === 1, l.n); }
// the real package: the five sources that name their own counterpart as the subject of an item are refused at load, the other 28 load
const objs = (await run(`select o.identifier, (select count(*)::int from t3a_d1_content_version v where v.content_object_id=o.content_object_id) n from t3a_content_object o where o.dimension_id='D5' and o.identifier ~ '^SRC-D5-S[1-4]-0' order by 1`));
const notLoaded = objs.filter(o => o.n === 0).map(o => o.identifier);
rec("D5-69", "of the 33 D5 sources of the package, 28 load and exactly five are refused at load: SRC-D5-S2-009, S3-001, S3-007, S4-004, S4-010", objs.length === 33 && notLoaded.join() === "SRC-D5-S2-009,SRC-D5-S3-001,SRC-D5-S3-007,SRC-D5-S4-004,SRC-D5-S4-010", { total: objs.length, notLoaded });
const det = Object.fromEntries((await run(`select subject_ref, detail from t3a_capture_refusal where reason_code='counterpart_as_subject' and subject_ref ~ '^SRC-D5-S[1-4]-0' order by 1`)).map(x => [x.subject_ref, x.detail]));
const expected = { "SRC-D5-S2-009": "designated_positions:DP2:manager", "SRC-D5-S3-001": "available_options:AO4:lead", "SRC-D5-S3-007": "available_options:AO4:people function", "SRC-D5-S4-004": "available_options:AO4:chair", "SRC-D5-S4-010": "available_options:AO4:lead" };
rec("D5-69", "each of the five is refused for exactly one item, named in the log (S2-009 DP2 'the two managers are asked to settle it before the board'; S3-001 AO4 'both leads take the decision to the vice-president jointly'; S3-007 AO4 'the people function asked to advise on the arrangement'; S4-004 AO4 'the chair takes the decision'; S4-010 AO4 'the lead decides')", JSON.stringify(det) === JSON.stringify(expected), det);
const sensitive = (await run(`select o.identifier, v.body->'source_sheet'->>'sensitivity_flag' f from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier in ('SRC-D5-S3-004','SRC-D5-S3-007') and o.dimension_id='D5'`));
rec("D5-sensitive", "SRC-D5-S3-004 carries sensitivity_flag SENSITIVE_CONTENT (decision 0.6.22); SRC-D5-S3-007 is among the five refused, so its flag has no loaded row to sit on", sensitive.length === 1 && sensitive[0].identifier === "SRC-D5-S3-004" && sensitive[0].f === "SENSITIVE_CONTENT", sensitive);

// ---------------- D5-69 (entries): an entry with the counterpart as its subject cannot be loaded; none of the 46 is ----------------
const lib = (await run(`select content_version_id v from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier='T3A-D5-EXEC-001-STATEMENT-LIBRARY'`))[0].v;
const sqlLit = (t) => "'" + t.replace(/'/g, "''") + "'";
const ins = (key, text) => run(`insert into t3a_d1_statement_library(content_version_id, dimension_id, question_set_version, stage_code, statement_key, statement_body, bound_variables, bound_condition_renderings, use_disposition, question_code, answer_code, applicable_stages, entry_type) values ('${lib}','D5','2.0','S2'::t3a_stage_code,'${key}',${sqlLit(text)},'{}'::text[],'{}'::jsonb,'build_only','Q-D5-01','A1',array['S2'],'conduct_bearing') returning statement_key`);
n0 = await refused("counterpart_as_subject");
const e1 = await ins("ST-D5-T-" + RUN + "-1", "the colleague declined to move"); rec("D5-69", "an entry whose subject is a counterpart role label is refused at load and logged", e1.length === 0 && (await refused("counterpart_as_subject")) === n0 + 1, e1);
// the allowed case is checked on the detector itself: an extra row in the real library would change its count of 46
const e2 = (await run(`select t3a_counterpart_subject_hit(t3a_counterpart_dimension_terms('D5'), 'the participant asked the colleague a question the situation set out') h`))[0].h; rec("D5-69", "an entry in which the counterpart is only the object of the participant's act is not refused (the detector finds no subject)", e2 === null, e2);
const allOk = (await run(`select count(*)::int n from t3a_d1_statement_library where dimension_id='D5' and statement_key ~ '^ST-D5-0' and public.t3a_counterpart_subject_hit(public.t3a_counterpart_dimension_terms('D5'), statement_body) is not null`))[0].n;
rec("D5-69", "none of the 46 loaded D5 entries has a counterpart term as the subject of a verb (scanned against the terms of the 28 loaded sources and the generic role nouns)", allOk === 0, allOk);
// the rendered scan logs
n0 = await refused("counterpart_as_subject");
const sc = await svc(`select t3a_rendered_output_scan('D5', 'the other team refused', 'report-x') r`, true);
rec("D5-64", "the rendered output scan refuses a sentence whose subject is a counterpart role label and logs counterpart_as_subject", sc.r?.passed === false && (await refused("counterpart_as_subject")) === n0 + 1, sc.r || sc.msg);
rec("D5-64", "the scan is the service route only", /permission denied/.test((await asRole("authenticated", `select t3a_rendered_output_scan('D5','x','y') r`)).msg), null);

// ---------------- D5-68: counterpart_role and counterpart_position appear nowhere ----------------
const bodies = await run(`select o.identifier, v.body::text t from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.dimension_id='D5' and o.family='source'`);
const bodiesLoaded = bodies.filter(b => /^(SRC-D5-S[1-4]-0|DEMO-D5-S)/.test(b.identifier));
const inBody = bodies.filter(b => /counterpart_(role|position)/.test(b.t)).map(b => b.identifier);
rec("D5-68", "no readable D5 source body (28 sources and 4 demonstration fixtures, and every synthetic source this file loaded) carries counterpart_role or counterpart_position, as a field or in the sheet text", bodiesLoaded.length === 32 && inBody.length === 0, { bodies: bodies.length, packageBodies: bodiesLoaded.length, inBody });
const seq = (await run(`select field, count(*)::int n from t3a_source_sequestered_field group by 1 order by 1`));
rec("D5-68", "the two fields, and the sheet notes that carry their names as a label, are kept in the sequestered table: a role for every loaded source", seq.some(x => x.field === "counterpart_role" && x.n >= 32) && seq.some(x => x.field === "counterpart_position" && x.n >= 20) && seq.some(x => x.field === "source_note#note" && x.n >= 8), seq);
const s2 = (await run(`select v.content_version_id v from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier='SRC-D5-S2-001'`))[0].v;
const reg = await svc(`select t3a_source_counterpart('${s2}') r`);
rec("D5-68", "the source registry reads them: the registry function returns the role label of SRC-D5-S2-001 for the service route", /colleague named in the announcement/i.test(reg.r?.counterpart_role || ""), reg.r || reg.msg);
for (const role of ["anon", "authenticated"]) {
  const t = await asRole(role, `select count(*)::int n from t3a_source_sequestered_field`); const f = await asRole(role, `select t3a_source_counterpart('${s2}') r`);
  rec("D5-68", `${role} cannot read the sequestered table or call the registry function`, /permission denied/.test(t.msg) && /permission denied/.test(f.msg), [t.msg.slice(0, 60), f.msg.slice(0, 60)]);
}
const mentorSees = await asRole("authenticated", `select count(*)::int n from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.dimension_id='D5' and o.family='source' and v.body::text ~ 'counterpart_(role|position)'`);
rec("D5-68", "a mentor (an authenticated caller) reading the source registry directly finds neither field in any D5 body", mentorSees.rows[0]?.n === 0, mentorSees.rows[0] || mentorSees.msg);
// the reference card: six sections, neither field, no expected response
const fieldsOf = (t) => /counterpart_(role|position)/i.test(t);
const loaded = (await run(`select o.identifier from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.dimension_id='D5' and o.identifier ~ '^(SRC-D5-S[1-4]-0|DEMO-D5-S)' order by 1`)).map(x => x.identifier);
let cardBad = [], cardCount = 0, valueLeak = [];
const vals = Object.fromEntries((await run(`select o.identifier i, s.field f, s.value v from t3a_source_sequestered_field s join t3a_d1_content_version v using (content_version_id) join t3a_content_object o using (content_object_id)`)).map(x => [x.i + "|" + x.f, x.v]));
for (const id of loaded) { const res = await asRole("authenticated", `select t3a_d5_reference_card('${id}') r`); const card = res.r; cardCount++; const t = JSON.stringify(card) || String(res.msg);
  if (!card?.rendered || fieldsOf(t)) cardBad.push(id);
  for (const f of ["counterpart_role", "counterpart_position"]) { const v = vals[id + "|" + f]; if (v && t.includes(v)) valueLeak.push([id, f]); } }
rec("D5-68", "the Mentor Cockpit reference card renders for all 32 loaded D5 sources (an authenticated caller) and carries neither counterpart field, name or value", cardCount === 32 && cardBad.length === 0 && valueLeak.length === 0, { cardCount, cardBad, valueLeak });
const card = (await asRole("authenticated", `select t3a_d5_reference_card('SRC-D5-S2-001') r`)).r;
rec("D5-68", "the card has the six sections of instruction 039: scripted questions, positions, enquiries, shared items, options routes and contents, flags", Array.isArray(card.scripted_questions) && card.scripted_questions.length === 4 && card.designated_positions.length === 3 && card.designated_enquiries.length === 3 && card.shared_items.length === 3 && card.options_routes_contents.available_options.length === 4 && card.options_routes_contents.available_routes.length === 1 && card.options_routes_contents.agreement_contents.length === 3 && ["difference_established", "authority_relation", "recording_route", "persistence_point", "exchange_test_point"].every(k => k in card.flags), Object.keys(card));
const keysDeep = (o, acc = []) => { if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { acc.push(k); keysDeep(v, acc); } return acc; };
rec("D5-68", "the card carries no expected response, strong answer, red flag, preference or order key", !keysDeep(card).some(k => /expected|strong|red_flag|preferred|better|score|rank/i.test(k)), keysDeep(card).slice(0, 30));
const s1card = (await asRole("authenticated", `select t3a_d5_reference_card('SRC-D5-S1-001') r`)).r;
rec("D5-68", "a Stage 1 card reads its scripted questions from the reveals; the opening reveal is not a question", s1card.scripted_questions.length === 5 && s1card.scripted_questions[0].code === "R2", s1card.scripted_questions.map(q => q.code));
const s3card = (await asRole("authenticated", `select t3a_d5_reference_card('SRC-D5-S3-002') r`)).r;
rec("D5-68", "a Stage 3 card carries no live script and says so", s3card.scripted_questions.length === 0 && s3card.scripted_questions_note === "STAGE_CARRIES_NO_LIVE_SCRIPT", s3card.scripted_questions_note);
rec("D5-68", "a source that is not a D5 source, and one that is refused, return no card", (await asRole("authenticated", `select t3a_d5_reference_card('SRC-D5-S4-004') r`)).r?.refusal_code === "SOURCE_NOT_FOUND" || (await asRole("authenticated", `select t3a_d5_reference_card('SRC-D5-S4-004') r`)).r?.refusal_code === "SOURCE_CARRIES_NO_LOADED_VERSION", (await asRole("authenticated", `select t3a_d5_reference_card('SRC-D5-S4-004') r`)).r);
// no routine reads the fields by name: only data rows name them
const readers = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc ~ 'counterpart_(role|position)'`);
rec("D5-68", "no database routine names either field: the registry rule table and the sequestered table are the only places that do", readers.length === 0, readers.map(x => x.proname));
const rule = await run(`select role_field, position_field from t3a_dimension_counterpart_rule where dimension_id='D5'`);
rec("D5-68", "the field names are data in the D5 counterpart rule", rule.length === 1 && rule[0].role_field === "counterpart_role" && rule[0].position_field === "counterpart_position", rule);
// application and API source: no screen, export or report builder names the fields
const root = process.env.T3A_REPO_ROOT || new URL("../../", import.meta.url).pathname;
const walk = (d, out = []) => { let es = []; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return out; } for (const e of es) { const p = d + "/" + e.name; if (e.isDirectory()) { if (!["node_modules", ".git", "dist"].includes(e.name)) walk(p, out); } else if (/\.(tsx?|mjs|js|json|sql)$/.test(e.name)) out.push(p); } return out; };
const hits = [...walk(root + "/src"), ...walk(root + "/api"), ...walk(root + "/public")].filter(f => !/\.test\.|\/test\//.test(f)).filter(f => /counterpart_(role|position)/.test(fs.readFileSync(f, "utf8")));
rec("D5-68", "no screen, report builder, export or API handler in the application source (src, api, public) names counterpart_role or counterpart_position", hits.length === 0, hits);
const mp = JSON.stringify(JSON.parse(fs.readFileSync(root + "/src/lib/berMultipage/fix-multipage.json", "utf8")));
rec("D5-68", "the multi page report fixture and its manifest carry neither field", !fieldsOf(mp), null);
// fixtures keep their sheet text without the two fields
const fx = (await run(`select o.identifier, v.body->'source_sheet'->>'source_sheet_text' t from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier ~ '^DEMO-D5-S'`));
rec("D5-68", "the four D5 demonstration fixtures keep their sheet text with the two fields lifted out and every other field intact (the prose still names difference_established, authority_relation, recording_route, persistence_point, exchange_test_point and the lists)", fx.length === 4 && fx.every(x => !fieldsOf(x.t) && ["designated_positions", "designated_enquiries", "shared_items", "available_options", "available_routes", "agreement_contents", "difference_established", "authority_relation", "recording_route", "persistence_point", "exchange_test_point"].every(k => x.t.includes("`" + k + "`"))), fx.map(x => x.identifier));
const fxRole = (await run(`select count(*)::int n from t3a_source_sequestered_field s join t3a_d1_content_version v using (content_version_id) join t3a_content_object o using (content_object_id) where o.identifier ~ '^DEMO-D5-S' and s.field='counterpart_role'`))[0].n;
rec("D5-68", "the fixtures' role labels are retained for source truth in the sequestered table", fxRole === 4, fxRole);

console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
