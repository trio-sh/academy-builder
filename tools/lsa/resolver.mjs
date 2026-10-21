// Session Archive resolver: T3A-DEV-REQ-LSA-001 Sections 4, 7 and 8, ported from the reference resolver.
// Dormant: this module is not imported by the application and nothing calls it in production. Pure functions, no I/O.
// Server side only. It must not be bundled into client code (Control 12.1.7).
import { createHash, randomInt } from "node:crypto";

const sortKeys = (v) => Array.isArray(v) ? v.map(sortKeys) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v;
export const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export class LoadError extends Error {}

const active = (recs, on) => (recs || []).filter((r) => r.status === "active" && r.effective_from <= on && (r.effective_to == null || on <= r.effective_to));
const overlap = (a, b) => { const ae = a.effective_to || "9999-12-31", be = b.effective_to || "9999-12-31"; return a.effective_from <= be && b.effective_from <= ae; };

/** Paragraphs 7.2 and 7.3: a registry that fails any check loads nothing. */
export function loadRegistries(reg) {
  const keys = {
    families: (r) => r.proposition_id,
    direction_rules: (r) => JSON.stringify([r.family_id, r.family_version]),
    sufficiency_rules: (r) => r.applies_to,
    entries: (r) => JSON.stringify([r.proposition_id, r.finding_code, r.sequence_pattern]),
  };
  for (const [name, kf] of Object.entries(keys)) {
    const act = (reg[name] || []).filter((r) => r.status === "active");
    for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) if (kf(act[i]) === kf(act[j]) && overlap(act[i], act[j])) throw new LoadError(`overlap in ${name}: ${kf(act[i])}`);
  }
  for (const f of (reg.families || []).filter((x) => x.status === "active")) if (!(f.states && f.states.length)) throw new LoadError("LSA-R12 family without an approved state domain");
  for (const rule of reg.direction_rules || []) {
    const seen = new Map();
    for (const t of rule.transitions) {
      const k = JSON.stringify([t.from_state, t.to_state]);
      if (seen.has(k) && seen.get(k) !== t.direction) throw new LoadError("contradictory transition");
      seen.set(k, t.direction);
    }
    const fwd = new Map();
    for (const t of rule.transitions) if (t.direction === "forward") { if (!fwd.has(t.from_state)) fwd.set(t.from_state, new Set()); fwd.get(t.from_state).add(t.to_state); }
    const cyc = (n, path) => path.has(n) || [...(fwd.get(n) || [])].some((x) => cyc(x, new Set([...path, n])));
    if ([...fwd.keys()].some((n) => cyc(n, new Set()))) throw new LoadError("LSA-R12 cyclic direction rule");
    const fam = (reg.families || []).find((f) => f.family_id === rule.family_id) || {};
    const domain = new Set([...(fam.states || []), ...(fam.absence_states || [])]);
    if (Object.keys(fam).length && rule.transitions.some((t) => !domain.has(t.from_state) || !domain.has(t.to_state))) throw new LoadError("LSA-R12 direction rule uses a state outside its family");
    const absent = new Set(fam.absence_states || []);
    if (rule.transitions.some((t) => absent.has(t.from_state) || absent.has(t.to_state))) throw new LoadError("LSA-R12 absence state used in a direction rule");
  }
  const groups = new Map();
  for (const e of (reg.entries || []).filter((r) => r.status === "active")) {
    for (const f of ["element_title", "wording", "work_process_line", "local_limit_line"]) if (!e[f]) throw new LoadError("LSA-R12 empty required line");
    if (["documented_progression", "documented_regression"].includes(e.finding_code) && !e.comparison_basis_line) throw new LoadError("LSA-R12 missing comparison basis");
    const k = JSON.stringify([e.proposition_id, e.finding_code]);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e.sequence_pattern);
  }
  for (const pats of groups.values()) if (pats.includes("ANY") && pats.length > 1) throw new LoadError("LSA-R12 ANY overlaps exact entry");
  return reg;
}

/** Paragraph 5.1.4 and check 4.7.4: exposure is derived from the participant's own earlier observations, never from a stored flag. */
function seenBefore(o, observations) {
  const key = (x) => x.observed_at + "\u0000" + x.committed_at;
  for (const e of observations) {
    if (e.participant_id !== o.participant_id || e.observation_id === o.observation_id) continue;
    if (key(e) < key(o) && (e.source_version_id === o.source_version_id || (e.interaction_pattern_family_id ?? null) === (o.interaction_pattern_family_id ?? null))) return true;
  }
  return false;
}

