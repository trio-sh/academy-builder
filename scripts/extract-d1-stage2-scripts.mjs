#!/usr/bin/env node
/**
 * Section 6.1 — load the ten Stage 2 production mentor action sequences.
 *
 * CS-I-42 classified these as content authoring outside the build. It was
 * wrong for Stage 2: every one of SRC-D1-S2-001 to SRC-D1-S2-010 already
 * carries a complete seven-beat script in the issued Execution Edition.
 * The source-to-markdown conversion flattened the table, so it reads as
 * run-together text rather than a structured block — the same fault
 * CS-I-21 and RA-06 already handle elsewhere.
 *
 * WHY THIS READS THE DATABASE AND NOT A FILE. The other extractors take
 * the issued document as an argument. This one reads the stored
 * `verbatim` of each source's CURRENT version, which is the text that
 * carries a standing REC-07 approval. Parsing the approved text rather
 * than a file on disk means the parse cannot silently run against a copy
 * that was superseded — the lesson of CS-I-48, where thirteen tests went
 * green against a superseded fixture. The verbatim is never modified.
 *
 * CS-I-54: this writes to the sequence and binding tables ONLY. It emits
 * no statement that touches a source-sheet field, and the migration that
 * applies it asserts the sheet values are unchanged.
 *
 * THE FOUR TRAPS, each of which yields a wrong answer silently:
 *
 *  1. CS-I-49  The soft wrap splits the marker itself on SRC-D1-S2-010 —
 *              "The" ends one line and "script" begins the next. A search
 *              on raw text finds nothing and that source yields ZERO
 *              beats. Whitespace is collapsed FIRST, then searched.
 *  2. CS-I-49a The table has a hard end at `**Question applicability**`.
 *              The applicability table that follows also contains lines
 *              beginning with a beat code — on SRC-D1-S2-001 two read
 *              "- **B5** Q-D1-05b1..." and "- **B5** Q-D1-06...". A parser
 *              that reads past the boundary counts NINE beats and CS-I-50
 *              then refuses every Stage 2 source.
 *  3. CS-I-51  The tables bind capture sets using the SUPERSEDED
 *              eight-set labels. C4, C5 and C8 do not exist in the
 *              current thirteen-set register, so storing them literally
 *              would trip the register check and every sequence would
 *              fail to load. The translation is fixed, not a judgment.
 *  4. CS-I-57  Stage 4's second beat is B2 ROUND. This parser recognizes
 *              ROUND only in order to REFUSE a Stage 4 shape loudly,
 *              rather than find six beats and let CS-I-50 report a count
 *              error that hides what actually happened.
 *
 * Bold emphasis is stripped before matching: B1 and B5 render in bold
 * because they begin a markdown list item, and the others do not.
 */
import { writeFileSync } from "node:fs";

const OUT = process.argv[2];
const REPORT_ONLY = !OUT;

