// D5: the Session Archive resolver port on the D5 reference fixtures of the package (06_Joint_Trial/lsa_d5, the cases read me check 3.1.6 runs on the package reference resolver). Synthetic data only.
// Session Archive resolver conformance on the reference fixtures (synthetic data only): 29 resolution cases, 9 dimension cases,
// 7 registry load tests, the calendar clamp and the verification code. Writes docs/day1/evidence/d5-lsa-resolver-conformance.json.
import fs from "node:fs";
import { loadRegistries, resolve, resolveDimension, outputHash, monthsBack, verificationCode, CROCKFORD, LoadError } from "../lsa/resolver.mjs";
const F = new URL("../lsa/fixtures/d5/", import.meta.url);
const reg = JSON.parse(fs.readFileSync(new URL("registries.json", F), "utf8")), data = JSON.parse(fs.readFileSync(new URL("observations.json", F), "utf8")), exp = JSON.parse(fs.readFileSync(new URL("expected_results.json", F), "utf8"));
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
loadRegistries(reg);
const parts = Object.fromEntries(data.participants.map((p) => [p.participant_id, p]));
for (const c of data.cases) {
  const rg = c.no_history ? { ...reg, history_rules: [] } : reg;
  const got = resolve(rg, parts, data.observations, c); if ("refusal" in got) delete got.considered;
  const want = exp[c.case_id];
  const ok = Object.entries(want).every(([k, v]) => JSON.stringify(got[k]) === JSON.stringify(v));
  const again = resolve(rg, parts, data.observations, c); if ("refusal" in again) delete again.considered;
  rec("resolve", `${c.case_id}: ${want.finding_code ?? want.refusal}`, ok && outputHash(got) === outputHash(again), ok ? null : { want, got });
}
for (const lt of data.load_tests) { let err = null; try { loadRegistries(lt.registries); } catch (e) { err = e; } rec("load", `${lt.id} is rejected as specified`, err instanceof LoadError, err?.message); }
for (const dc of data.dimension_cases || []) { const got = resolveDimension(reg, dc.dimension_id, dc.element_results, "2027-12-31"); rec("dimension", `${dc.id}: ${got.dimension_finding_code}${got.refusal ? " " + got.refusal : ""}`, Object.entries(dc.expected).every(([k, v]) => JSON.stringify(got[k]) === JSON.stringify(v)), got); }
rec("calendar", "calendar month subtraction clamps to the last valid day", [["2027-03-31", 1, "2027-02-28"], ["2028-03-31", 1, "2028-02-29"], ["2027-01-15", 1, "2026-12-15"], ["2028-02-29", 12, "2027-02-28"], ["2027-05-31", 36, "2024-05-31"], ["2027-12-31", 10, "2027-02-28"], ["2027-04-30", 1, "2027-03-30"]].every(([a, n, w]) => monthsBack(a, n) === w));
const codes = new Set(Array.from({ length: 2000 }, verificationCode));
rec("code", "2,000 verification codes are unique, 4-4-4, Crockford alphabet", codes.size === 2000 && [...codes].every((c) => c.length === 14 && c[4] === "-" && c[9] === "-" && [...c.replace(/-/g, "")].every((ch) => CROCKFORD.includes(ch))));
const out = { passed: R.filter((r) => r.pass).length, total: R.length, failed: R.filter((r) => !r.pass), results: R };
fs.writeFileSync(new URL("../../docs/day1/evidence/d5-lsa-resolver-conformance.json", import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ passed: out.passed, total: out.total, failed: out.failed }, null, 1));
process.exit(out.failed.length ? 1 : 0);
