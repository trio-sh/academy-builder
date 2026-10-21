// CR-067: free practice progress through the rehearsal store. Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
async function as(role, sub, sql, commit = true) {
  await c.query("begin"); let msg = "ok", rows = [];
  try { if (role) { await c.query(`set local role ${role}`); await c.query(`select set_config('request.jwt.claim.sub','${sub}',true), set_config('request.jwt.claims', json_build_object('sub','${sub}','role','${role}')::text, true)`); } rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; }
  await c.query(msg !== "ok" || !commit ? "rollback" : "commit"); return { msg, rows };
}
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const A = randomUUID(), B = randomUUID(), RUN = A.slice(0, 8);
for (const [u, e] of [[A, "a"], [B, "b"]]) { await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','rp${e}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','rp${e}-${RUN}@t.local','candidate')`); }
const w1 = await as("authenticated", A, `select t3a_rehearsal_record_practice('conflict-opening', 'partial') s`), w2 = await as("authenticated", A, `select t3a_rehearsal_record_practice('conflict-opening', 'complete') s`);
rec("CR-067", "a participant records a practice, twice; both are kept", w1.msg === "ok" && w2.msg === "ok" && (await run(`select count(*)::int n from t3a_rehearsal_session where participant_id='${A}'`))[0].n === 2, [w1.msg.slice(0, 60), w2.msg.slice(0, 60)]);
const pr = await as("authenticated", A, `select * from t3a_rehearsal_progress()`); rec("CR-067", "progress shows one row per module with the latest state", pr.rows.length === 1 && pr.rows[0].module_slug === "conflict-opening" && pr.rows[0].completion_state === "complete", pr.rows);
const other = await as("authenticated", B, `select * from t3a_rehearsal_progress()`); rec("CR-067", "another participant sees none of it", other.rows.length === 0);
const anon = await as("anon", A, `select t3a_rehearsal_record_practice('x')`, false); rec("CR-067", "anonymous callers cannot record", /permission denied/.test(anon.msg), anon.msg.slice(0, 60));
const bad = await as("authenticated", A, `select t3a_rehearsal_record_practice('Bad Slug!')`, false); rec("CR-067", "a slug that is not a slug is refused", /check|violat/i.test(bad.msg), bad.msg.slice(0, 70));
const badState = await as("authenticated", A, `select t3a_rehearsal_record_practice('ok-slug','finished')`, false); rec("CR-067", "a completion state outside the three listed is refused", /T3A_REHEARSAL_STATE/.test(badState.msg), badState.msg.slice(0, 70));
const direct = await as("authenticated", A, `select count(*) from t3a_rehearsal_module`, false); rec("CR-067", "the module registry has no client read path", /permission denied/.test(direct.msg), direct.msg.slice(0, 70));
const fw = await run(`select * from t3a_rehearsal_firewall_findings()`); rec("DT-32", "the rehearsal firewall still reports nothing", fw.length === 0, fw);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