const one = (recs, pred, on) => { const m = active(recs, on).filter(pred); return m.length > 1 ? "R09" : m[0] ?? null; };

/** Paragraph 8.2: calendar month subtraction, clamped to the last valid day of the target month. */
export function monthsBack(day, n) {
  let y = +day.slice(0, 4), m = +day.slice(5, 7); const d = +day.slice(8, 10);
  m -= n; while (m <= 0) { m += 12; y -= 1; }
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const last = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

const eqArr = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);

/** Section 8 for one proposition. */
export function resolve(reg, participants, observations, kase) {
  const on = kase.snapshot_date, prop = kase.proposition_id;
  const p = participants[kase.participant_id];
  const out = { case_id: kase.case_id };
  const refuse = (code) => { out.refusal = code; return out; };
  const upper = kase.period_end < on ? kase.period_end : on;
  const obs = observations.filter((o) => o.participant_id === kase.participant_id && o.proposition_id === prop && kase.period_start <= o.observed_at && o.observed_at <= upper && o.committed_at.slice(0, 10) <= on && !o.withdrawn);
  if (p.lsa_consent_state !== "granted") return refuse("LSA-R01");
  if (obs.some((o) => o.open_correction_or_challenge)) return refuse("LSA-R05");
  const hist = one(reg.history_rules, (x) => x.applies_to === kase.dimension_id || x.applies_to === "all", on);
  if (hist === null || hist === "R09") return refuse("LSA-R08");
  const cutoff = monthsBack(on, hist.max_age_months);
  const elig = obs.filter((o) => o.observed_at >= cutoff);
  if (elig.some((o) => !(o.source_version_id && o.served_instance_hash && o.statement_id))) return refuse("LSA-R06");
  const fam0 = one(reg.families, (r) => r.proposition_id === prop, on);
  if (fam0 && typeof fam0 === "object") {
    const domain = new Set([...(fam0.states || []), ...(fam0.absence_states || [])]);
    if (elig.some((o) => o.state_code != null && !domain.has(o.state_code))) return refuse("LSA-R14");
  }
  out.considered = elig.length;
  const dim = elig.length ? elig[0].dimension_id : kase.dimension_id;
  let suf = one(reg.sufficiency_rules, (r) => r.applies_to === prop, on);
  if (suf === null) suf = one(reg.sufficiency_rules, (r) => r.applies_to === dim, on);
  if (suf === "R09") return refuse("LSA-R09");
  const exclusions = [];
  let finding = null, fam = null;
  if (suf === null || elig.length < suf.min_eligible) finding = "insufficient_evidence";
  if (finding === null) {
    fam = one(reg.families, (r) => r.proposition_id === prop, on);
    if (fam === "R09") return refuse("LSA-R09");
    if (fam === null) finding = "comparison_not_established";
  }
  let comp = [];
  if (finding === null) {
    const members = new Set(fam.members.map((m) => m.source_version_id));
    for (const o of elig) {
      const st = o.state_code ?? null;
      if (st === null && ["not_served", "not_observed"].includes(o.missing_reason)) { exclusions.push([o.observed_at, "EX06"]); continue; }
      if (!members.has(o.source_version_id)) { exclusions.push([o.observed_at, "EX01"]); continue; }
      const adm = o.administration;
      if (!adm || o.longitudinal_use_status !== "eligible") { exclusions.push([o.observed_at, "EX07"]); continue; }
      if (JSON.stringify(sortKeys(adm)) !== JSON.stringify(sortKeys(fam.administration_profile))) { exclusions.push([o.observed_at, "EX05"]); continue; }
      if (seenBefore(o, observations)) { exclusions.push([o.observed_at, "EX08"]); continue; }
      comp.push(o);
    }
    if (comp.some((o) => !(o.observer_ids && o.observer_ids.length))) return refuse("LSA-R10");
    comp.sort((a, b) => (a.observed_at < b.observed_at ? -1 : a.observed_at > b.observed_at ? 1 : a.committed_at < b.committed_at ? -1 : a.committed_at > b.committed_at ? 1 : a.observation_id < b.observation_id ? -1 : a.observation_id > b.observation_id ? 1 : 0));
    const after = comp.length - 1;
    if (comp.length < suf.min_comparable || after < suf.min_after_first || (suf.require_completed_cooldown && comp.slice(1).some((o) => !o.cooldown_completed_at))) finding = "comparison_not_established";
  }
  const states = comp.map((o) => o.state_code);
  if (finding === null && new Set(states).size === 1) finding = "consistent_recorded_conduct";
  if (finding === null) {
    const rule = one(reg.direction_rules, (r) => r.family_id === fam.family_id && r.family_version === fam.version, on);
    if (rule === "R09") return refuse("LSA-R09");
    if (rule === null) finding = "different_no_direction";
    else {
      const tr = new Map(rule.transitions.map((t) => [JSON.stringify([t.from_state, t.to_state]), t.direction === "forward" ? 1 : -1]));
      const vals = []; let undirected = false;
      for (let i = 0; i + 1 < states.length; i++) {
        const a = states[i], b = states[i + 1];
        if (a === b) vals.push(0); else if (tr.has(JSON.stringify([a, b]))) vals.push(tr.get(JSON.stringify([a, b]))); else undirected = true;
      }
      if (undirected) finding = "different_no_direction";
      else if (!vals.includes(-1) && vals.includes(1)) finding = "documented_progression";
      else if (!vals.includes(1) && vals.includes(-1)) finding = "documented_regression";
      else finding = "mixed_trajectory";
    }
  }
  const cands = active(reg.entries, on).filter((e) => e.proposition_id === prop && e.finding_code === finding && (e.sequence_pattern === "ANY" || eqArr(e.sequence_pattern, states)));
  if (cands.length !== 1) return refuse("LSA-R04");
  exclusions.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  Object.assign(out, {
    finding_code: finding, entry_id: cands[0].entry_id, included: comp.length,
    sequence: comp.map((o) => ({ date: o.observed_at, state_code: o.state_code, observation_id: o.observation_id })),
    exclusions: exclusions.map(([date, code]) => ({ date, code })),
    observer_count: new Set(comp.flatMap((o) => o.observer_ids)).size,
    retake_after_redirect_or_pause: comp.some((o) => ["retake_after_redirect", "retake_after_pause"].includes(o.attempt_reason)),
  });
  return out;
}

