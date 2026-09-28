#!/usr/bin/env node
/**
 * T3A-D1-EXEC-CLOSE-001 Section 3A — load the ten Stage 4 production
 * mentor action sequences, and their co-participant briefings.
 *
 * WHY THIS IS A SEPARATE SCRIPT AND NOT A FLAG ON THE STAGE 2 ONE.
 * CS-I-57 says the Stage 2 rule is never applied to a Stage 4 source, and
 * CL-26 says to build a Stage 4 rule separate from it. A shared function
 * with a mode switch would be one edit away from breaking that, and the
 * failure would be silent: Stage 2's vocabulary finds six beats in a Stage
 * 4 script and the count error describes the symptom, not the cause. Two
 * scripts cannot be crossed by accident.
 *
 * THE ONE DIFFERENCE FROM STAGE 2 (CL-27). The action vocabulary is SAY,
 * PAUSE, ASK and ROUND. Stage 2 uses a fifteen-second PAUSE at B2; Stage 4
 * substitutes a ROUND — "Invite each co-participant in turn. Do not
 * comment. Do not look at or address the observed participant."
 *
 * CL-29 — TWO BLOCKS WITH BEAT CODES SIT BEFORE THE SCRIPT AND ARE NOT
 * BEATS. Verified on the loaded text, not assumed: on SRC-D1-S4-001 the
 * co-participant positions block sits at offset 771 and carries "**B2**",
 * and "The four questions" table sits at 1100 and carries B3, B4, B5 and
 * B6. "The script" marker is at 1376. Starting there excludes both, and
 * the beat count is asserted afterwards so a regression cannot pass.
 *
 * CL-30 — THE CO-PARTICIPANT POSITIONS ARE THEIR OWN RECORD. Each source
 * names three co-participants and the position each states at B2. Without
 * them the ROUND has nothing to run: a facilitator inviting each person in
 * turn needs to know what each was briefed to say. They are NOT beats and
 * they are NOT shared session material — each is given in writing to that
 * co-participant only (R3, CL-T25).
 */
import { writeFileSync } from "node:fs";

const OUT = process.argv[2];
const REPORT_ONLY = !OUT;

const SBP = process.env.SBP;
const PROJECT_REF = process.env.PROJECT_REF || "tnjyywtulpdyackmwnca";
if (!SBP) {
  console.error("extract-d1-stage4-scripts: no SBP credential — refusing to guess at content.");
  process.exit(1);
}

const query = async (sql) => {
  const r = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: sql }),
    }
  );
  if (!r.ok) throw new Error(`RPC ${r.status}: ${await r.text()}`);
  return r.json();
};

