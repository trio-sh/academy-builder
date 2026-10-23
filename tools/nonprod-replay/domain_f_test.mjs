// Day 1 step 11.1.9 probes (Domain F structure and rules). Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
async function tryq(sql) { await c.query("begin"); let msg = "ok", rows = []; try { rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query("rollback"); return { msg, rows }; }
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const M = randomUUID(), P = randomUUID(), A = randomUUID(), RUN = M.slice(0, 8);
for (const [u, e, r] of [[M, "m", "mentor"], [P, "p", "candidate"], [A, "a", "admin"]]) { await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','f${e}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','f${e}-${RUN}@t.local','${r}')`); }
const refusals = async (reason) => (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='${reason}'`))[0].n;
// invitation
const inv = (await run(`insert into t3a_mentor_invitation(invitee_email, invited_by, invitation_expires_at) values ('inv-${RUN}@t.local','${A}', now() + interval '7 days') returning mentor_invitation_id i`))[0].i;
const noVer = (await run(`select t3a_redeem_invitation('${inv}', null) r`))[0].r; rec("F-inv", "redeeming without the agreement version is refused and logged", noVer.reason === "AGREEMENT_VERSION_REQUIRED" && (await refusals("AGREEMENT_VERSION_REQUIRED")) >= 1, noVer);
const ok = (await run(`select t3a_redeem_invitation('${inv}', '1.0') r`))[0].r; rec("F-inv", "a valid invitation is redeemed with the agreement version and time", ok.outcome === "redeemed" && (await run(`select mentor_agreement_version v from t3a_mentor_invitation where mentor_invitation_id='${inv}'`))[0].v === "1.0", ok);
const again = (await run(`select t3a_redeem_invitation('${inv}', '1.0') r`))[0].r; rec("F-inv", "a second redemption is refused and logged", again.reason === "INVITATION_ALREADY_REDEEMED", again);
const exp = (await run(`insert into t3a_mentor_invitation(invitee_email, invited_by, invitation_sent_at, invitation_expires_at) values ('exp-${RUN}@t.local','${A}', now() - interval '3 days', now() - interval '1 day') returning mentor_invitation_id i`))[0].i;
const expd = (await run(`select t3a_redeem_invitation('${exp}', '1.0') r`))[0].r; rec("F-inv", "an expired invitation is refused and logged", expd.reason === "INVITATION_EXPIRED", expd);
const clr = await tryq(`update t3a_mentor_invitation set invitation_redeemed_at = null where mentor_invitation_id='${inv}'`); rec("F-inv", "redemption time cannot be cleared", /SET_ONCE/.test(clr.msg), clr.msg.slice(0, 80));
const imm = await tryq(`update t3a_mentor_invitation set invitation_expires_at = now() + interval '1 year' where mentor_invitation_id='${exp}'`); rec("F-inv", "the expiry cannot be extended in place", /IMMUTABLE_COLUMN/.test(imm.msg), imm.msg.slice(0, 80));
// authorization
const auth = (await run(`insert into t3a_mentor_authorization(mentor_id, dimension_id, authorized_from, calibration_status, reference_set_version, authorization_status, reviewer_authorization, issuer_authorization) values ('${M}','D1', now() - interval '1 day', 'current','1.0','authorized', false, false) returning mentor_authorization_id i`))[0].i;
let may = (await run(`select t3a_mentor_may_observe('${M}','D1','${P}') r`))[0].r; rec("F-auth", "an authorized mentor with no open conflict may observe", may.authorized === true && may.conflict_open === false, may);
await run(`insert into t3a_conflict_declaration(mentor_id, participant_id, reason_class, declared_entity_refs) values ('${M}','${P}','family', '{}'::uuid[])`);
may = (await run(`select t3a_mentor_may_observe('${M}','D1','${P}') r`))[0].r; rec("F-auth", "an open conflict with the participant is reported", may.conflict_open === true, may);
const other = (await run(`select t3a_mentor_may_observe('${M}','D2','${P}') r`))[0].r; rec("F-auth", "authorization is per dimension: D2 is not authorized", other.authorized === false, other);
await run(`insert into t3a_calibration_clearance(dimension_id, reference_set_version, construct_version, determination_version, statement_version, source_version_ids) values ('D2','1.0','t','t','t',array[gen_random_uuid()])`); // synthetic clearance, throwaway database only
const badSt = await tryq(`insert into t3a_mentor_authorization(mentor_id, dimension_id, authorized_from, calibration_status, reference_set_version, authorization_status, reviewer_authorization, issuer_authorization) values ('${M}','D2', now(), 'current','1.0','paused', true, true)`); rec("F-auth", "a status outside the five listed values is refused", /check|violat/i.test(badSt.msg), badSt.msg.slice(0, 80));
const ext = await tryq(`update t3a_mentor_authorization set authorization_status='suspended', suspension_started_at=now(), suspension_extension_count=1 where mentor_authorization_id='${auth}'`); rec("F-auth", "a suspension extension without an independent approver is refused", /check|violat/i.test(ext.msg), ext.msg.slice(0, 90));
const ext2 = await tryq(`update t3a_mentor_authorization set authorization_status='suspended', suspension_started_at=now(), suspension_extension_count=1, independent_approver_id='${A}' where mentor_authorization_id='${auth}'`); rec("F-auth", "with an independent approver the extension is accepted", ext2.msg === "ok", ext2.msg.slice(0, 90));
const chan = await tryq(`update t3a_mentor_authorization set sourcing_channel='friend' where mentor_authorization_id='${auth}'`); rec("F-auth", "a sourcing channel outside the list is refused", /check|violat/i.test(chan.msg), chan.msg.slice(0, 80));
// appeal, calibration, socket
const ap = (await run(`insert into t3a_mentor_appeal(mentor_id) values ('${M}') returning mentor_appeal_id i`))[0].i; await run(`update t3a_mentor_appeal set decided_at = now() where mentor_appeal_id='${ap}'`);
const ap2 = await tryq(`update t3a_mentor_appeal set decided_at = now() + interval '1 day' where mentor_appeal_id='${ap}'`); rec("F-appeal", "an appeal decision time is set once", /SET_ONCE/.test(ap2.msg), ap2.msg.slice(0, 80));
const cal = await tryq(`insert into t3a_calibration_record(mentor_id, stimulus_unit_id, paired_determination_set_id, agreement_statistic_inputs, agreement_threshold_version, moderation_sample_flag) values ('${M}', gen_random_uuid(), gen_random_uuid(), '{"n":10}', '1.0', true) returning calibration_record_id`); rec("F-cal", "a calibration record is stored", cal.msg === "ok", cal.msg.slice(0, 90));
const sock = await tryq(`insert into t3a_mentor_confidence_socket(mentor_confidence_per_determination) values ('high')`); rec("F-socket", "mentor confidence socket refuses every write", /SOCKET_ROUTE_CLOSED/.test(sock.msg), sock.msg.slice(0, 80));
const inv2 = await tryq(`insert into t3a_d1_involvement(actor_id, participant_id, dimension_id, involving_action, contributing_record_kind, cycle_function, evidence_cycle_id, s1_exposure_flag) values ('${M}','${P}','D1',(enum_range(null::${(await run(`select udt_name u from information_schema.columns where table_name='t3a_d1_involvement' and column_name='involving_action'`))[0].u}))[1],'x','coach', gen_random_uuid(), false)`); rec("F-cycle", "a cycle function outside guide, observer, evidence_reviewer is refused", /check|violat/i.test(inv2.msg), inv2.msg.slice(0, 90));
const mapF = (await run(`select count(*)::int n from t3a_field_physical_map where qualified_name like 'F.%'`))[0].n; rec("DT-01(F)", "all 48 Domain F fields mapped", mapF === 48, mapF);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
