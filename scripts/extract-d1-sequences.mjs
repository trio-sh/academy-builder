#!/usr/bin/env node
/**
 * Extract the thirteen beat sequences from T3A-D1-EXEC-001 and emit a SQL
 * seed for t3a_d1_mentor_action_sequence.
 *
 * T3A-D1-EXEC-CORR-004 Section 2 corrects the inventory. There are
 * thirteen `Reveal sequence` blocks in the issued file and they are NOT
 * thirteen demonstration sources:
 *
 *   3   demonstration sources  DEMO-D1-S1-001, S2-001, S4-001   B-codes
 *   10  Stage 1 production     SRC-D1-S1-001 .. S1-010          R-codes
 *
 * DEMO-D1-S3-001 has no sequence and needs none: Stage 3 is a written
 * submission with enquiry_point and account_test_point both null, so the
 * observation is the submitted artifact rather than a live sequence.
 *
 * WHY THE FIRST PASS FOUND ONLY TWO. It searched for "Mentor script"
 * blocks. DEMO-D1-S4-001 carries a "Facilitator card" instead, because a
 * Stage 4 panel is facilitated rather than administered one to one. The
 * block name varies; the structure does not.
 *
 * TWO LINE SHAPES, both parsed mechanically and neither interpreted:
 *
 *   - **VERB** *(Bn)* text          a script line  → action_type = VERB
 *   - **Rn** text RoleLabel         a reveal line  → action_type = REVEAL
 *
 * Nothing here decides which beat is a decision point. CS-I-40 is
 * explicit that the role label is DESCRIPTIVE and the source-sheet field
 * governs, so role_label is carried and is_decision_point is left false
 * for every row. The reference beat resolves at serve time from
 * enquiry_point, account_test_point or bearing_interest under CS-I-32.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SRC = process.argv[2];
const OUT = process.argv[3];
const lines = readFileSync(SRC, "utf8").split("\n");

const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`;

/** The heading that owns a given line: the nearest #### above it. */
function ownerOf(i) {
  for (let j = i; j >= 0; j--) {
    const m = /^#### ((?:SRC|DEMO)-D1-S\d-\d+)\b/.exec(lines[j]);
    if (m) return m[1];
  }
  return null;
}

/** A bullet block: consecutive "- " items, continuations indented. */
function bulletsFrom(start) {
  const out = [];
  let cur = null;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (/^- /.test(line)) {
      if (cur) out.push(cur);
      cur = line;
      continue;
    }
    if (cur && /^\s{2,}\S/.test(line)) {
      cur += " " + line.trim();
      continue;
    }
    if (line.trim() === "") continue;
    break;
  }
  if (cur) out.push(cur);
  return out;
}

const ROLE_LABELS = ["Opening", "Enquiry point", "Corrective prompt", "Account test"];

const rows = [];
const seen = new Set();

function addBlock(headingIdx) {
  const owner = ownerOf(headingIdx);
  if (!owner) return;
  // Only the first sequence block per source is the sequence. A later
  // script block adds action types to the same beats and is handled
  // separately below.
  const bullets = bulletsFrom(headingIdx + 1);
  let ordinal = 0;

  for (const b of bullets) {
    const clean = b.replace(/^- /, "").replace(/\s+/g, " ").trim();

    // Script line: - **READ** *(B1)* "text"
    let m = /^\*\*(READ|ASK|PAUSE|SAY|BRIEF)\*\*\s*(?:\*\(([^)]*)\)\*)?\s*(.*)$/.exec(clean);
    if (m) {
      const [, verb, paren, rest] = m;
      const beat = paren && /^B\d+$/.test(paren.trim()) ? paren.trim() : null;
      const role = paren && !beat ? paren.trim() : null;
      const text = rest.replace(/^\*\(([^)]*)\)\*\s*/, "").replace(/^"|"$/g, "").trim();
      const pause = /(\d+)\s*to\s*(\d+)\s*seconds/i.exec(clean);
      rows.push({
        src: owner,
        ordinal: ++ordinal,
        beat,
        action: verb,
        text: text.replace(/^\*\*|\*\*$/g, "").trim(),
        min: verb === "PAUSE" && pause ? Number(pause[1]) : null,
        max: verb === "PAUSE" && pause ? Number(pause[2]) : null,
        role,
      });
      continue;
    }

    // Reveal line: - **R1** text Opening   |   - **B1** text
    m = /^\*\*([BR]\d+)\*\*\s*(.*)$/.exec(clean);
    if (m) {
      const [, beat, restRaw] = m;
      let rest = restRaw.trim();
      let role = null;
      for (const label of ROLE_LABELS) {
        // The label sits at the end, sometimes after an em dash, and
        // "Account test" may carry "— authored".
        const re = new RegExp(`[—-]?\\s*${label}(\\s*[—-]\\s*authored)?\\s*$`, "i");
        if (re.test(rest)) {
          role = label;
          rest = rest.replace(re, "").trim();
          break;
        }
      }
      rows.push({
        src: owner,
        ordinal: ++ordinal,
        beat,
        action: "REVEAL",
        text: rest.replace(/\s*[—-]\s*$/, "").replace(/^\*|\*$/g, "").trim(),
        min: null,
        max: null,
        role,
      });
      continue;
    }
  }
  if (ordinal > 0) seen.add(owner);
}

