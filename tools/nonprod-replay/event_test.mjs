import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import path from "node:path";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
const pkg = process.argv[2]; const dict = JSON.parse(fs.readFileSync(path.join(pkg, "T3A-DEV-DAY1-001_Field_Dictionary_v1.3.json"), "utf8"));
const fxDir = path.join(pkg, "test/fixtures/events");
const res = []; const add = (id, name, pass, detail) => res.push({ id, name, result: pass ? "PASS" : "FAIL", detail: String(detail).slice(0, 300) });
const q = async (s, p) => (await c.query(s, p)).rows;
const uuid = () => crypto.randomUUID();
await c.query("set search_path to public, extensions");
await c.query("grant anon, authenticated, service_role to neondb_owner").catch(() => {});
await c.query("truncate public.t3a_event_log, public.t3a_event_idempotency, public.t3a_event_rejection, public.t3a_quality_event");
const _prevIngest = (await c.query("select value from public.t3a_event_config where key='ingest_mode'")).rows[0].value;   // restored at the end: a switch rehearsal runs with it strict
await c.query("update public.t3a_event_config set value='legacy_tolerant' where key='ingest_mode'");
const ing = async (o) => (await q("select public.t3a_ingest_event($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14) r",
  [o.name, o.actor_type ?? "SYSTEM_SERVICE", o.actor_ref ?? "svc_platform", o.role ?? "system_service", o.rtype ?? "test_resource", o.rid ?? uuid(), JSON.stringify(o.payload),
   o.key ?? ("k-" + uuid()), o.occurred ?? null, o.subject ?? null, null, null, "internal_job", o.prop ?? "synthetic_test"]))[0].r;

// ---- registry facts
const rc = (await q("select count(*)::int n, count(*) filter (where status='ACTIVE')::int a, count(*) filter (where status='DORMANT')::int d, count(*) filter (where status='SOCKET')::int s from t3a_event_registry"))[0];
const exp = { n: dict.events.length, a: dict.events.filter(e => e.status === "ACTIVE").length, d: dict.events.filter(e => e.status === "DORMANT").length, s: dict.events.filter(e => e.status === "SOCKET").length };
add("E1", "event registry holds every dictionary event with the same status split", JSON.stringify(rc) === JSON.stringify(exp), `db=${JSON.stringify(rc)} dictionary=${JSON.stringify(exp)}`);

// ---- DT-23 / DT-64: every fixture, full and minimal
const fixtures = fs.readdirSync(fxDir).filter(f => f.endsWith(".json")).map(f => ({ f, j: JSON.parse(fs.readFileSync(path.join(fxDir, f), "utf8")) }));
const status = Object.fromEntries(dict.events.map(e => [e.name, e.status]));
let okN = 0, sockOk = 0, sockN = 0; const bad = [];
for (const { f, j } of fixtures) {
  const st = status[j.event_name];
  const r = await ing({ name: j.event_name, actor_type: j.actor_type, actor_ref: j.actor_id, role: j.actor_role_code, rtype: j.resource_type, rid: j.resource_id, payload: j.payload, occurred: j.occurred_at, subject: j.subject_id ?? null, key: "fx-" + f });
  if (st === "SOCKET") { sockN++; if (r.outcome === "rejected" && r.reason === "EVENT_SOCKET_ROUTE_CLOSED") sockOk++; else bad.push(`${f}: SOCKET not refused (${r.outcome})`); }
  else if (r.outcome === "accepted") okN++; else bad.push(`${f}: ${r.outcome} ${r.reason} ${JSON.stringify(r.detail)}`);
}
const expectOk = fixtures.filter(x => status[x.j.event_name] !== "SOCKET").length;
add("E2", "DT-23/64: every ACTIVE and DORMANT fixture (full and minimal) is accepted", okN === expectOk, `${okN}/${expectOk} accepted of ${fixtures.length} fixtures; ${bad.slice(0, 3).join(" | ")}`);
add("E3", "SOCKET events are refused and logged (12.1.4)", sockN > 0 && sockOk === sockN, `${sockOk}/${sockN}`);

// ---- DT-25 unknown name
const jb = (await q("select count(*)::int n from t3a_event_rejection"))[0].n;
const ru = await ing({ name: "bogus.event", payload: {} });
const ja = (await q("select count(*)::int n from t3a_event_rejection"))[0].n; const stored = (await q("select count(*)::int n from t3a_event_log where event_name='bogus.event'"))[0].n;
add("E4", "DT-25: unknown event name is rejected, logged in the journal, and not stored", ru.outcome === "rejected" && ru.reason === "EVENT_NOT_REGISTERED" && ja === jb + 1 && stored === 0, JSON.stringify(ru));