const SBP = process.env.SBP;
const PROJECT_REF = process.env.PROJECT_REF || "tnjyywtulpdyackmwnca";
if (!SBP) {
  console.error("extract-d1-stage2-scripts: no SBP credential — refusing to guess at content.");
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

// CS-I-51. Fixed, and not a judgment call.
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
const END_MARKER = "**Question applicability**";

/**
 * CS-I-49. Collapse every run of whitespace — line breaks included — to a
 * single space. Done before any search, so a marker the soft wrap split
 * across two lines reads as one token.
 */
const normalize = (s) => s.replace(/\s+/g, " ").trim();

/** Strip markdown emphasis and list bullets, leaving the words. */
const deEmphasize = (s) => s.replace(/\*\*/g, "").replace(/(^|\s)[-*]\s+/g, "$1");

/**
 * The script region: from the start marker to the hard end boundary.
 * Both are located in NORMALIZED text (CS-I-49), and the end boundary is
 * mandatory in spirit — where it is absent the region would run into the
 * applicability table, so its absence is reported rather than tolerated.
 */
function scriptRegion(verbatim) {
  const flat = normalize(verbatim);
  const start = flat.indexOf(START_MARKER);
  if (start < 0) return { error: "START_MARKER_NOT_FOUND" };

  // The end boundary is searched for AFTER the start, with emphasis
  // intact: `**Question applicability**` is the literal line CS-I-49a
  // names. A fallback on the un-emphasized phrase covers a source whose
  // conversion dropped the asterisks, and is reported when it is used.
  let end = flat.indexOf(END_MARKER, start);
  let boundary = END_MARKER;
  if (end < 0) {
    end = flat.indexOf("Question applicability", start);
    boundary = "Question applicability (un-emphasized fallback)";
  }
  if (end < 0) return { error: "END_BOUNDARY_NOT_FOUND" };

  return { text: flat.slice(start + START_MARKER.length, end), boundary };
}

/**
 * Beat delimiters. ROUND is matched only so a Stage 4 shape is refused by
 * name instead of quietly yielding six beats.
 */
const BEAT_RE = /(B[1-9])\s*(SAY|PAUSE|ASK|READ|ROUND)(?:\s*(\d+))?/g;

/**
 * The capture binding sits at the END of a beat's text, as a comma list of
 * set labels optionally followed by a qualifier. A lone em dash means the
 * beat binds nothing.
 *
 * TWO QUALIFIERS EXIST IN THE ISSUED SCRIPTS, AND SECTION 6.1 DEFINES ONE.
 * CS-I-51b defines "update". The other, "final", appears twice — at B7 on
 * SRC-D1-S2-005 and SRC-D1-S2-010, the two bearing-interest sources,
 * written "C8 final". Section 6.1 does not mention it and no instruction
 * gives it a meaning.
 *
 * It is parsed rather than ignored, because ignoring it would leave the
 * words "C8 final" inside content_verbatim — a binding leaking into the
 * approved spoken line, which is the one thing this table must never
 * carry. The qualifier is stored as written and given NO BEHAVIOR: it is
 * not treated as "update", so it grants no revision, and under CS-I-51d a
 * set already bound at an earlier beat without "update" is one
 * determination that holds, so binding C8 again at B7 changes nothing that
 * is served. What "final" is meant to mean is recorded for the founder
 * rather than decided here.
 *
 * The qualifier list is CLOSED on purpose. A lowercase word after a
 * capture list that is neither "update" nor "final" is not assumed to be a
 * qualifier — the text is left intact and the source is reported, because
 * swallowing an unrecognized word would silently truncate an approved
 * line.
 */
const KNOWN_QUALIFIERS = ["update", "final"];
const BINDING_RE = new RegExp(
  `((?:C\\d+[a-z0-9]*\\s*,\\s*)*C\\d+[a-z0-9]*)(?:\\s+(${KNOWN_QUALIFIERS.join("|")}))?\\s*$`
);
/** A capture list trailed by some OTHER lowercase word. Reported, not parsed. */
const UNKNOWN_QUALIFIER_RE = /((?:C\d+[a-z0-9]*\s*,\s*)*C\d+[a-z0-9]*)\s+([a-z]{2,})\s*$/;

function parseSource(identifier, verbatim) {
  const region = scriptRegion(verbatim);
  if (region.error) return { identifier, error: region.error };

  const body = deEmphasize(region.text);

  const marks = [];
  BEAT_RE.lastIndex = 0;
  let m;
  while ((m = BEAT_RE.exec(body)) !== null) {
    marks.push({ code: m[1], action: m[2], ordinalSuffix: m[3], at: m.index, after: BEAT_RE.lastIndex });
  }

  if (marks.some((k) => k.action === "ROUND")) {
    // CS-I-57. Refuse loudly. A Stage 4 script parsed by a rule that does
    // not know ROUND yields six beats, and a count error would describe
    // the symptom rather than the cause.
    return {
      identifier,
      error: "ROUND_BEAT_PRESENT — this is a Stage 4 shape; Stage 4 production loading is deferred to REC-12 and needs a ROUND-aware rule",
    };
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

    // A beat that binds nothing ends in an em dash. Strip only a TRAILING
    // one: B6's own verbatim contains an em dash mid-sentence.
    content = content.replace(/[—–-]\s*$/, "").trim();

    return {
      code: k.code,
      // "ASK 1" through "ASK 4" are the same action with a position; the
      // controlled set holds ASK, and the number is the beat's own order,
      // which beat_ordinal already carries.
      action: k.action,
      askOrdinal: k.ordinalSuffix ? Number(k.ordinalSuffix) : null,
      content,
      labels,
      qualifier,
      // CS-I-51b. Only "update" permits revision. "final" does not.
      isUpdate: qualifier === "update",
      unknownQualifier,
    };
  });

  return { identifier, beats, boundary: region.boundary };
}