const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`;

// CL-31. The same fixed eight-to-thirteen translation as Stage 2.
const LABEL_TRANSLATION = {
  C1: ["C1"],
  C2: ["C2"],
  C3: ["C3"],
  C4: ["C4a", "C4b"],
  C5: ["C5a", "C5b1", "C5b2", "C5c"],
  C6: ["C6"],
  C7: ["C7"],
  C8: ["C8a", "C8b"],
};

const START_MARKER = "The script";
const END_MARKER = "Question applicability";
const BRIEFING_MARKER = "CO-PARTICIPANT POSITIONS";

const normalize = (s) => s.replace(/\s+/g, " ").trim();
const deEmphasize = (s) => s.replace(/\*\*/g, "").replace(/(^|\s)[-*]\s+/g, "$1");

// CL-27. SAY, PAUSE, ASK and ROUND.
const BEAT_RE = /(B[1-9])\s*(SAY|PAUSE|ASK|ROUND|READ)(?:\s*(\d+))?/g;

// CL-08. The vocabulary is closed at three.
const KNOWN_QUALIFIERS = ["update", "final"];
const BINDING_RE = new RegExp(
  `((?:C\\d+[a-z0-9]*\\s*,\\s*)*C\\d+[a-z0-9]*)(?:\\s+(${KNOWN_QUALIFIERS.join("|")}))?\\s*$`
);
const UNKNOWN_QUALIFIER_RE = /((?:C\d+[a-z0-9]*\s*,\s*)*C\d+[a-z0-9]*)\s+([a-z]{2,})\s*$/;

function scriptRegion(verbatim) {
  const flat = normalize(verbatim);
  const start = flat.indexOf(START_MARKER);
  if (start < 0) return { error: "START_MARKER_NOT_FOUND" };
  const end = flat.indexOf(END_MARKER, start);
  if (end < 0) return { error: "END_BOUNDARY_NOT_FOUND" };

  // CL-29, asserted rather than trusted: both pre-script blocks carrying
  // beat codes must sit BEFORE the marker we start from.
  const briefingAt = flat.indexOf(BRIEFING_MARKER);
  const fourQAt = flat.toLowerCase().indexOf("the four questions");
  if (briefingAt >= 0 && briefingAt > start) {
    return { error: "CO_PARTICIPANT_BLOCK_AFTER_SCRIPT_MARKER — starting at the marker would read it as beats" };
  }
  if (fourQAt >= 0 && fourQAt > start) {
    return { error: "FOUR_QUESTIONS_TABLE_AFTER_SCRIPT_MARKER — starting at the marker would read it as beats" };
  }

  return { text: flat.slice(start + START_MARKER.length, end) };
}

/** CL-30. Three co-participants and the position each states at B2. */
function briefing(verbatim) {
  const flat = normalize(verbatim);
  const start = flat.indexOf(BRIEFING_MARKER);
  if (start < 0) return { error: "CO_PARTICIPANT_POSITIONS_NOT_FOUND" };
  const end = flat.toLowerCase().indexOf("the four questions", start);
  const region = deEmphasize(flat.slice(start, end < 0 ? flat.length : end));

  const out = [];
  const re = /Co-participant\s*(\d+)\s*(.*?)(?=Co-participant\s*\d+|$)/g;
  let m;
  while ((m = re.exec(region)) !== null) {
    const position = m[2].trim();
    if (position) out.push({ ordinal: Number(m[1]), position });
  }
  return out.length ? { positions: out } : { error: "NO_CO_PARTICIPANT_POSITIONS_PARSED" };
}

function parseSource(identifier, verbatim) {
  const region = scriptRegion(verbatim);
  if (region.error) return { identifier, error: region.error };

  const body = deEmphasize(region.text);
  const marks = [];
  BEAT_RE.lastIndex = 0;
  let m;
  while ((m = BEAT_RE.exec(body)) !== null) {
    marks.push({ code: m[1], action: m[2], at: m.index, after: BEAT_RE.lastIndex });
  }

  const beats = marks.map((k, i) => {
    const raw = body.slice(k.after, i + 1 < marks.length ? marks[i + 1].at : body.length).trim();
    let content = raw;
    let labels = [];
    let qualifier = null;
    let unknownQualifier = null;

    const b = BINDING_RE.exec(raw);
    if (b) {
      labels = b[1].split(",").map((s) => s.trim()).filter(Boolean);
      qualifier = b[2] ?? null;
      content = raw.slice(0, b.index).trim();
    } else {
      const u = UNKNOWN_QUALIFIER_RE.exec(raw);
      if (u) unknownQualifier = u[2];
    }
    content = content.replace(/[—–-]\s*$/, "").trim();

    return { code: k.code, action: k.action, content, labels, qualifier, isUpdate: qualifier === "update", unknownQualifier };
  });

  return { identifier, beats, briefing: briefing(verbatim) };
}

function translate(labels) {
  const out = [];
  const unknown = [];
  for (const label of labels) {
    const mapped = LABEL_TRANSLATION[label];
    if (!mapped) { unknown.push(label); continue; }
    for (const code of mapped) if (!out.includes(code)) out.push(code);
  }
  return { sets: out, unknown };
}

// ---------------------------------------------------------------------

const rows = await query(`
  SELECT co.identifier, cv.body->>'verbatim' AS verbatim
    FROM public.t3a_content_object co
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id
     AND cv.superseded_by IS NULL
   WHERE co.family = 'source'::public.t3a_content_family
     AND co.identifier ~ '^SRC-D1-S4-0[0-9]+$'
   ORDER BY co.identifier`);

const EXPECTED = Array.from({ length: 10 }, (_, i) => `SRC-D1-S4-${String(i + 1).padStart(3, "0")}`);
const got = rows.map((r) => r.identifier);
const registerCodes = new Set(
  (await query(`SELECT capture_set_code FROM public.t3a_d1_capture_set`)).map((r) => r.capture_set_code)
);

const problems = [];
for (const s of EXPECTED) if (!got.includes(s)) problems.push(`source not found: ${s}`);
for (const s of got) if (!EXPECTED.includes(s)) problems.push(`unexpected source matched: ${s}`);

const parsed = rows.map((r) => parseSource(r.identifier, r.verbatim));
const loadable = [];

for (const p of parsed) {
  if (p.error) { problems.push(`${p.identifier}: ${p.error}`); continue; }

  // CL-28. Exactly seven beats, B1 to B7, with B2 as ROUND.
  const codes = p.beats.map((b) => b.code);
  if (p.beats.length !== 7 || codes.join(",") !== "B1,B2,B3,B4,B5,B6,B7") {
    problems.push(`${p.identifier}: expected seven beats B1 to B7, got ${p.beats.length} [${codes.join(", ")}]`);
    continue;
  }
  const b2 = p.beats.find((b) => b.code === "B2");
  if (b2.action !== "ROUND") {
    problems.push(`${p.identifier}: B2 must be ROUND at Stage 4, found ${b2.action}`);
    continue;
  }
  const empty = p.beats.filter((b) => !b.action || !b.content);
  if (empty.length) {
    problems.push(`${p.identifier}: empty action or verbatim at ${empty.map((b) => b.code).join(", ")}`);
    continue;
  }

  if (p.briefing.error) { problems.push(`${p.identifier}: ${p.briefing.error}`); continue; }

  const bindings = [];
  let refused = false;
  for (const b of p.beats) {
    if (b.unknownQualifier) {
      problems.push(`${p.identifier} ${b.code}: unrecognized qualifier "${b.unknownQualifier}" — CL-08 refuses the load rather than storing it without behavior`);
      refused = true; continue;
    }
    const { sets, unknown } = translate(b.labels);
    if (unknown.length) {
      problems.push(`${p.identifier} ${b.code}: label not in the translation table: ${unknown.join(", ")}`);
      refused = true; continue;
    }
    const outside = sets.filter((s) => !registerCodes.has(s));
    if (outside.length) {
      problems.push(`${p.identifier} ${b.code}: outside the thirteen-set register after translation: ${outside.join(", ")}`);
      refused = true; continue;
    }
    for (const code of sets) bindings.push({ beat: b.code, code, revisable: b.isUpdate, qualifier: b.qualifier });
  }
  if (refused) continue;

  // CL-50, checked here as well as by the load trigger, so a report shows
  // it before a migration aborts on it.
  for (const b of p.beats) {
    if (/\bC\d+[a-z0-9]*\b/.test(b.content) || /\b(update|final)\b/i.test(b.content)) {
      problems.push(`${p.identifier} ${b.code}: verbatim carries a capture label or qualifier — "${b.content.slice(-40)}"`);
      refused = true;
    }
  }
  if (refused) continue;

  loadable.push({ identifier: p.identifier, beats: p.beats, bindings, positions: p.briefing.positions });
}

console.log(`sources matched: ${rows.length}`);
for (const p of parsed) {
  if (p.error) { console.log(`  ${p.identifier}  REFUSED — ${p.error}`); continue; }
  console.log(`  ${p.identifier}  ${p.beats.map((b) => `${b.code} ${b.action}`).join(" | ")}`);
  for (const b of p.beats) {
    const { sets } = translate(b.labels);
    console.log(`      ${b.code} ${b.action}  [${b.labels.join(", ") || "—"}] -> [${sets.join(", ") || "—"}]${b.qualifier ? "  " + b.qualifier.toUpperCase() : ""}`);
  }
  if (!p.briefing.error) {
    for (const c of p.briefing.positions) {
      console.log(`      co-participant ${c.ordinal}: "${c.position.slice(0, 74)}${c.position.length > 74 ? "…" : ""}"`);
    }
  }
}

if (problems.length) {
  console.error("\nSTAGE4_PARSE_REFUSED:");
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`\nten of ten yield B1 to B7 with B2 = ROUND; ${loadable.reduce((n, s) => n + s.bindings.length, 0)} bindings; ${loadable.reduce((n, s) => n + s.positions.length, 0)} co-participant positions`);

if (REPORT_ONLY) {
  console.log("report only — pass an output path to emit SQL");
  process.exit(0);
}

const out = [];
out.push("-- Generated by scripts/extract-d1-stage4-scripts.mjs. Do not hand-edit.");
out.push("-- CLOSE-001 Section 3A: the ten Stage 4 production sequences, B2 = ROUND.");
out.push("-- CL-33: sequence, binding and briefing rows only. No source-sheet field is written.");
out.push("");
out.push("set search_path = public;");
out.push("");

for (const s of loadable) {
  out.push(`-- ${s.identifier}`);
  out.push("INSERT INTO public.t3a_d1_mentor_action_sequence");
  out.push("  (source_identifier, beat_ordinal, beat_code, action_type, content_verbatim, is_decision_point)");
  out.push("VALUES");
  out.push(s.beats.map((b, i) =>
    `  (${sqlStr(s.identifier)}, ${i + 1}, ${sqlStr(b.code)}, ${sqlStr(b.action)}, ${sqlStr(b.content)}, false)`
  ).join(",\n"));
  out.push("ON CONFLICT (source_identifier, beat_ordinal) DO NOTHING;");
  out.push("");
  out.push("INSERT INTO public.t3a_d1_beat_capture_binding");
  out.push("  (source_identifier, beat_code, capture_set_code, revisable, qualifier_as_written)");
  out.push("VALUES");
  out.push(s.bindings.map((b) =>
    `  (${sqlStr(s.identifier)}, ${sqlStr(b.beat)}, ${sqlStr(b.code)}, ${b.revisable}, ${b.qualifier ? sqlStr(b.qualifier) : "NULL"})`
  ).join(",\n"));
  out.push("ON CONFLICT (source_identifier, beat_code, capture_set_code) DO NOTHING;");
  out.push("");
  out.push("INSERT INTO public.t3a_d1_co_participant_briefing");
  out.push("  (source_identifier, co_participant_ordinal, stated_at_beat, position_text)");
  out.push("VALUES");
  out.push(s.positions.map((c) =>
    `  (${sqlStr(s.identifier)}, ${c.ordinal}, 'B2', ${sqlStr(c.position)})`
  ).join(",\n"));
  out.push("ON CONFLICT (source_identifier, co_participant_ordinal) DO NOTHING;");
  out.push("");
}

writeFileSync(OUT, out.join("\n") + "\n");
console.log(`wrote ${OUT}`);