// ---- negative payload parity: remove each required key, add an unknown key
let negN = 0, negBad = [];
for (const e of dict.events) {
  const fx = fixtures.find(x => x.j.event_name === e.name && x.f.includes("minimal")) ?? fixtures.find(x => x.j.event_name === e.name); if (!fx) continue;
  for (const k of e.payload_schema.required) {
    const p = { ...fx.j.payload }; delete p[k];
    const v = (await q("select public.t3a_check_event_payload($1,$2::jsonb,$3) v", [e.name, JSON.stringify(p), "2026-10-18T10:00:00Z"]))[0].v;
    negN++; if (!v.some(x => x === "MISSING_KEY:" + k) && !v.some(x => x.startsWith("CONDITIONAL") || x.startsWith("REQUIRE_ANY"))) negBad.push(`${e.name} -${k}: ${v}`);
  }
  const p2 = { ...fx.j.payload, zz_unknown_key: "x" };
  const v2 = (await q("select public.t3a_check_event_payload($1,$2::jsonb,$3) v", [e.name, JSON.stringify(p2), "2026-10-18T10:00:00Z"]))[0].v;
  negN++; if (!v2.includes("UNKNOWN_KEY:zz_unknown_key")) negBad.push(`${e.name} +unknown: ${v2}`);
}
add("E5", "DT-23: removing any required key, or adding an unknown key, fails the schema", negBad.length === 0, `${negN} mutations, ${negBad.length} not caught; ${negBad.slice(0, 3).join(" | ")}`);

// ---- DT-65 conditional requiredness
const fxOf = n => fixtures.find(x => x.j.event_name === n && !x.f.includes("minimal")) ?? fixtures.find(x => x.j.event_name === n);
const chk = async (n, p) => (await q("select public.t3a_check_event_payload($1,$2::jsonb,$3) v", [n, JSON.stringify(p), "2026-10-18T10:00:00Z"]))[0].v;
const rg = fxOf("account.role_granted").j.payload; const se = fxOf("observation.stage_entered").j.payload; const pr = fxOf("privacy.request_changed").j.payload;
const t1 = await chk("account.role_granted", { ...rg, role_code: "participant", participant_pseudonym_ref: rg.participant_pseudonym_ref ?? uuid() });
const t2 = await chk("account.role_granted", (({ participant_pseudonym_ref, ...r }) => ({ ...r, role_code: "participant" }))(rg));
const t3 = await chk("account.role_granted", { ...rg, role_code: "mentor", participant_pseudonym_ref: uuid() });
const t4 = await chk("account.role_granted", (({ participant_pseudonym_ref, ...r }) => ({ ...r, role_code: "mentor" }))(rg));
const s1 = await chk("observation.stage_entered", (({ entry_authority_actor_id, ...r }) => ({ ...r, stage_code: "S1" }))(se));
const s2 = await chk("observation.stage_entered", (({ entry_authority_actor_id, ...r }) => ({ ...r, stage_code: "S2" }))(se));
const p0 = await chk("privacy.request_changed", (({ data_access_request_id, data_correction_request_id, ...r }) => r)(pr));
add("E6", "DT-65: conditional rules (participant grant needs a pseudonym, others forbid it; S2 and S4 need an entry authority; a privacy request needs one of two ids)",
  t1.length === 0 && t2.some(x => x.startsWith("CONDITIONAL_REQUIRE")) && t3.some(x => x.startsWith("CONDITIONAL_FORBID")) && t4.length === 0 && !s1.some(x => x.startsWith("CONDITIONAL")) && s2.some(x => x.startsWith("CONDITIONAL_REQUIRE")) && p0.some(x => x.startsWith("REQUIRE_ANY")),
  JSON.stringify({ t1, t2, t3, t4, s1, s2, p0 }));
const big = await chk("governance.control_operated", { control_run_id: "x".repeat(5000) });
add("E7", "payloads over 4096 bytes are flagged", big.includes("PAYLOAD_TOO_LARGE"), big.join(","));

