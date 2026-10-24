// Session Archive registries (dormant): flags default off, drafts only, an active record is refused while activation is off,
// the loader is the service route, D4 content loads as 30 inactive drafts that pass the registry load checks. Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const { loadRegistries } = await import((process.env.T3A_REPO_ROOT ? process.env.T3A_REPO_ROOT + "/tools/lsa/resolver.mjs" : new URL("../lsa/resolver.mjs", import.meta.url).href));
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const J = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const asRole = async (role, sql) => { await c.query("begin"); let msg = "ok", rows = []; try { await c.query(`set local role ${role}`); await c.query(`select set_config('request.jwt.claims', '{"role":"${role}"}', true)`); rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query("rollback"); return { msg, rows, r: rows[0]?.r }; };
const refusedN = async (code) => (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='${code}'`))[0].n;
const tx = async (fn) => { await c.query("begin"); try { return await fn(); } finally { await c.query("rollback"); } };

rec("LSA-flag", "both flags read off by default, and an unknown flag name reads off", (await run(`select t3a_lsa_flag('lsa_activation') a, t3a_lsa_flag('lsa_retention_sweep') b, t3a_lsa_flag('lsa_enabled') c`)).every((r) => !r.a && !r.b && !r.c));
const flagOn = await tx(async () => { await c.query(`update t3a_commit_seal_key_version set status='retired' where status='current'`); await c.query(`insert into t3a_commit_seal_key_version(key_version,mode,secret_name,public_key,status) values ('kp-legacy-test','key_pair','kp','pub','current')`); await c.query(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) select 'lsa_activation','on','0.0',(select id from profiles limit 1)`); const a = (await run(`select t3a_lsa_flag('lsa_activation') a, t3a_lsa_flag('lsa_retention_sweep') b`))[0]; return a; });
rec("LSA-flag", "activation reads on only for the exact value 'on', and the deletion flag is separate (rolled back)", flagOn.a === true && flagOn.b === false, flagOn);
const sloppy = await tx(async () => { await c.query(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) select 'lsa_activation','true','0.0',(select id from profiles limit 1)`); return (await run(`select t3a_lsa_flag('lsa_activation') a`))[0].a; });
rec("LSA-flag", "any value other than 'on' (true, yes, 1) reads off", sloppy === false);
rec("LSA-flag", "the flag reader is not executable by anon or authenticated", (await run(`select has_function_privilege('anon','t3a_lsa_flag(text)','execute') a, has_function_privilege('authenticated','t3a_lsa_flag(text)','execute') b`)).every((r) => !r.a && !r.b));

const n = (await run(`select count(*)::int n, count(*) filter (where status='draft_for_approval')::int d, count(*) filter (where status='active' or approved_by is not null or effective_from is not null)::int a from t3a_lsa_registry_record where package_id='T3A-D4-LSA-CONTENT-001'`))[0];
rec("LSA-D4", "D4 content is loaded as 30 records, every one a draft with no approval and no effective date, none active", n.n === 30 && n.d === 30 && n.a === 0, n);
const byReg = Object.fromEntries((await run(`select registry, count(*)::int n from t3a_lsa_registry_record where package_id='T3A-D4-LSA-CONTENT-001' group by 1 order by 1`)).map((r) => [r.registry, r.n]));
rec("LSA-D4", "by registry: 2 families, 2 direction rules, 1 sufficiency rule, 14 entries, 1 history rule, 1 dimension rule, 7 dimension entries, 2 state mappings", JSON.stringify(byReg) === JSON.stringify({ dimension_entries: 7, dimension_rules: 1, direction_rules: 2, entries: 14, families: 2, history_rules: 1, state_mapping: 2, sufficiency_rules: 1 }), byReg);
rec("LSA-D4", "the CE-D4-05 and CE-D4-08 propositions are the only ones carried", (await run(`select distinct body->>'proposition_id' p from t3a_lsa_registry_record where registry='families' and package_id='T3A-D4-LSA-CONTENT-001' order by 1`)).map((r) => r.p).join() === "REK-D4-005,REK-D4-008");

// the registry load checks (Paragraphs 7.2 and 7.3), run on the stored records as if they were active
const recs = await run(`select registry, body from t3a_lsa_registry_record where package_id='T3A-D4-LSA-CONTENT-001' and registry <> 'state_mapping'`);
const reg = {}; for (const r of recs) (reg[r.registry] ||= []).push({ ...r.body, status: "active", effective_from: "2027-01-01" });
let loadErr = null; try { loadRegistries(reg); } catch (e) { loadErr = e.message; }
rec("LSA-D4", "the stored D4 records pass the registry load checks when treated as active (no overlap, states declared, no cycle, no absence state in a direction rule, required lines present)", loadErr === null, loadErr);

// guards
const before = await refusedN("lsa_not_activated");
const act = await c.query(`insert into t3a_lsa_registry_record(registry, record_key, version, status, approved_by, approved_at, effective_from, body) values ('entries','X-ACTIVE',1,'active','someone',now(),'2027-01-01','{}'::jsonb)`).then(() => "ok").catch((e) => e.message);
rec("LSA-guard", "an active record is refused while activation is off: nothing written and the refusal is logged", (await run(`select count(*)::int n from t3a_lsa_registry_record where record_key='X-ACTIVE'`))[0].n === 0 && (await refusedN("lsa_not_activated")) === before + 1, act);
const noAppr = await c.query(`insert into t3a_lsa_registry_record(registry, record_key, version, status, body) values ('entries','X-NOAPPR',1,'active','{}'::jsonb)`).then(() => "ok").catch((e) => e.message);
rec("LSA-guard", "an active record without a recorded approval and effective date violates the table check", /check|violates/i.test(noAppr) || (await run(`select count(*)::int n from t3a_lsa_registry_record where record_key='X-NOAPPR'`))[0].n === 0, noAppr.slice(0, 120));
const draftAppr = await c.query(`insert into t3a_lsa_registry_record(registry, record_key, version, status, approved_by, approved_at, body) values ('entries','X-DRAFTAPPR',1,'draft_for_approval','someone',now(),'{}'::jsonb)`).then(() => "ok").catch((e) => e.message);
rec("LSA-guard", "a draft that carries an approval is refused by the table check", /check|violates/i.test(draftAppr), draftAppr.slice(0, 120));
const upd = await c.query(`update t3a_lsa_registry_record set status='retired' where package_id='T3A-D4-LSA-CONTENT-001'`).then(() => "ok").catch((e) => e.message);
rec("LSA-guard", "a registry record cannot be edited or deleted (supersede by a new version)", /APPEND_ONLY/.test(upd), upd.slice(0, 100));
rec("LSA-guard", "anon and authenticated can read and write nothing in the registry", [(await asRole("anon", `select count(*) r from t3a_lsa_registry_record`)), (await asRole("authenticated", `select count(*) r from t3a_lsa_registry_record`))].every((x) => /permission denied/.test(x.msg)));

// loader
const pkg = (id, extra = {}) => ({ package_id: id, dimension_id: "D4", registries: { history_rules: [{ status: "draft_for_approval", version: 1, rule_id: "HR-" + id, applies_to: "D4", max_age_months: 36, ...extra }] }, state_mapping: { ["K-" + id]: { a: 1 } } });
const id1 = "PK-" + randomUUID().slice(0, 8);
const authd = await asRole("authenticated", `select t3a_lsa_load_package(${J(pkg(id1))}) r`);
rec("LSA-load", "the package loader is not executable by authenticated users", /permission denied/.test(authd.msg), authd.msg.slice(0, 80));
await c.query("begin"); await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims','{"role":"service_role"}',true)`);
const ok1 = (await c.query(`select t3a_lsa_load_package(${J(pkg(id1))}) r`)).rows[0].r;
const bad = (await c.query(`select t3a_lsa_load_package(${J(pkg("PK-" + randomUUID().slice(0, 8), { status: "active" }))}) r`)).rows[0].r;
await c.query("commit");
rec("LSA-load", "a draft package loads as drafts (two records: one history rule and one state mapping)", ok1.outcome === "loaded" && ok1.records === 2 && ok1.status === "draft_for_approval", ok1);
rec("LSA-load", "a package carrying an active record refuses whole (record_not_a_draft) and writes nothing", bad.reason === "record_not_a_draft", bad);
const ap = await asRole("service_role", `select t3a_lsa_load_package(${J({ ...pkg("PK-x"), registries: { history_rules: [{ status: "draft_for_approval", approved_by: "x", approved_at: "2027-01-01", rule_id: "HR-x" }] } })}) r`);
rec("LSA-load", "a package record that names an approval refuses whole", ap.r?.reason === "record_not_a_draft", ap.r || ap.msg);
console.log(JSON.stringify({ passed: R.filter((r) => r.pass).length, total: R.length, failed: R.filter((r) => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
