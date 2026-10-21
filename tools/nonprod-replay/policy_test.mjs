import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
const A = "aaaaaaaa-0000-4000-8000-00000000000a", B = "bbbbbbbb-0000-4000-8000-00000000000b", M = "cccccccc-0000-4000-8000-00000000000c";
const mode = process.argv[2];
async function exec(s) { return c.query(s); }
if (mode === "seed") {
  await exec("set search_path to public, extensions");
  await exec("grant anon, authenticated, service_role to neondb_owner");
  await exec(`delete from growth_log_entries; delete from growth_logs; delete from mentor_assignments; delete from candidate_profiles where id in ('${A}','${B}'); delete from mentor_profiles where id in ('${A}','${B}','${M}'); delete from notifications; delete from profiles where id in ('${A}','${B}','${M}'); delete from auth.users where id in ('${A}','${B}','${M}')`);
  for (const [id, e] of [[A, "a@test.local"], [B, "b@test.local"], [M, "m@test.local"]]) {
    await exec(`insert into auth.users(id,email) values ('${id}','${e}')`);
    await exec(`insert into profiles(id,email) values ('${id}','${e}')`);
  }
  await exec(`insert into growth_log_entries(candidate_id,event_type,title) values ('${A}','signup','A entry'),('${B}','signup','B entry')`);
  await exec(`insert into growth_logs(candidate_id,log_type,title) values ('${A}','x','A log'),('${B}','x','B log')`);
  await exec(`insert into mentor_profiles(id,profile_id) values ('${M}','${M}')`).catch(e => console.log('mentor_profiles seed:', e.message));
  await exec(`insert into candidate_profiles(id,profile_id) values ('${A}','${A}')`).catch(e => console.log('candidate_profiles seed:', e.message));
  await exec(`insert into mentor_assignments(mentor_id,candidate_id) values ('${M}','${A}')`);
  console.log("seeded"); await c.end(); process.exit(0);
}
async function probe(name, role, sub, sql) {
  await exec("begin"); let res;
  try {
    await exec(`set local role ${role}`);
    if (sub) await exec(`select set_config('request.jwt.claim.sub','${sub}',true), set_config('request.jwt.claim.role','${role}',true)`);
    const r = await exec(sql); res = r.command === "SELECT" ? `rows=${r.rows.length}${r.rows[0]?.n !== undefined ? " n=" + r.rows[0].n : ""}` : `${r.command} rowCount=${r.rowCount}`;
  } catch (e) { res = "DENIED: " + e.message.slice(0, 70); }
  await exec("rollback"); return { name, res };
}
const probes = [
  ["1 A reads growth entries (all visible?)", "authenticated", A, "select count(*)::int n from growth_log_entries"],
  ["2 A updates B's growth entry", "authenticated", A, `update growth_log_entries set title='x' where candidate_id='${B}'`],
  ["3 A deletes B's growth entry", "authenticated", A, `delete from growth_log_entries where candidate_id='${B}'`],
  ["4 A inserts an entry for B", "authenticated", A, `insert into growth_log_entries(candidate_id,event_type,title) values ('${B}','signup','forged')`],
  ["5 A inserts own entry", "authenticated", A, `insert into growth_log_entries(candidate_id,event_type,title) values ('${A}','signup','mine')`],
  ["6 A updates own entry", "authenticated", A, `update growth_log_entries set title='edited' where candidate_id='${A}'`],
  ["7 mentor M reads A's growth entries", "authenticated", M, `select count(*)::int n from growth_log_entries where candidate_id='${A}'`],
  ["8 A reads growth_logs (all visible?)", "authenticated", A, "select count(*)::int n from growth_logs"],
  ["9 anon reads mentor_assignments", "anon", null, "select count(*)::int n from mentor_assignments"],
  ["10 anon updates mentor_assignments", "anon", null, "update mentor_assignments set status = status"],
  ["11 anon inserts notifications", "anon", null, `insert into notifications(user_id,type,title,message) values ('${A}','t','t','m')`],
  ["12 A inserts own notification", "authenticated", A, `insert into notifications(user_id,type,title,message) values ('${A}','t','t','m')`],
  ["13 anon reads public training modules", "anon", null, "select count(*)::int n from bridgefast_modules"],
  ["14 service_role reads growth entries", "service_role", null, "select count(*)::int n from growth_log_entries"],
];
await exec("set search_path to public, extensions");
const out = []; for (const p of probes) out.push(await probe(...p));
console.log(JSON.stringify(out)); await c.end(); process.exit(0);