// ---- hash chain (DT-24) and append-only (DT-22)
const rid = uuid(); const ids = [];
for (let i = 0; i < 3; i++) { const r = await ing({ name: "account.email_verified", rid, rtype: "chain_test", payload: { account_id: uuid(), email_verified_at: "2026-10-18T09:59:00Z" } }); ids.push(r.event_id); }
const ch = await q("select event_sequence_no n, previous_hash p, integrity_hash h, event_id, event_name, occurred_at, actor_id, payload from t3a_event_log where stream_key=$1 order by 1", ["chain_test:" + rid]);
const genesis = "0".repeat(64);
const linked = ch.length === 3 && ch[0].p === genesis && ch[1].p === ch[0].h && ch[2].p === ch[1].h && ch.map(x => x.n).join() === "1,2,3";
const recomputed = (await q("select count(*)::int n from t3a_event_log e where e.stream_key=$1 and e.integrity_hash = public.t3a_event_canonical_hash(e.event_id,e.event_name,e.occurred_at,e.actor_id,e.payload)", ["chain_test:" + rid]))[0].n;
add("E8", "hash chain: sequence 1..3, first links to genesis, each links to the one before, hashes recompute", linked && recomputed === 3, `seq=${ch.map(x => x.n)} recomputed=${recomputed}`);
const base = await q("select * from public.t3a_verify_event_chain(interval '24 hours', false)");
add("E9", "verification finds nothing wrong on an untouched log", base.length === 0, JSON.stringify(base.slice(0, 2)));
let upd = "", del = "";
await c.query("begin"); try { await c.query("update t3a_event_log set payload='{}'::jsonb where event_id=$1", [ids[1]]); upd = "update succeeded"; } catch (e) { upd = e.message; } await c.query("rollback");
await c.query("begin"); try { await c.query("delete from t3a_event_log where event_id=$1", [ids[1]]); del = "delete succeeded"; } catch (e) { del = e.message; } await c.query("rollback");
add("E10", "DT-22: UPDATE and DELETE on the event log are refused for the table owner", !/succeeded/.test(upd + del), `${upd.slice(0, 60)} | ${del.slice(0, 60)}`);
const roleTests = [];
for (const [role, sql] of [["authenticated", "insert into t3a_event_log(event_name,event_category,actor_type,actor_id,resource_type,resource_id,payload,integrity_hash) values ('x','SYSTEM','SYSTEM',gen_random_uuid(),'t',gen_random_uuid(),'{}','x')"], ["authenticated", "update t3a_event_log set payload='{}'"], ["authenticated", "delete from t3a_event_log"], ["anon", "delete from t3a_event_log"]]) {
  await c.query("begin"); let m = "allowed"; try { await c.query(`set local role ${role}`); await c.query(sql); } catch (e) { m = e.message; } await c.query("rollback"); roleTests.push(/permission denied/.test(m));
}
add("E11", "DT-22: signed-in and anonymous roles cannot insert, update or delete event rows directly", roleTests.every(Boolean), roleTests.join());
await c.query("alter table public.t3a_event_log disable trigger user");
await c.query("update public.t3a_event_log set payload = '{\"account_id\":\"00000000-0000-4000-8000-000000000000\",\"email_verified_at\":\"2026-10-18T09:59:00Z\"}'::jsonb where event_id=$1", [ids[1]]);
await c.query("alter table public.t3a_event_log enable trigger user");
const found = await q("select * from public.t3a_verify_event_chain(interval '24 hours', true)");
const qe = await q("select severity, kind from t3a_quality_event where kind='event_chain_integrity_failure'");
const gov = (await q("select count(*)::int n from t3a_event_log where event_name='governance.control_operated' and actor_ref='svc_event_chain_verifier'"))[0].n;
add("E12", "DT-24: a directly altered event is flagged, a critical quality event is written and governance.control_operated is emitted",
  found.some(x => x.event_id === ids[1] && x.problem === "integrity_hash_mismatch") && qe.some(x => x.severity === "critical") && gov === 1, `findings=${found.map(x => x.problem)} quality=${JSON.stringify(qe)} gov=${gov}`);
await c.query("truncate public.t3a_event_log, public.t3a_event_idempotency");

// ---- idempotency (DT-43)
const idem = "idem-" + uuid(); const rid2 = uuid();
const P1 = { account_id: uuid(), email_verified_at: "2026-10-18T09:59:00Z" }; const P2 = { ...P1, email_verified_at: "2026-10-18T09:58:00Z" };
const a1 = await ing({ name: "account.email_verified", rid: rid2, payload: P1, key: idem }); const a2 = await ing({ name: "account.email_verified", rid: rid2, payload: P1, key: idem }); const a3 = await ing({ name: "account.email_verified", rid: rid2, payload: P2, key: idem });
const d1 = await ing({ name: "account.email_verified", rid: rid2, payload: { ...P1, account_id: uuid() } }); const d2 = await ing({ name: "account.email_verified", rid: rid2, payload: { ...P1, account_id: uuid() } });
add("E13", "DT-43: replay returns the first event, same key with a different payload is quarantined, different keys are both accepted",
  a1.outcome === "accepted" && a2.outcome === "replay" && a2.event_id === a1.event_id && a3.outcome === "quarantined" && d1.outcome === "accepted" && d2.outcome === "accepted", JSON.stringify([a1.outcome, a2.outcome, a3.outcome, d1.outcome, d2.outcome]));

