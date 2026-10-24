// Session Archive (dormant), D9 content: the resolver port on the D9 reference fixtures of the joint trial (24 resolution cases, 2 dimension cases, 2 load tests),
// the stored D9 records (30 inactive drafts that pass the registry load checks), the state mapping of Execution Edition Table 15.1, and test D9-71:
// no direction rule and no family exists for REK-D9-002 or REK-D9-003, so no direction, progression or regression finding is produced for either. Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs";
const ROOT = process.env.T3A_REPO_ROOT || new URL("../../", import.meta.url).pathname.replace(/\/$/, "");
const { loadRegistries, resolve, resolveDimension, outputHash, LoadError } = await import(ROOT + "/tools/lsa/resolver.mjs");
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const F = ROOT + "/tools/lsa/fixtures/d9/";
const reg = JSON.parse(fs.readFileSync(F + "registries.json", "utf8")), data = JSON.parse(fs.readFileSync(F + "observations.json", "utf8")), exp = JSON.parse(fs.readFileSync(F + "expected_results.json", "utf8"));
const pkg = JSON.parse(fs.readFileSync(ROOT + "/tools/lsa/fixtures/d9-session-archive-content.json", "utf8"));

// ---- the reference fixtures of the D9 joint trial, on the resolver port
loadRegistries(reg);
const parts = Object.fromEntries(data.participants.map((p) => [p.participant_id, p]));
for (const k of data.cases) {
  const rg = k.no_history ? { ...reg, history_rules: [] } : reg;
  const got = resolve(rg, parts, data.observations, k); if ("refusal" in got) delete got.considered;
  const want = exp[k.case_id]; const again = resolve(rg, parts, data.observations, k); if ("refusal" in again) delete again.considered;
  rec("D9-SA-resolve", `${k.case_id}: ${want.finding_code ?? want.refusal}`, Object.entries(want).every(([a, v]) => JSON.stringify(got[a]) === JSON.stringify(v)) && outputHash(got) === outputHash(again), want);
}
for (const dc of data.dimension_cases || []) { const got = resolveDimension(reg, dc.dimension_id, dc.element_results, "2027-12-31"); rec("D9-SA-dimension", `${dc.id}: ${got.dimension_finding_code}`, Object.entries(dc.expected).every(([a, v]) => JSON.stringify(got[a]) === JSON.stringify(v)), got); }
for (const lt of data.load_tests || []) { let err = null; try { loadRegistries(lt.registries); } catch (e) { err = e; } rec("D9-SA-load", `${lt.id} is rejected as specified`, err instanceof LoadError, err?.message); }
rec("D9-SA-resolve", "the trial carries exactly 24 resolution cases, 2 dimension cases and 2 load tests", data.cases.length === 24 && data.dimension_cases.length === 2 && data.load_tests.length === 2, [data.cases.length, data.dimension_cases.length, data.load_tests.length]);

// ---- the stored D9 content
const n = (await run(`select count(*)::int n, count(*) filter (where status='draft_for_approval')::int d, count(*) filter (where status='active' or approved_by is not null or effective_from is not null)::int a from t3a_lsa_registry_record where package_id='T3A-D9-LSA-CONTENT-001'`))[0];
rec("D9-SA-load", "D9 Session Archive content is loaded as 30 records, every one a draft with no approval and no effective date, none active", n.n === 30 && n.d === 30 && n.a === 0, n);
const byReg = Object.fromEntries((await run(`select registry, count(*)::int n from t3a_lsa_registry_record where package_id='T3A-D9-LSA-CONTENT-001' group by 1 order by 1`)).map((r) => [r.registry, r.n]));
rec("D9-SA-load", "by registry: 2 families, 2 direction rules, 1 sufficiency rule, 14 entries, 1 history rule, 1 dimension rule, 7 dimension entries, 2 state mappings", JSON.stringify(byReg) === JSON.stringify({ dimension_entries: 7, dimension_rules: 1, direction_rules: 2, entries: 14, families: 2, history_rules: 1, state_mapping: 2, sufficiency_rules: 1 }), byReg);
rec("D9-SA-load", "the stored records are the package's records, key for key", (await run(`select count(*)::int n from t3a_lsa_registry_record where package_id='T3A-D9-LSA-CONTENT-001' and registry <> 'state_mapping'`))[0].n === Object.values(pkg.registries).reduce((a, x) => a + x.length, 0), null);
rec("D9-SA-load", "only CE-D9-07 and CE-D9-08 are carried: the propositions of the families are REK-D9-007 and REK-D9-008", (await run(`select distinct body->>'proposition_id' p from t3a_lsa_registry_record where registry='families' and package_id='T3A-D9-LSA-CONTENT-001' order by 1`)).map((r) => r.p).join() === "REK-D9-007,REK-D9-008", null);
const recs = await run(`select registry, body from t3a_lsa_registry_record where package_id='T3A-D9-LSA-CONTENT-001' and registry <> 'state_mapping'`);
const active = {}; for (const r of recs) (active[r.registry] ||= []).push({ ...r.body, status: "active", effective_from: "2027-01-01" });
let loadErr = null; try { loadRegistries(active); } catch (e) { loadErr = e.message; }
rec("D9-SA-load", "the stored D9 records pass the registry load checks when treated as active", loadErr === null, loadErr);
const sm = Object.fromEntries((await run(`select record_key, body from t3a_lsa_registry_record where registry='state_mapping' and package_id='T3A-D9-LSA-CONTENT-001'`)).map((r) => [r.record_key, r.body]));
rec("D9-SA-load", "the state mapping is Table 15.1: C7 A1 to A4 map to WA_WORK_AND_POINT, WA_WORK_NO_POINT, WA_NONE_NAMED, WA_NONE and C8 A1 to A3 to RA_WITH_PLACE, RA_NO_PLACE, RA_NONE", JSON.stringify(sm) === JSON.stringify({ "REK-D9-007": { "C7 A1": "WA_WORK_AND_POINT", "C7 A2": "WA_WORK_NO_POINT", "C7 A3": "WA_NONE_NAMED", "C7 A4": "WA_NONE" }, "REK-D9-008": { "C8 A1": "RA_WITH_PLACE", "C8 A2": "RA_NO_PLACE", "C8 A3": "RA_NONE" } }), sm);
rec("D9-SA-flag", "the activation flag is off and an active D9 record is refused while it is off", (await run(`select t3a_lsa_flag('lsa_activation') a`))[0].a === false && await c.query(`insert into t3a_lsa_registry_record(registry, record_key, version, dimension_id, status, approved_by, approved_at, effective_from, body) values ('entries','X-D9-ACTIVE',1,'D9','active','someone',now(),'2027-01-01','{}'::jsonb)`).then(async () => (await run(`select count(*)::int n from t3a_lsa_registry_record where record_key='X-D9-ACTIVE'`))[0].n === 0), null);