// The sequence blocks, then the script blocks that give action types.
lines.forEach((l, i) => {
  if (/^\*\*Reveal sequence/.test(l)) addBlock(i);
});
lines.forEach((l, i) => {
  if (/^\*\*(Mentor script|Facilitator card)\*\*\s*$/.test(l)) addBlock(i);
});

// A source may contribute both a Reveal sequence and a script block. Keep
// both: they describe the same beats from the two sides — what the
// participant is shown, and what the mentor does. Ordinals are made
// unique per source in load order.
const bySrc = new Map();
for (const r of rows) {
  if (!bySrc.has(r.src)) bySrc.set(r.src, []);
  bySrc.get(r.src).push(r);
}
for (const list of bySrc.values()) list.forEach((r, i) => (r.ordinal = i + 1));

const out = [];
out.push(`-- Generated by scripts/extract-d1-sequences.mjs. Do not hand-edit.
-- T3A-D1-EXEC-CORR-004 CS-I-39 to CS-I-41.
--
-- is_decision_point is FALSE on every row by design. CS-I-40: the role
-- label is descriptive and the source-sheet field governs, so the
-- reference beat resolves at serve time from enquiry_point,
-- account_test_point or bearing_interest under CS-I-32. Nothing here
-- decides where a decision point sits.

set search_path = public;
`);

for (const [src, list] of [...bySrc.entries()].sort()) {
  out.push(`\n-- ${src} — ${list.length} beats`);
  out.push(`INSERT INTO public.t3a_d1_mentor_action_sequence
  (source_identifier, beat_ordinal, beat_code, action_type, content_verbatim,
   is_decision_point, pause_seconds_min, pause_seconds_max, role_label)
VALUES`);
  out.push(
    list
      .map(
        (r) =>
          `  (${sqlStr(r.src)}, ${r.ordinal}, ${r.beat ? sqlStr(r.beat) : "NULL"}, ` +
          `${sqlStr(r.action)}, ${sqlStr(r.text)}, false, ` +
          `${r.min ?? "NULL"}, ${r.max ?? "NULL"}, ${r.role ? sqlStr(r.role) : "NULL"})`
      )
      .join(",\n")
  );
  out.push(`ON CONFLICT (source_identifier, beat_ordinal) DO NOTHING;`);
}

writeFileSync(OUT, out.join("\n") + "\n");

const demo = [...bySrc.keys()].filter((s) => s.startsWith("DEMO")).sort();
const s1 = [...bySrc.keys()].filter((s) => /^SRC-D1-S1-/.test(s)).sort();
const other = [...bySrc.keys()].filter((s) => !s.startsWith("DEMO") && !/^SRC-D1-S1-/.test(s)).sort();
console.log(`sequences=${bySrc.size} beats=${rows.length}`);
console.log(`demonstration (${demo.length}): ${demo.join(", ")}`);
console.log(`stage 1 production (${s1.length}): ${s1.join(", ")}`);
if (other.length) console.log(`OTHER (${other.length}): ${other.join(", ")}`);

// CS-32: thirteen sequences, three demonstration and ten Stage 1.
const problems = [];
if (demo.length !== 3) problems.push(`expected 3 demonstration sequences, got ${demo.length}`);
if (s1.length !== 10) problems.push(`expected 10 Stage 1 sequences, got ${s1.length}`);
if (bySrc.size !== 13) problems.push(`expected 13 sequences, got ${bySrc.size}`);
if (other.length) problems.push(`unexpected sequence sources: ${other.join(", ")}`);
if (problems.length) {
  console.error("\nSEQUENCE_INVENTORY_MISMATCH:");
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log("inventory: thirteen sequences, three demonstration and ten Stage 1 — as CS-I-41 states");
