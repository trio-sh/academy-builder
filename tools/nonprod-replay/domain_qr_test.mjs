// Day 1 step 11.1.17 probes (Domains Q and R; DT-55). Throwaway database only.
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
const P = randomUUID(), RUN = P.slice(0, 8);
await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${P}','q-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${P}','q-${RUN}@t.local','candidate')`);
// Q: every table is a closed socket
for (const [t, col] of [["t3a_aggregate_dataset_socket", "suppression_floor_k"], ["t3a_licensee_socket", "licensee_id"], ["t3a_research_socket", "research_protocol_id"], ["t3a_followup_socket", "followup_window"]]) {
  const x = await as(null, null, `insert into ${t}(${col}) values (${col === "suppression_floor_k" ? "5" : col === "followup_window" ? "'30d'" : "gen_random_uuid()"})`, false); rec("DT-08", `${t}: every write is refused`, /SOCKET_ROUTE_CLOSED/.test(x.msg), x.msg.slice(0, 60));
}
const anyRows = await run(`select (select count(*) from t3a_aggregate_dataset_socket)+(select count(*) from t3a_licensee_socket)+(select count(*) from t3a_research_socket)+(select count(*) from t3a_followup_socket) n`); rec("Q-empty", "the closed tables hold no rows", Number(anyRows[0].n) === 0, anyRows[0].n);
const anonQ = await as("anon", P, `select * from t3a_licensee_socket`, false); rec("Q-rls", "anonymous callers have no read path", /permission denied/.test(anonQ.msg), anonQ.msg.slice(0, 60));
// R
const po = (await run(`insert into t3a_partner_organization(organization_type, organization_industry_code) values ('workforce_agency','NAICS-61') returning partner_organization_id i`))[0].i;
const badT = await as(null, null, `insert into t3a_partner_organization(organization_type, organization_industry_code) values ('club','x')`, false); rec("R-org", "an organization type outside the seven listed values is refused", /check|violat/i.test(badT.msg), badT.msg.slice(0, 70));
const imm = await as(null, null, `update t3a_partner_organization set organization_type='employer' where partner_organization_id='${po}'`, false); rec("R-org", "the organization type is fixed", /IMMUTABLE_COLUMN/.test(imm.msg), imm.msg.slice(0, 70));
await run(`update t3a_partner_organization set partner_relationship_effective_at = now() where partner_organization_id='${po}'`);
const chg = await as(null, null, `update t3a_partner_organization set partner_relationship_effective_at = now() + interval '1 day' where partner_organization_id='${po}'`, false); rec("R-org", "the relationship start is set once", /SET_ONCE/.test(chg.msg), chg.msg.slice(0, 70));
const prog = (await run(`insert into t3a_program(partner_organization_id, program_version) values ('${po}','1.0') returning organization_program_id i`))[0].i;
const progUpd = await as(null, null, `update t3a_program set program_version='1.1' where organization_program_id='${prog}'`, false); rec("R-program", "a program version is never edited", /APPEND_ONLY/.test(progUpd.msg), progUpd.msg.slice(0, 70));
const badProgV = await as(null, null, `insert into t3a_program(partner_organization_id, program_version) values ('${po}','v1')`, false); rec("R-program", "a program version must be a version string", /check|violat/i.test(badProgV.msg), badProgV.msg.slice(0, 70));
const mem = (await run(`insert into t3a_program_membership(account_id, organization_program_id) values ('${P}','${prog}') returning program_membership_id i`))[0].i;
await run(`update t3a_program_membership set program_exit_at = now() + interval '1 hour' where program_membership_id='${mem}'`);
const exitAgain = await as(null, null, `update t3a_program_membership set program_exit_at = now() + interval '2 hours' where program_membership_id='${mem}'`, false); rec("R-member", "the exit time is set once", /SET_ONCE/.test(exitAgain.msg), exitAgain.msg.slice(0, 70));
const cohort = await as(null, null, `insert into t3a_cohort(cohort_type, cohort_definition_version, operating_jurisdiction_code, jurisdiction_rule_version) values ('pilot','1.0','CA-ON','1.0') returning cohort_id`, false); rec("R-cohort", "a cohort is stored with its type, definition and jurisdiction", cohort.msg === "ok", cohort.msg.slice(0, 80));
const badJ = await as(null, null, `insert into t3a_cohort(cohort_type, cohort_definition_version, operating_jurisdiction_code, jurisdiction_rule_version) values ('pilot','1.0','Ontario','1.0')`, false); rec("R-cohort", "a jurisdiction that is not a code is refused", /check|violat/i.test(badJ.msg), badJ.msg.slice(0, 70));
const badC = await as(null, null, `insert into t3a_cohort(cohort_type, cohort_definition_version, operating_jurisdiction_code, jurisdiction_rule_version) values ('class','1.0','CA','1.0')`, false); rec("R-cohort", "a cohort type outside pilot, program, design_partner is refused", /check|violat/i.test(badC.msg), badC.msg.slice(0, 70));
// DT-55
const second = (await run(`insert into t3a_partner_organization(organization_type, organization_industry_code) values ('employer','NAICS-62') returning partner_organization_id i`))[0].i;
const vis = (await run(`select t3a_partner_visible('${po}') a, t3a_partner_visible('${second}') b`))[0]; rec("DT-55", "no organization can see another organization's records", vis.a === false && vis.b === false, vis);
for (const t of ["t3a_partner_organization", "t3a_program", "t3a_program_membership", "t3a_cohort"]) { const x = await as("authenticated", P, `select 1 from ${t}`, false); rec("DT-55", `${t}: no client read path`, /permission denied/.test(x.msg), x.msg.slice(0, 60)); }
const tenant = await as(null, null, `insert into t3a_institutional_socket(institutional_tenant_id) values (gen_random_uuid())`, false); rec("DT-55", "institutional_tenant_id stays empty: the socket refuses writes", /SOCKET_ROUTE_CLOSED/.test(tenant.msg), tenant.msg.slice(0, 60));
const mapQ = (await run(`select count(*)::int n from t3a_field_physical_map where qualified_name like 'Q.%'`))[0].n, mapR = (await run(`select count(*)::int n from t3a_field_physical_map where qualified_name like 'R.%'`))[0].n; rec("DT-01(Q,R)", "all 31 Domain Q and 18 Domain R fields mapped", mapQ === 31 && mapR === 18, [mapQ, mapR]);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