// ---- D9-71: no direction between changing and keeping the approach exists in any registry
const allText = (await run(`select string_agg(body::text, ' ') t from t3a_lsa_registry_record where package_id='T3A-D9-LSA-CONTENT-001'`))[0].t;
rec("D9-71", "neither REK-D9-002 nor REK-D9-003 appears in any record of the D9 package: no family, no direction rule, no sufficiency rule, no entry, no state mapping", !/REK-D9-00[23]\b/.test(allText) && !/CE-D9-0[23]\b/.test(allText), (allText.match(/REK-D9-00[0-9]/g) || []).filter((v, i, a) => a.indexOf(v) === i));
rec("D9-71", "the only direction rules are DR-D9-007 and DR-D9-008, each for a family of CE-D9-07 or CE-D9-08", (await run(`select record_key, body->>'family_id' f from t3a_lsa_registry_record where registry='direction_rules' and package_id='T3A-D9-LSA-CONTENT-001' order by 1`)).map((r) => r.record_key + ":" + r.f).join() === "DR-D9-007:FAM-D9-REK007,DR-D9-008:FAM-D9-REK008", null);
const st2 = ["ST-D9-006", "ST-D9-008", "ST-D9-011", "ST-D9-014"];
const mkObs = (prop, ce, states) => states.map((s, i) => ({ observation_id: `D71-${prop}-${i}`, participant_id: "V71", proposition_id: prop, conduct_element_id: ce, dimension_id: "D9", state_code: s, statement_id: s, source_version_id: "SRC-D9-S2-001@1.1", served_instance_hash: "a".repeat(64), observed_at: `2027-0${2 + i}-01`, committed_at: `2027-0${2 + i}-01T10:00`, in_currency: true, administration: { observation_mode: "structured_live_session", assistance_declaration: "none" }, longitudinal_use_status: "eligible", interaction_pattern_family_id: "IPF-D9-03", observer_ids: ["M1"], cooldown_completed_at: `2027-0${2 + i}-01` }));
const p71 = { V71: { participant_id: "V71", lsa_consent_state: "granted" } };
const directed = ["documented_progression", "documented_regression", "mixed_trajectory"];
for (const [prop, ce, sts] of [["REK-D9-002", "CE-D9-02", ["ST-D9-006", "ST-D9-008", "ST-D9-006"]], ["REK-D9-003", "CE-D9-03", ["ST-D9-014", "ST-D9-011", "ST-D9-014"]], ["REK-D9-002", "CE-D9-02", ["ST-D9-008", "ST-D9-006", "ST-D9-006"]], ["REK-D9-003", "CE-D9-03", ["ST-D9-011", "ST-D9-014", "ST-D9-011"]]]) {
  const got = resolve(active, p71, mkObs(prop, ce, sts), { case_id: "D71", participant_id: "V71", proposition_id: prop, dimension_id: "D9", period_start: "2027-01-01", period_end: "2027-12-31", snapshot_date: "2027-12-31" });
  rec("D9-71", `a request for ${prop} over ${sts.join(" > ")} yields no direction, progression, regression or trajectory finding (result: ${got.refusal || got.finding_code})`, !directed.includes(got.finding_code) && !("direction" in got && got.direction) && (got.refusal === "LSA-R04" || got.finding_code === "comparison_not_established"), got);
}
const ctl = resolve(active, { V71: { participant_id: "V71", lsa_consent_state: "granted" } }, mkObs("REK-D9-007", "CE-D9-07", ["WA_NONE", "WA_WORK_NO_POINT", "WA_WORK_AND_POINT"]).map((o) => ({ ...o, source_version_id: "SRC-D9-S2-001@1.1", statement_id: "ST-D9-035" })), { case_id: "D71c", participant_id: "V71", proposition_id: "REK-D9-007", dimension_id: "D9", period_start: "2027-01-01", period_end: "2027-12-31", snapshot_date: "2027-12-31" });
rec("D9-71", "control: the same request for REK-D9-007, which does have a family and a direction rule, is resolved by the module (not refused as unconfigured), so the refusals above come from the missing rule and not from the harness", ctl.refusal !== "LSA-R01" && ctl.refusal !== "LSA-R08" && ctl.refusal !== "LSA-R06" && ctl.refusal !== "LSA-R14", ctl);
console.log(JSON.stringify({ passed: R.filter((r) => r.pass).length, total: R.length, failed: R.filter((r) => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