/** CS-I-51b. "update" applies to EVERY set listed before it in that beat's
 * binding, not only the last one. */
function translate(labels) {
  const out = [];
  const unknown = [];
  for (const label of labels) {
    const mapped = LABEL_TRANSLATION[label];
    if (!mapped) {
      unknown.push(label);
      continue;
    }
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
     AND co.identifier ~ '^SRC-D1-S2-0[0-9]+$'
   ORDER BY co.identifier`);

// CS-I-49: exactly the ten, and no other source.
const EXPECTED = Array.from({ length: 10 }, (_, i) => `SRC-D1-S2-${String(i + 1).padStart(3, "0")}`);
const got = rows.map((r) => r.identifier);
const missing = EXPECTED.filter((s) => !got.includes(s));
const extra = got.filter((s) => !EXPECTED.includes(s));

const registerCodes = new Set(
  (await query(`SELECT capture_set_code FROM public.t3a_d1_capture_set`)).map((r) => r.capture_set_code)
);

const parsed = rows.map((r) => parseSource(r.identifier, r.verbatim));

const problems = [];
if (missing.length) problems.push(`sources not found: ${missing.join(", ")}`);
if (extra.length) problems.push(`unexpected sources matched: ${extra.join(", ")}`);

const loadable = [];

for (const p of parsed) {
  if (p.error) {
    problems.push(`${p.identifier}: ${p.error}`);
    continue;
  }

  // CS-I-50. Exactly seven beats, B1 to B7, in order, each with a
  // non-empty action type and non-empty verbatim text. Anything else
  // refuses the sequence for that source and is logged by name. No
  // partial load.
  const codes = p.beats.map((b) => b.code);
  const expectCodes = ["B1", "B2", "B3", "B4", "B5", "B6", "B7"];
  if (p.beats.length !== 7 || codes.join(",") !== expectCodes.join(",")) {
    problems.push(
      `${p.identifier}: expected seven beats B1 to B7 in order, got ${p.beats.length} [${codes.join(", ")}]`
    );
    continue;
  }
  const empty = p.beats.filter((b) => !b.action || !b.content);
  if (empty.length) {
    problems.push(
      `${p.identifier}: beats with an empty action or empty verbatim: ${empty.map((b) => b.code).join(", ")}`
    );
    continue;
  }

  // CS-I-51 / CS-I-51c. Translate, then check the register. A binding that
  // still fails after translation refuses the sequence for that source.
  const bindings = [];
  let refused = false;
  for (const b of p.beats) {
    const { sets, unknown } = translate(b.labels);
    if (unknown.length) {
      problems.push(`${p.identifier} ${b.code}: capture label not in the translation table: ${unknown.join(", ")}`);
      refused = true;
      continue;
    }
    const outside = sets.filter((s) => !registerCodes.has(s));
    if (outside.length) {
      problems.push(`${p.identifier} ${b.code}: binding outside the thirteen-set register after translation: ${outside.join(", ")}`);
      refused = true;
      continue;
    }
    if (b.unknownQualifier) {
      problems.push(
        `${p.identifier} ${b.code}: a capture list is trailed by "${b.unknownQualifier}", which is neither "update" nor "final". Not parsed as a qualifier, because guessing would truncate an approved line.`
      );
      refused = true;
      continue;
    }
    for (const code of sets)
      bindings.push({ beat: b.code, code, revisable: b.isUpdate, qualifier: b.qualifier });
  }
  if (refused) continue;

  loadable.push({ identifier: p.identifier, beats: p.beats, bindings, boundary: p.boundary });
}

// ---------------------------------------------------------------------
// Report first. A parse whose output nobody looked at is a guess.
// ---------------------------------------------------------------------

console.log(`sources matched: ${rows.length}`);
for (const p of parsed) {
  if (p.error) {
    console.log(`  ${p.identifier}  REFUSED — ${p.error}`);
    continue;
  }
  const bits = p.beats.map((b) => `${b.code} ${b.action}${b.askOrdinal ? " " + b.askOrdinal : ""}`);
  console.log(`  ${p.identifier}  ${p.beats.length} beats: ${bits.join(" | ")}`);
  for (const b of p.beats) {
    const { sets } = translate(b.labels);
    console.log(
      `      ${b.code} ${b.action}  sets[${b.labels.join(", ") || "—"}] -> [${sets.join(", ") || "—"}]${b.qualifier ? "  " + b.qualifier.toUpperCase() : ""}`
    );
    console.log(`         "${b.content.slice(0, 96)}${b.content.length > 96 ? "…" : ""}"`);
  }
}

if (problems.length) {
  console.error("\nSTAGE2_PARSE_REFUSED:");
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`\nten of ten yield B1 to B7; ${loadable.reduce((n, s) => n + s.bindings.length, 0)} bindings, all inside the thirteen-set register`);

if (REPORT_ONLY) {
  console.log("report only — pass an output path to emit SQL");
  process.exit(0);
}

// ---------------------------------------------------------------------
// Emit. Sequence rows and binding rows only (CS-I-54).
// ---------------------------------------------------------------------

const out = [];
out.push("-- Generated by scripts/extract-d1-stage2-scripts.mjs. Do not hand-edit.");
out.push("-- Section 6.1: the ten Stage 2 production mentor action sequences.");
out.push("-- CS-I-54: sequence and binding rows only. No source-sheet field is written.");
out.push("");
out.push("set search_path = public;");
out.push("");

for (const s of loadable) {
  out.push(`-- ${s.identifier} — seven beats, boundary: ${s.boundary}`);
  out.push("INSERT INTO public.t3a_d1_mentor_action_sequence");
  out.push("  (source_identifier, beat_ordinal, beat_code, action_type, content_verbatim, is_decision_point)");
  out.push("VALUES");
  out.push(
    s.beats
      .map(
        (b, i) =>
          `  (${sqlStr(s.identifier)}, ${i + 1}, ${sqlStr(b.code)}, ${sqlStr(b.action)}, ${sqlStr(b.content)}, false)`
      )
      .join(",\n")
  );
  // CS-I-52: is_decision_point stays false for every row. It resolves at
  // serve time from enquiry_point, account_test_point and bearing_interest
  // under CS-I-32 — never from the beat's action type or its position.
  out.push("ON CONFLICT (source_identifier, beat_ordinal) DO NOTHING;");
  out.push("");

  out.push("INSERT INTO public.t3a_d1_beat_capture_binding");
  out.push("  (source_identifier, beat_code, capture_set_code, revisable, qualifier_as_written)");
  out.push("VALUES");
  out.push(
    s.bindings
      .map(
        (b) =>
          `  (${sqlStr(s.identifier)}, ${sqlStr(b.beat)}, ${sqlStr(b.code)}, ${b.revisable}, ${b.qualifier ? sqlStr(b.qualifier) : "NULL"})`
      )
      .join(",\n")
  );
  out.push("ON CONFLICT (source_identifier, beat_code, capture_set_code) DO NOTHING;");
  out.push("");
}

writeFileSync(OUT, out.join("\n") + "\n");
console.log(`wrote ${OUT}`);
