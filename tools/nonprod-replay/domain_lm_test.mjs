// Day 1 step 11.1.15 probes (Domains L and M: orders, dormant Session Archive structures). Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
async function as(role, sub, sql, commit = true) {
  await c.query("begin"); let msg = "ok", rows = [];
  try {
    if (role) { await c.query(`set local role ${role}`); await c.query(`select set_config('request.jwt.claim.sub','${sub}',true), set_config('request.jwt.claims', json_build_object('sub','${sub}','role','${role}')::text, true)`); }
    rows = (await c.query(sql)).rows;
  } catch (e) { msg = e.message; }
  await c.query(msg !== "ok" || !commit ? "rollback" : "commit"); return { msg, rows };
}
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const P = randomUUID(), Q = randomUUID(), RUN = P.slice(0, 8);
for (const [u, e] of [[P, "p"], [Q, "q"]]) { await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','l${e}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','l${e}-${RUN}@t.local','candidate')`); }
const ord = (acc, extra = "") => `insert into t3a_order(account_id, product_code, package_code, package_entitlements, access_starts_at, access_ends_at, price_amount, currency, tax_jurisdiction, founding_member_flag, payment_provider_ref ${extra ? ", " + extra.split("|")[0] : ""}) values ('${acc}','OBS','PKG-1','{observation_engagements,access_duration}', now() - interval '1 day', now() + interval '30 days', 149.00, 'CAD', 'CA-ON', true, 'pi_${RUN}' ${extra ? ", " + extra.split("|")[1] : ""}) returning order_id`;
const o = (await run(ord(P)))[0].order_id; rec("L-order", "an order is stored with its entitlements, window, price, currency and tax jurisdiction", !!o);
rec("L-access", "the account is inside its paid access window", (await run(`select t3a_account_has_paid_access('${P}') a`))[0].a === true && (await run(`select t3a_account_has_paid_access('${Q}') a`))[0].a === false);
const badEnt = await as(null, null, ord(P).replace("{observation_engagements,access_duration}", "{evidence_upgrade}"), false); rec("L-order", "an entitlement outside the three listed is refused", /check|violat/i.test(badEnt.msg), badEnt.msg.slice(0, 80));
const badCur = await as(null, null, ord(P).replace("'CAD'", "'cad'"), false); rec("L-order", "a currency that is not a three letter upper case code is refused", /check|violat/i.test(badCur.msg), badCur.msg.slice(0, 80));
const badWin = await as(null, null, ord(P).replace("now() + interval '30 days'", "now() - interval '2 days'"), false); rec("L-order", "an access window that ends before it starts is refused", /check|violat/i.test(badWin.msg), badWin.msg.slice(0, 80));
const neg = await as(null, null, ord(P).replace("149.00", "-5"), false); rec("L-order", "a negative price is refused", /check|violat/i.test(neg.msg), neg.msg.slice(0, 80));
const upd = await as(null, null, `update t3a_order set price_amount = 0 where order_id='${o}'`, false); rec("L-order", "an order cannot be edited", /APPEND_ONLY/.test(upd.msg), upd.msg.slice(0, 70));
await run(`insert into t3a_refund(order_id) values ('${o}')`);
rec("L-refund", "a refund ends paid access without changing the order", (await run(`select t3a_account_has_paid_access('${P}') a`))[0].a === false);
const own = await as("authenticated", P, `select count(*)::int n from t3a_order`), oth = await as("authenticated", Q, `select count(*)::int n from t3a_order`); rec("L-rls", "a participant reads only their own orders", own.rows[0].n === 1 && oth.rows[0].n === 0, [own.rows[0], oth.rows[0]]);
const wr = await as("authenticated", P, ord(P), false); rec("L-rls", "a signed in user cannot write an order directly", /permission denied/.test(wr.msg), wr.msg.slice(0, 70));
const noEvid = await run(`select count(*)::int n from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_class p on p.oid=k.confrelid where k.contype='f' and c.relname in ('t3a_order','t3a_refund') and p.relname not in ('t3a_account','t3a_order')`); rec("L-boundary", "orders point only at accounts and orders; no foreign key reaches evidence, reports or scores", noEvid[0].n === 0, noEvid[0].n);
const sub = await as(null, null, `insert into t3a_subscription_socket(subscription_plan) values ('monthly')`, false); rec("L-socket", "the subscription socket refuses every write", /SOCKET_ROUTE_CLOSED/.test(sub.msg), sub.msg.slice(0, 70));
// M
for (const t of ["t3a_lsa_snapshot", "t3a_lsa_report", "t3a_longitudinal_case", "t3a_lsa_sidecar"]) {
  const x = await as(null, null, `insert into ${t}(account_id) values ('${P}')`, false); rec("M-dormant", `${t}: every write is refused`, /SOCKET_ROUTE_CLOSED/.test(x.msg), x.msg.slice(0, 70));
}
const tab = (await run(`select session_archive_tab_state s from t3a_session_archive_tab`)); rec("M-tab", "the Session Archive tab exists and is frozen", tab.length === 1 && tab[0].s === "frozen", tab);
const thaw = await as(null, null, `update t3a_session_archive_tab set session_archive_tab_state='open'`, false); rec("M-tab", "the tab cannot be set to anything but frozen", /check|violat|FROZEN/.test(thaw.msg), thaw.msg.slice(0, 80));
const anonTab = await as("anon", P, `select * from t3a_session_archive_tab`, false); rec("M-tab", "anonymous callers cannot read the tab state", /permission denied/.test(anonTab.msg), anonTab.msg.slice(0, 70));
const readsLsa = await run(`select count(*)::int n from pg_proc p where p.pronamespace='public'::regnamespace and pg_get_functiondef(p.oid) ~* 'growth_log' and pg_get_functiondef(p.oid) ~* 'lsa_'`); rec("DT-31", "no database function reads both the Growth Log and the Session Archive tables", readsLsa[0].n === 0, readsLsa[0].n);
const mapL = (await run(`select count(*)::int n from t3a_field_physical_map where qualified_name like 'L.%'`))[0].n, mapM = (await run(`select count(*)::int n from t3a_field_physical_map where qualified_name like 'M.%'`))[0].n; rec("DT-01(L,M)", "all 17 Domain L and 18 Domain M fields mapped", mapL === 17 && mapM === 18, [mapL, mapM]);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