// ---- references (DT-66) on real events
await c.query("insert into auth.users(id,email) values ('aaaaaaaa-0000-4000-8000-00000000000a','a@test.local') on conflict do nothing");
await c.query("insert into profiles(id,email) values ('aaaaaaaa-0000-4000-8000-00000000000a','a@test.local') on conflict do nothing");
const good = await ing({ name: "account.email_verified", prop: "real", payload: { account_id: "aaaaaaaa-0000-4000-8000-00000000000a", email_verified_at: "2026-10-18T09:59:00Z" } });
const ghost = await ing({ name: "account.email_verified", prop: "real", payload: { account_id: uuid(), email_verified_at: "2026-10-18T09:59:00Z" } });
add("E14", "DT-66: a real event naming an existing account is accepted; a well-formed event naming no record is refused with a named reason",
  good.outcome === "accepted" && ghost.outcome === "rejected" && ghost.reason === "REFERENCE_NOT_FOUND" && (ghost.detail || []).includes("REFERENCE_NOT_FOUND:account_id"), JSON.stringify([good.outcome, ghost]));
const fut = await ing({ name: "account.email_verified", payload: { account_id: uuid(), email_verified_at: "2026-10-18T09:59:00Z" }, occurred: new Date(Date.now() + 3600e3).toISOString() });
add("E15", "occurred_at later than ingestion is refused", fut.outcome === "rejected" && fut.reason === "OCCURRED_AT_IN_FUTURE", JSON.stringify(fut));
const act = await ing({ name: "account.email_verified", actor_type: "EMPLOYER", payload: { account_id: uuid(), email_verified_at: "2026-10-18T09:59:00Z" } });
add("E16", "an actor type outside the dictionary vocabulary is refused", act.outcome === "rejected" && act.reason === "ACTOR_TYPE_INVALID", JSON.stringify(act));

// ---- legacy tolerance, alias, strict mode
const lid = uuid(), lr = uuid();
const ins = "insert into public.t3a_event_log(event_name,event_category,actor_type,actor_id,subject_id,resource_type,resource_id,payload,integrity_hash) values ($1,$2,'MENTOR',$3,$4,'observation',$5,'{\"stage_code\":\"S1\"}'::jsonb,'legacy-hash')";
await c.query(ins, ["observation_committed", "OBSERVATION", lid, lid, lr]);
await c.query(ins, ["weird_legacy_event", "OBSERVATION", lid, lid, uuid()]);
const lg = await q("select event_name, event_processing_state s, integrity_hash h, previous_hash p, event_sequence_no n from t3a_event_log where actor_id=$1 order by ingested_at", [lid]);
add("E17", "legacy writers still work: the old name resolves to the canonical event, an unknown old name is quarantined, hashes are replaced by the chain hash",
  lg.length === 2 && lg[0].event_name === "observation.committed" && lg[0].s === "accepted" && lg[0].h !== "legacy-hash" && lg[0].n === 1 && lg[1].event_name === "weird_legacy_event" && lg[1].s === "quarantined", JSON.stringify(lg));
await c.query("update public.t3a_event_config set value='strict' where key='ingest_mode'");
let sm = ""; try { await c.query(ins, ["observation_committed", "OBSERVATION", lid, lid, uuid()]); sm = "allowed"; } catch (e) { sm = e.message; }
await c.query("update public.t3a_event_config set value=$1 where key='ingest_mode'", [_prevIngest]);
add("E18", "strict mode refuses direct inserts into the log", /T3A_EVENT_DIRECT_INSERT_REFUSED/.test(sm), sm.slice(0, 90));
const acc = [];
for (const role of ["anon", "authenticated"]) { await c.query("begin"); let m = "allowed"; try { await c.query(`set local role ${role}`); await c.query("select public.t3a_ingest_event('x','SYSTEM_SERVICE','a','b','t',gen_random_uuid(),'{}','k')"); } catch (e) { m = e.message; } await c.query("rollback"); acc.push(/permission denied/.test(m)); }
add("E19", "anonymous and signed-in roles cannot call the ingestion function", acc.every(Boolean), acc.join());
let emit = ""; try { await q("select public.t3a_emit_event('bogus.event','SYSTEM_SERVICE','svc','system_service','t',$1,'{}'::jsonb,'k-emit')", [uuid()]); emit = "no error"; } catch (e) { emit = e.message; }
add("E20", "t3a_emit_event raises so a parent action rolls back when its event is refused (12.1.6)", /T3A_EVENT_REFUSED/.test(emit), emit.slice(0, 90));
console.log(JSON.stringify(res)); await c.end(); process.exit(0);
