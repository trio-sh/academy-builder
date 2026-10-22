import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import crypto from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
const dict = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const res = []; const add = (id, name, pass, detail) => res.push({ id, name, result: pass ? "PASS" : "FAIL", detail });
const q = async s => (await c.query(s)).rows;
await c.query("set search_path to public, extensions");
// 1 counts
const cnt = (await q("select count(*)::int n, count(*) filter (where status='ACTIVE')::int a, count(*) filter (where status='SOCKET')::int s, count(*) filter (where status='DORMANT')::int d from t3a_field_registry where dictionary_version='1.3'"))[0];
const exp = { n: dict.fields.length, a: dict.fields.filter(f => f.status === "ACTIVE").length, s: dict.fields.filter(f => f.status === "SOCKET").length, d: dict.fields.filter(f => f.status === "DORMANT").length };
add("R1", "field rows and status split match the dictionary", JSON.stringify(cnt) === JSON.stringify(exp), `db=${JSON.stringify(cnt)} dictionary=${JSON.stringify(exp)}`);
const pc = (await q("select count(*)::int n from t3a_field_prohibited_item where dictionary_version='1.3'"))[0].n;
add("R2", "prohibited items loaded", pc === dict.prohibited.length, `db=${pc} dictionary=${dict.prohibited.length}`);
// 2 content drift: hash of the identity tuple in db vs json
const keyOf = f => [f.qualified_name, f.canonical_type, f.status, f.if_absent, f.capture_state_field ?? "", f.store, f.irreversible ? "t" : "f", JSON.stringify(f.enum_values ?? null)].join("|");
const jsHash = crypto.createHash("sha256").update(dict.fields.map(keyOf).sort().join("\n")).digest("hex");
const rows = await q("select qualified_name, canonical_type, status, if_absent, coalesce(capture_state_field,'') csf, store, irreversible, enum_values from t3a_field_registry where dictionary_version='1.3'");
const dbHash = crypto.createHash("sha256").update(rows.map(r => [r.qualified_name, r.canonical_type, r.status, r.if_absent, r.csf, r.store, r.irreversible ? "t" : "f", JSON.stringify(r.enum_values ?? null)].join("|")).sort().join("\n")).digest("hex");
add("R3", "every row's identity, type, status, store and enum values equal the dictionary (hash compare)", jsHash === dbHash, `sha256 ${dbHash.slice(0, 16)} vs ${jsHash.slice(0, 16)}`);
const v = (await q("select source_sha256, field_count, event_count from t3a_field_registry_version where dictionary_version='1.3'"))[0];
const fileSha = crypto.createHash("sha256").update(fs.readFileSync(process.argv[2])).digest("hex");
add("R4", "version row records the sha256 of the dictionary file", v.source_sha256 === fileSha && v.field_count === 600 && v.event_count === dict.events.length, `recorded ${v.source_sha256.slice(0, 12)} file ${fileSha.slice(0, 12)}`);
// 3 append only
for (const [id, label, sql] of [["R5", "UPDATE on registry refused", "update t3a_field_registry set owner='x' where qualified_name='A.account_id'"], ["R6", "DELETE on registry refused", "delete from t3a_field_registry where qualified_name='A.account_id'"], ["R7", "DELETE on prohibited list refused", "delete from t3a_field_prohibited_item"], ["R8", "UPDATE on version row refused", "update t3a_field_registry_version set field_count=1"]]) {
  await c.query("begin"); let ok = false, d = "";
  try { await c.query(sql); d = "statement succeeded"; } catch (e) { ok = /T3A_APPEND_ONLY/.test(e.message); d = e.message.slice(0, 90); }
  await c.query("rollback"); add(id, label, ok, d);
}
// 4 access
c.query("grant anon, authenticated, service_role to neondb_owner").catch(()=>{}); await q("select 1");
for (const role of ["anon", "authenticated"]) {
  await c.query("begin"); let d, ok;
  try { await c.query(`set local role ${role}`); const r = await c.query("select count(*)::int n from t3a_field_registry"); ok = r.rows[0].n === 0; d = `rows visible: ${r.rows[0].n}`; } catch (e) { ok = /permission denied/.test(e.message); d = e.message.slice(0, 70); }
  await c.query("rollback"); add(role === "anon" ? "R9a" : "R9b", `${role} cannot read the registry`, ok, d);
}
// 5 DT-01 negative and positive paths
await c.query("begin"); await c.query("alter table t3a_field_physical_map disable trigger user"); await c.query("delete from t3a_field_physical_map"); // later migrations map the fields; this check starts from an empty map
const dt = (await q("select * from t3a_field_registry_dt01()"))[0];
add("D1", "DT-01 reports every ACTIVE/DORMANT field unmapped and does not pass", dt.passes === false && dt.unmapped === dt.fields_active_dormant && dt.resolved === 0, JSON.stringify(dt));
await c.query("insert into t3a_field_physical_map(dictionary_version,qualified_name,mapping_class,physical_table,physical_column) values ('1.3','A.account_id','M5','profiles','id')");
const d2 = (await q("select resolved, dangling_physical from t3a_field_registry_dt01()"))[0];
await c.query("rollback");
add("D2", "DT-01 counts a mapping to a real column as resolved", d2.resolved === 1 && d2.dangling_physical === 0, JSON.stringify(d2));
await c.query("begin"); await c.query("alter table t3a_field_physical_map disable trigger user"); await c.query("delete from t3a_field_physical_map");
await c.query("insert into t3a_field_physical_map(dictionary_version,qualified_name,mapping_class,physical_table,physical_column) values ('1.3','A.account_id','M5','profiles','no_such_column')");
const d3 = (await q("select resolved, dangling_physical, passes from t3a_field_registry_dt01()"))[0];
await c.query("rollback");
add("D3", "DT-01 flags a mapping to a column that does not exist", d3.dangling_physical === 1 && d3.passes === false, JSON.stringify(d3));
await c.query("begin"); let ok4 = false, det4 = "";
try { await c.query("insert into t3a_field_physical_map(dictionary_version,qualified_name,mapping_class,physical_table,physical_column,payload_path) values ('1.3','A.account_id','M1','profiles','id','x.y')"); det4 = "accepted"; } catch (e) { ok4 = /check constraint/.test(e.message); det4 = e.message.slice(0, 80); }
await c.query("rollback"); add("D4", "a field cannot map to both a column and a payload key", ok4, det4);
await c.query("begin"); let ok5 = false, det5 = "";
try { await c.query("insert into t3a_field_physical_map(dictionary_version,qualified_name,mapping_class) values ('1.3','Z.not_a_field','M5')"); det5 = "accepted"; } catch (e) { ok5 = /foreign key/.test(e.message); det5 = e.message.slice(0, 80); }
await c.query("rollback"); add("D5", "a map row for a field not in the registry is refused", ok5, det5);
// 6 STATE rule
const bad = (await q("select count(*)::int n from t3a_field_registry where (if_absent='STATE') <> (capture_state_field is not null)"))[0].n;
add("R10", "every STATE field names its capture_state companion, and only those", bad === 0, `violations=${bad}`);
console.log(JSON.stringify(res)); await c.end(); process.exit(0);
