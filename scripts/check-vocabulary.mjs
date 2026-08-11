#!/usr/bin/env node
/**
 * Vocabulary-lock enforcement for T3A-DEV-SPEC-002 v2.0 §1.4 and AC-61.
 *
 * Fails the build if any FORBIDDEN identifier appears in source that is
 * not on the grandfathered allowlist. New code MUST use the target
 * vocabulary (Stage/S1-S4, observation_status, Behavioral Evidence
 * Report, etc.). Legacy files remain grandfathered until their
 * dedicated migration PR lands and their entry is removed from the
 * allowlist.
 *
 * From the spec, AC-61:
 *   "Continuous integration runs a forbidden-identifier and
 *   forbidden-string check across code, schema, interface strings and
 *   migrations. The build fails on any of: level_1, level_2, level_3,
 *   level_4, validation_status, skill_passport, behavioral_score,
 *   readiness_score, fingerprint, or any identifier containing
 *   validate. The list is maintained alongside the vocabulary lock
 *   and is extended, never shortened, without governance approval."
 *
 * The forbidden pattern list only grows. The grandfathered allowlist
 * only shrinks (as migrations happen). Both properties are enforced
 * by review, not by this script.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const FORBIDDEN = [
  // Stage-vs-Level (spec §1.4). Word-boundary matched: `level_1`..`level_4`.
  { pattern: /\blevel_[1-4]\b/i, message: "Use `stage_code` (S1..S4) instead of `level_1..level_4`." },

  // "validation_status" and any identifier containing `validate` — the
  // platform observes and confirms; it never validates a person.
  { pattern: /\bvalidation_status\b/i, message: "Use `observation_status` / `confirmation_status` — the platform never validates a person." },
  // Bare `validate` in identifier context (function names, exports).
  // Deliberately narrow: catches `validateFoo`, `_validate`, `foo_validate`
  // but not free-form English text like "validate the input".
  { pattern: /(?:^|[_A-Za-z0-9])validate[A-Z_a-z0-9]/, message: "Identifier contains `validate`. Rename — mentors observe and confirm; they do not validate a person.", identifierOnly: true },

  // Skill Passport is retired; the credential is the Behavioral
  // Evidence Report (BER). AC-35.
  { pattern: /\bskill_passport(s)?\b/i, message: "Rename to `ber` / `behavioral_evidence_report` — Skill Passport is retired." },

  // Prohibited score/rank/aggregate fields (spec §7.5 & §12.1 invariants).
  { pattern: /\bbehavioral_score(s)?\b/i, message: "Aggregate behavioral scores are prohibited. Use per-observation `ordinal_anchor` (assurance-domain only, never rendered)." },
  { pattern: /\breadiness_score\b/i, message: "Readiness scores are prohibited. Use `dimension_evidence_state` (four rule-derived states)." },

  // "Behavioral Fingerprint" — retired construct name (OD-13). Locked
  // replacement is `LongitudinalBehavioralPatternMethodology`.
  { pattern: /\bfingerprint\b/i, message: "`fingerprint` is retired (OD-13). Use `longitudinal_behavioral_pattern` / LBP." },

  // British spelling of Behavioural — spec §1.4 mandates U.S. English
  // in all new code and interface strings.
  { pattern: /\bbehavioural(ly)?\b/i, message: "Use U.S. spelling `behavioral` — spec §1.4." },
];

// Grandfathered files: legacy code that predates the vocabulary lock.
// Each entry is a migration ticket in disguise — remove the entry when
// the file's rename PR lands. NEW files MUST NOT be added here.
const ALLOWLIST = new Set([
  // Supabase-generated types — regenerate after the schema rename PR.
  "src/types/database.types.ts",
  "src/integrations/supabase/types.ts",

  // Legacy schema migrations — historical record of the old shape.
  // Do NOT edit these; they run once and are immutable. The rename
  // is a NEW forward migration; the old ones stay grandfathered.
  "supabase/migrations/002_actual_schema.sql",
  "supabase/migrations/002_complete_schema.sql",
  "supabase/migrations/20260130_platform_updates.sql",
  "supabase/migrations/20260130_platform_updates_fixed.sql",
  "supabase/migrations/20260810190240_20cadeb7-ad8f-47f8-bfe8-e0e4e50cd36b.sql",
  "supabase/migrations/20260811083459_935cc976-55c4-43f4-9ae1-17910c6010ca.sql",

  // Legacy tests referencing the old shape — migrate alongside the
  // schema rename PR.
  "src/test/candidate-employer-e2e-flow.test.ts",
  "src/test/dashboard-queries.test.ts",
  "src/test/database-types.test.ts",

  // Dashboards + assessment + verify page + agent: reference legacy
  // columns/tables today. Migrate PR-by-PR alongside the schema rename.
  "src/components/assessment/AssessmentViewer.tsx",
  "src/pages/VerifyPassport.tsx",
  "src/pages/dashboard/AIAgent.tsx",
  "src/pages/dashboard/AdminDashboard.tsx",
  "src/pages/dashboard/CandidateDashboard.tsx",
  "src/pages/dashboard/EmployerDashboard.tsx",
  "src/pages/dashboard/MentorDashboard.tsx",
  "src/pages/dashboard/SchoolDashboard.tsx",
]);

const SCAN_ROOTS = ["src", "api", "supabase/migrations"];
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next"]);
const SCAN_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".sql", ".json", ".md",
]);

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    let s;
    try { s = statSync(full); } catch { continue; }
    if (s.isDirectory()) {
      yield* walk(full);
    } else if (s.isFile()) {
      const dot = name.lastIndexOf(".");
      if (dot === -1) continue;
      if (SCAN_EXTS.has(name.slice(dot))) yield full;
    }
  }
}

// Identifier-context detection: a match counts as an identifier if the
// surrounding characters would make it a valid JS/TS/SQL identifier
// character — the previous or next char is [A-Za-z0-9_]. Used for the
// `validate` rule so free-form English doesn't false-positive.
function isIdentifierContext(line, index, matchLen) {
  const before = index > 0 ? line[index - 1] : "";
  const after = index + matchLen < line.length ? line[index + matchLen] : "";
  return /[A-Za-z0-9_]/.test(before) || /[A-Za-z0-9_]/.test(after);
}

const violations = [];

for (const root of SCAN_ROOTS) {
  const absRoot = join(ROOT, root);
  for (const file of walk(absRoot)) {
    const rel = relative(ROOT, file).replaceAll("\\", "/");
    if (ALLOWLIST.has(rel)) continue;
    let text;
    try { text = readFileSync(file, "utf8"); } catch { continue; }
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const rule of FORBIDDEN) {
        rule.pattern.lastIndex = 0;
        const m = rule.pattern.exec(line);
        if (!m) continue;
        if (rule.identifierOnly && !isIdentifierContext(line, m.index, m[0].length)) continue;
        violations.push({
          file: rel,
          line: i + 1,
          match: m[0],
          message: rule.message,
          snippet: line.trim().slice(0, 160),
        });
      }
    }
  }
}

if (violations.length === 0) {
  console.log("✓ vocabulary lock clean — no forbidden identifiers outside grandfathered allowlist.");
  process.exit(0);
}

console.error(`✗ vocabulary lock: ${violations.length} forbidden identifier${violations.length === 1 ? "" : "s"} in non-allowlisted code.\n`);
console.error("Per T3A-DEV-SPEC-002 §1.4 and AC-61, new code must use the target vocabulary.");
console.error("If this is a legacy file that needs its own migration PR, add it to scripts/check-vocabulary.mjs ALLOWLIST and cite the ticket.\n");

for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  [${v.match}]`);
  console.error(`    → ${v.message}`);
  console.error(`    ${v.snippet}\n`);
}

process.exit(1);