const COMPARED = new Set(["consistent_recorded_conduct", "different_no_direction", "documented_progression", "documented_regression", "mixed_trajectory"]);

/** Paragraphs 8.15 to 8.17. elementResults: [conduct_element_id, finding_code] for every proposition entry. */
export function resolveDimension(reg, dimensionId, elementResults, on) {
  const comp = elementResults.filter(([, f]) => COMPARED.has(f));
  const fs = new Set(comp.map(([, f]) => f));
  const coverage = new Set(comp.map(([e]) => e)).size;
  const rule = one(reg.dimension_rules, (r) => r.dimension_id === dimensionId, on);
  let code;
  if (!comp.length) code = "dimension_insufficient";
  else if (rule === null || rule === "R09" || coverage < rule.min_elements) code = "dimension_pattern_only_coverage";
  else if (fs.has("mixed_trajectory") || (fs.has("documented_progression") && fs.has("documented_regression"))) code = "dimension_mixed";
  else if (fs.has("documented_progression") || fs.has("documented_regression")) {
    const need = rule.min_directional_elements ?? 2;
    const prog = new Set(comp.filter(([, f]) => f === "documented_progression").map(([e]) => e)).size;
    const regr = new Set(comp.filter(([, f]) => f === "documented_regression").map(([e]) => e)).size;
    code = prog >= need ? "dimension_progression" : regr >= need ? "dimension_regression" : "dimension_pattern_only_direction";
  } else if (fs.size === 1 && fs.has("consistent_recorded_conduct")) code = "dimension_consistent";
  else code = "dimension_pattern_only_direction";
  const ent = active(reg.dimension_entries, on).filter((e) => e.dimension_id === dimensionId && e.dimension_finding_code === code);
  if (ent.length !== 1) return { refusal: "LSA-R13", dimension_finding_code: code };
  return { dimension_finding_code: code, entry_id: ent[0].entry_id, coverage };
}

export const outputHash = (result) => createHash("sha256").update(JSON.stringify(sortKeys(result))).digest("hex");

/** Paragraph 9.4: twelve Crockford characters, grouped 4-4-4. */
export function verificationCode() {
  let raw = ""; for (let i = 0; i < 12; i++) raw += CROCKFORD[randomInt(32)];
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}
