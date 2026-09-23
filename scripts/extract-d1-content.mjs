#!/usr/bin/env node
/**
 * Extract D1 content from T3A-D1-EXEC-001 Section 5 and emit a SQL seed.
 *
 * Nothing here is authored by the developer. Every value is parsed from
 * the issued document; where a field is not stated, it is left null and
 * the fail-closed behaviour for that control governs.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SRC = process.argv[2];
const OUT = process.argv[3];
// Where sections 5.2, 5.3 and 5.4 go. See the note above section 5.2.
const CAPTURE_OUT = process.argv[4]
  || OUT.replace(/20260926000000_t3a_d1_content_load\.sql$/,
                 "20260927100000_t3a_d1_capture_content_load.sql");

const CAPTURE_BEGIN = "--@@CAPTURE_BEGIN@@";
const CAPTURE_END = "--@@CAPTURE_END@@";
const doc = readFileSync(SRC, "utf8");
const lines = doc.split("\n");

const sectionRange = (startRe, endRe) => {
  const start = lines.findIndex((l) => startRe.test(l));
  const end = lines.findIndex((l, i) => i > start && endRe.test(l));
  return lines.slice(start, end === -1 ? lines.length : end);
};

/** Parse a GitHub-style markdown table into rows of trimmed cells. */
const parseTable = (block) => {
  const rows = [];
  for (const line of block) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.every((c) => /^-{2,}$/.test(c.replace(/:/g, "")))) continue;
    rows.push(cells);
  }
  return rows;
};

/**
 * The one correction applied to issued content, and the only one.
 *
 * Five occurrences of the British spelling `behavioural` sit inside the
 * quoted source bodies. T3A-D1-EXEC-001 §5 forbids the developer
 * deriving, inferring or authoring content; T3A-DEV-SPEC-002 §1.4 and
 * AC-61 require U.S. spelling and fail the build otherwise. The two
 * rules conflict, and the conflict was recorded rather than settled by
 * the developer.
 *
 * The founder settled it: correct the five. That decision is applied
 * here, by name and by name only, so a regeneration cannot reintroduce
 * them and no other word in an issued source is touched.
 */
const FOUNDER_DECIDED_CORRECTIONS = [
  [/\bBEHAVIOURAL\b/g, "BEHAVIORAL"],
  [/\bBehavioural\b/g, "Behavioral"],
  [/\bbehavioural\b/g, "behavioral"],
];

const correct = (s) =>
  FOUNDER_DECIDED_CORRECTIONS.reduce((acc, [re, to]) => acc.replace(re, to), s);

const sql = (s) =>
  s === null || s === undefined ? "NULL" : `$lit$${correct(s)}$lit$`;

const out = [];
out.push(`-- =====================================================================
-- T3A-D1-EXEC-001 Section 5 — content load
--
-- GENERATED from the issued Execution Edition by
-- scripts/extract-d1-content.mjs. Every value below is parsed from that
-- document. Nothing is authored, inferred or defaulted here.
--
-- Section 5.18: every source loads with NO source_version_hash and NO
-- REC-07 approval. The registry admits them as content and refuses to
-- serve any of them into a real run until those records exist. That
-- refusal is the control. A source that served today would mean a
-- control had failed.
-- =====================================================================
`);

// ── 5.7 Layer 1 statement library ───────────────────────────────────
const stmtBlock = sectionRange(/^### 5\.7 Layer 1 statement library/, /^### 5\.8 /);
const stmtRows = parseTable(stmtBlock).filter((r) => /^ST-D1-/.test(r[0]));
out.push(`-- ── 5.7 Layer 1 statement library — ${stmtRows.length} statements ──`);
out.push(`DO $stmtlib$
DECLARE v_obj uuid; v_ver uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.t3a_d1_statement_library
             WHERE dimension_id = 'D1' AND question_set_version = 'v1') THEN
    RAISE NOTICE 'D1 statement library already loaded; nothing to do';
    RETURN;
  END IF;

  INSERT INTO public.t3a_content_object
    (identifier, family, title, dimension_id, current_operational_state)
  VALUES ('T3A-D1-STMT-L1', 'statement_library'::t3a_content_family,
          'D1 Layer 1 statement library', 'D1', 'not_loaded'::t3a_operational_state)
  ON CONFLICT (family, identifier) DO UPDATE SET updated_at = now()
  RETURNING content_object_id INTO v_obj;

  INSERT INTO public.t3a_d1_content_version
    (content_object_id, version_no, approval_status, operational_state, body)
  VALUES (v_obj, 'v1', 'drafting'::t3a_approval_status,
          'not_loaded'::t3a_operational_state,
          jsonb_build_object('register', 'T3A-D1-EXEC-001 section 5.7'))
  RETURNING content_version_id INTO v_ver;

  INSERT INTO public.t3a_d1_statement_library
    (statement_library_id, content_version_id, dimension_id, question_set_version,
     stage_code, statement_key, statement_body, bound_variables,
     bound_condition_renderings, retired)
  VALUES`);
const stmtValues = stmtRows.map((r) => {
  const [key, qa, body] = r;
  const bound = [...body.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]);
  const boundArr = bound.length
    ? `ARRAY[${bound.map((b) => `'${b}'`).join(",")}]::text[]`
    : `ARRAY[]::text[]`;
  return `    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, ${sql(key)}, ${sql(body)}, ${boundArr},
     ${sql(JSON.stringify({ question_and_answer: qa }))}::jsonb, false)`;
});
out.push(stmtValues.join(",\n") + "\n  ON CONFLICT DO NOTHING;\nEND;\n$stmtlib$;\n");

// ── 5.17 Controlled language template register ──────────────────────
const tplBlock = sectionRange(/^### 5\.17 Controlled language template register/, /^### 5\.18 /);
const tplRows = parseTable(tplBlock).filter((r) => /^`[A-Z0-9-]+`$/.test(r[0]));
out.push(`-- ── 5.17 Controlled language templates — ${tplRows.length} templates ──`);
out.push(`INSERT INTO public.t3a_d1_language_template
  (language_template_id, dimension_id, template_body, bound_variables,
   eligible_states, precedence, retired)
VALUES`);
// Section 5.6 binds exactly four templates to an evidence state through
// the report frames. The rest are condition templates and the document
// states no evidence-state binding for them, so none is invented — they
// load with an empty eligible_states array.
const FRAME_BINDING = {
  "L-D1-ONE-001": ["single_event"],
  "L-D1-MC-001": ["multi_context"],
  "L-D1-REC-001": ["multi_context"],
  "D1-SCOPE-001": ["insufficient"],
  "UNREP-001": ["insufficient"],
};
const tplValues = tplRows.map((r, i) => {
  const id = r[0].replace(/`/g, "");
  const body = r[2];
  const bound = [...body.matchAll(/\{([a-z_0-9]+)\}/g)].map((m) => m[1]);
  const boundArr = bound.length
    ? `ARRAY[${bound.map((b) => `'${b}'`).join(",")}]::text[]`
    : `ARRAY[]::text[]`;
  const states = FRAME_BINDING[id] ?? [];
  const statesArr = states.length
    ? `ARRAY[${states.map((v) => `'${v}'`).join(",")}]::t3a_d1_evidence_state[]`
    : `ARRAY[]::t3a_d1_evidence_state[]`;
  return `  (${sql(id)}, 'D1', ${sql(body)}, ${boundArr},
   ${statesArr}, ${i + 1}, false)`;
});
out.push(tplValues.join(",\n") + "\nON CONFLICT (language_template_id) DO NOTHING;\n");

// Sections 5.2, 5.3 and 5.4 load into tables created by
// 20260927000000_t3a_d1_capture_and_branching.sql, which sorts AFTER the
// content load. Emitting them into the same file put inserts ahead of
// the CREATE TABLE that makes them possible, and since a migration is one
// transaction, that failure took the forty sources down with it. They are
// written to a second file that sorts after the DDL. The sentinels below
// mark the split; they never reach either output.
out.push(CAPTURE_BEGIN);

// ── 5.2 Question object register ────────────────────────────────────
const qBlock = sectionRange(/^### 5\.2 Question object register/, /^### 5\.3 /);
const qRows = parseTable(qBlock).filter((r) => /^Q-D1-/.test(r[0]));
out.push(`-- ── 5.2 Question object register — ${qRows.length} question objects ──`);
out.push(`INSERT INTO public.t3a_d1_question_object
  (question_code, conduct_element, answer_type, applicability, missing_state_eligible, display_order)
VALUES`);
out.push(
  qRows
    .map((r, i) => {
      const [code, element, answerType, applicability, missingRaw] = r;
      const missing = /^Yes/i.test(missingRaw);
      return `  (${sql(code)}, ${sql(element)}, ${sql(answerType)}, ${sql(applicability)}, ${missing}, ${i + 1})`;
    })
    .join(",\n") + "\nON CONFLICT (question_code) DO NOTHING;\n"
);

// ── 5.3 Response capture catalogue — the thirteen sets ──────────────
const cBlock = sectionRange(/^### 5\.3 Response capture catalogue/, /^### 5\.4 /);
const sets = [];
let current = null;
for (const raw of cBlock) {
  const head = raw.match(/^\*\*(C[0-9a-z]+)\s+—\s+(.+?)\*\*(.*)$/);
  if (head) {
    current = {
      code: head[1],
      title: head[2].trim(),
      note: head[3].replace(/\*/g, "").replace(/^\s*\(?/, "").replace(/\)?\s*$/, "").trim(),
      lines: [],
    };
    sets.push(current);
    continue;
  }
  if (!current) continue;
  if (/^### /.test(raw)) { current = null; continue; }
  const item = raw.match(/^- (.+)$/);
  if (item) {
    current.lines.push(item[1].trim());
    continue;
  }
  // A wrapped continuation: of the heading's applicability note while no
  // line has been read yet, otherwise of the previous capture line.
  if (/^\s{2,}\S/.test(raw) || (raw.trim() !== "" && !/^\*\*/.test(raw) && current.lines.length === 0 && current.note)) {
    if (current.lines.length) {
      current.lines[current.lines.length - 1] += " " + raw.trim();
    } else {
      current.note = (current.note + " " + raw.trim()).trim();
    }
  }
}
const cleanLine = (t) =>
  t.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
const cleanNote = (t) =>
  cleanLine(t).replace(/\*/g, "").replace(/^\(+/, "").replace(/[)\s]+$/, "").trim();

out.push(`-- ── 5.3 Response capture catalogue — ${sets.length} sets ──`);
out.push(`-- Each line states exactly which combination it covers. No line is a
-- superset of another and no two can be true at once. The set carries no
-- expected response, no strong answer and nothing indicating which line
-- is the better one.
INSERT INTO public.t3a_d1_capture_set (capture_set_code, title, applicability_note, display_order)
VALUES`);
out.push(
  sets
    .map((st, i) => `  (${sql(st.code)}, ${sql(cleanLine(st.title))}, ${sql(st.note ? cleanNote(st.note) : null)}, ${i + 1})`)
    .join(",\n") + "\nON CONFLICT (capture_set_code) DO NOTHING;\n"
);

const captureLines = [];
sets.forEach((st) => {
  st.lines.forEach((ln, j) => {
    captureLines.push(`  (${sql(st.code)}, ${sql(cleanLine(ln))}, ${j + 1})`);
  });
});
out.push(`INSERT INTO public.t3a_d1_capture_line (capture_set_code, line_text, line_order)
VALUES`);
out.push(captureLines.join(",\n") + "\nON CONFLICT (capture_set_code, line_order) DO NOTHING;\n");

// ── 5.4 Branch rules ────────────────────────────────────────────────
const bBlock = sectionRange(/^### 5\.4 Branch rules/, /^### 5\.5 /);
const bRows = parseTable(bBlock).filter((r) => /^BR-\d/.test(r[0]));
out.push(`-- ── 5.4 Branch rules — ${bRows.length} rules ──`);
out.push(`-- A question not served under any of these rules produces no answer and
-- no missing state. It is absent because it never applied, and the
-- composed statement must not reference it.
INSERT INTO public.t3a_d1_branch_rule (rule_code, rule_condition, rule_effect, rule_order)
VALUES`);
out.push(
  bRows
    .map((r, i) => `  (${sql(r[0])}, ${sql(cleanLine(r[1]))}, ${sql(cleanLine(r[2]))}, ${i + 1})`)
    .join(",\n") + "\nON CONFLICT (rule_code) DO NOTHING;\n"
);

out.push(CAPTURE_END);

// ── 5.18 The forty production sources ───────────────────────────────
const libStart = lines.findIndex((l) => /^### 5\.18 The D1 source library/.test(l));
const libEnd = lines.findIndex((l, i) => i > libStart && /^## 6\. REPORT CONTRACT/.test(l));

/**
 * CS-I-17 — read the source-sheet bullets as logical units.
 *
 * A bullet begins at "- `field_name` — " and continues through every
 * following line indented by two or more spaces. Continuations join with
 * a single space and the leading indent collapses.
 */
function parseLogicalBullets(bodyLines, blockBreak = false) {
  const out = [];
  let cur = null;
  let seenAny = false;
  const flush = () => {
    if (cur) out.push({ field: cur.field, value: cur.parts.join(" ").replace(/\s+/g, " ").trim() });
    cur = null;
  };
  for (const line of bodyLines) {
    const m = /^- `([a-z0-9_]+)`\s*—\s*(.*)$/.exec(line);
    if (m) {
      flush();
      cur = { field: m[1], parts: [m[2]] };
      seenAny = true;
      continue;
    }
    if (cur && /^\s{2,}\S/.test(line)) {
      cur.parts.push(line.trim());
      continue;
    }
    if (cur && line.trim() === "") continue;
    flush();
    // A SOURCE SHEET is the first contiguous run of bullets under its
    // heading. The library carries unheaded prose BETWEEN sources — a
    // definitional bullet at line 3025 reads "`attribution_support_set` —
    // Stated per source. Where empty, any attribution ... maps to no item"
    // and sits inside SRC-D1-S1-010's line range because no heading
    // separates them. It is longer than that source's real AS1/AS2 entry,
    // so a "fullest value wins" rule picks the definition over the data.
    //
    // Stopping at the end of the first block is what makes the sheet the
    // sheet. Without it the assertion below fires on a value that was
    // never the source's to begin with.
    if (blockBreak && seenAny && line.trim() !== "") {
      out.push(BLOCK_BREAK);
      seenAny = false;
    }
  }
  flush();
  return out;
}


/** Marks the end of a contiguous bullet run. */
const BLOCK_BREAK = { field: null, value: null };

/**
 * The source sheet is ONE contiguous run of bullets, and a source's line
 * range holds several runs: narrative lists before it, and — because the
 * library carries unheaded prose between sources — a definitional run
 * after it whose entries describe what each field MEANS rather than what
 * this source states.
 *
 * Neither position nor length identifies the right one. The definitional
 * run at line 3025 is longer than SRC-D1-S1-010's real AS1/AS2 entry, and
 * SRC-D1-S2-001 carries an unrelated run before its sheet.
 *
 * What identifies it is that the sheet is the run carrying the most
 * distinct source-sheet field names. That is mechanical, needs no
 * knowledge of what any source says, and is what the sheet IS.
 */
function sourceSheetBullets(bodyLines) {
  const blocks = [];
  let cur = [];
  for (const rec of parseLogicalBullets(bodyLines, true)) {
    if (rec === BLOCK_BREAK) {
      if (cur.length) blocks.push(cur);
      cur = [];
      continue;
    }
    cur.push(rec);
  }
  if (cur.length) blocks.push(cur);
  if (!blocks.length) return [];

  const score = (b) =>
    new Set(b.map((r) => r.field).filter((f) => SHEET_FIELDS.has(f))).size;
  return blocks.reduce((a, b) => (score(b) > score(a) ? b : a));
}

const SHEET_FIELDS = new Set([
  "relevant_conduct", "workplace_demand", "stated_standard",
  "stated_standard_source_quote_or_location", "enquiry_point",
  "information_made_available", "material_items", "information_withheld",
  "assertion_reference_set", "attribution_support_set", "account_test_point",
  "post_test_account_opportunity", "available_routes",
  "other_route_classification", "accountable_actor_available",
  "time_reference_called_for", "bearing_interest", "cross_context_map",
  "route_observation_basis",
]);

/**
 * CS-I-21 and CS-I-22 — recover a field boundary the source-to-markdown
 * conversion dropped.
 *
 * Several values run straight into the NEXT field with no separator, as
 * in "...raise it with the meeting chair.other_route_classificationPermitted
 * where the participant states the means aloud." The text after the token
 * is that named field's value, not part of the item before it, so it is
 * captured rather than discarded.
 */
const FIELD_TOKENS = [
  "other_route_classification",
  "accountable_actor_available",
  "time_reference_called_for",
  "enquiry_point",
  "account_test_point",
  "bearing_interest",
  "information_withheld",
  "assertion_reference_set",
  "attribution_support_set",
  "material_items",
  "available_routes",
];

const RECOVERED_BOUNDARIES = [];

function recoverRunTogetherFields(field, value, sourceId) {
  const pairs = [];
  let curField = field;
  let rest = value;

  for (;;) {
    let hitAt = -1;
    let hitToken = null;
    for (const token of FIELD_TOKENS) {
      if (token === curField) continue;
      const at = rest.indexOf(token);
      // Only a token with no separator before it is a dropped boundary.
      // A token preceded by a backtick or a space is the field being
      // named in prose, which is not a boundary.
      if (at > 0 && !/[\s`(\[]/.test(rest[at - 1]) && (hitAt === -1 || at < hitAt)) {
        hitAt = at;
        hitToken = token;
      }
    }
    if (hitAt === -1) break;

    pairs.push([curField, rest.slice(0, hitAt).trim()]);
    // CS-I-23: reported, not suppressed.
    RECOVERED_BOUNDARIES.push(`${sourceId}: ${curField} ran into ${hitToken}`);
    curField = hitToken;
    rest = rest.slice(hitAt + hitToken.length).trim();
  }

  pairs.push([curField, rest.trim()]);
  return pairs;
}

/**
 * CS-I-19 and CS-I-20 — load-time assertions on the bound families.
 *
 * A truncated item must never reach a participant as an approved answer,
 * so a value that ends mid-sentence fails the load rather than loading
 * short. The count rule reads the highest item label the value itself
 * carries, so it asserts against the source rather than against a number
 * written here.
 */
const BOUND_FAMILIES = [
  "material_items",
  "assertion_reference_set",
  "attribution_support_set",
  "available_routes",
];

function assertBoundFamily(sourceId, field, value) {
  const problems = [];
  if (!BOUND_FAMILIES.includes(field)) return problems;
  if (!value) return problems;
  // CS-I-24: "Empty." at the START is an empty family, whatever follows.
  if (/^empty\.?\b/i.test(value.trim())) return problems;

  // CS-I-19.
  if (!/[.!?\]]$/.test(value.trim())) {
    problems.push(`${sourceId} ${field}: ends without terminal punctuation — "${value.slice(-48)}"`);
  }

  // CS-I-20. M1..Mn, A1..An, AS1..ASn and R-a..R-z.
  const numeric = [...value.matchAll(/\b(?:AS|M|A)(\d+)\b/g)].map((m) => Number(m[1]));
  const alpha = [...value.matchAll(/\bR-([a-z])\b/g)].map((m) => m[1].charCodeAt(0) - 96);
  const labels = numeric.length ? numeric : alpha;
  if (labels.length) {
    const highest = Math.max(...labels);
    const distinct = new Set(labels).size;
    if (distinct < highest) {
      problems.push(`${sourceId} ${field}: highest label is ${highest} but only ${distinct} items parsed`);
    }
  }
  return problems;
}

const LOAD_PROBLEMS = [];

const lib = lines.slice(libStart, libEnd === -1 ? lines.length : libEnd);

const heads = [];
lib.forEach((l, i) => {
  const m = l.match(/^#### (SRC-D1-S(\d)-(\d+))\s+—\s+(.+)$/);
  if (m) heads.push({ i, id: m[1], stage: `S${m[2]}`, title: m[4].trim() });
});

out.push(`-- ── 5.18 The D1 source library — ${heads.length} sources ──`);
out.push(`-- Loaded verbatim as content. Applicability is read from each source
-- sheet in the body, never inferred from the Stage.

DO $load$
DECLARE
  v_object  uuid;
  v_version uuid;
  v_source  uuid;
  v_sv      uuid;
BEGIN`);

heads.forEach((h, n) => {
  const end = n + 1 < heads.length ? heads[n + 1].i : lib.length;
  let body = lib.slice(h.i, end).join("\n").trim();
  body = body.replace(/\n---\s*$/, "").trim();

  // Parse the source-sheet bullet fields so applicability is readable as
  // data. Read applicability from the source sheet, never from the prose
  // and never from the Stage.
  const sheet = {};
  const occurrences = {};
  // CS-I-17. A field is a LOGICAL BULLET, not a physical line. The source
  // library is soft-wrapped at about 95 characters, and a value continues
  // on every following line indented by two or more spaces until the next
  // bullet, heading or rule.
  //
  // The regex this replaces looked as though it already did that — it used
  // [\s\S]*? with a lookahead for the next bullet — but it carried the /m
  // flag, under which the `$` alternative in that lookahead matches the end
  // of every LINE. So it stopped at the first wrap, and
  // "M3 the error is the" was the end of a physical line rather than the
  // end of a list. The issued file was never truncated.
  for (const rec of sourceSheetBullets(body.split("\n"))) {
    for (const [field, value] of recoverRunTogetherFields(rec.field, rec.value, h.id)) {
      (occurrences[field] ??= []).push(value);
    }
  }

  // A source states some of these fields more than once: as its own
  // sheet entry, inside a later question-applicability table whose rows
  // read "Q-D1-03aDirect...", and sometimes as a fragment of a sentence
  // that merely mentions the field name.
  //
  // Position does not decide which is real. Taking the last match — the
  // original load — corrupted two sources; taking the first corrupted
  // twenty-five, because the regions are not in a consistent order
  // across the forty. Measured against the item shapes the sources
  // themselves use (M1, A1, AS1, R-a), last-match recovered 38/38/39/38
  // of forty and first-match 15/15/21/11.
  //
  // So the VALUE decides, on two mechanical rules and no knowledge of
  // what any source says: a question-coded value is never the sheet
  // entry, and between the rest the sheet entry is the fullest. That
  // recovers 40/40/39/39.
  //
  // §1.5 makes material_items and assertion_reference_set the two lists
  // a participant's claim is checked against, so a wrong one is worse
  // than a missing one. The two this rule cannot recover are left as the
  // source states them and refused by the reference card, not guessed.
  for (const [key, values] of Object.entries(occurrences)) {
    const candidates = values.filter((v) => !/^Q-D1-[0-9]/.test(v));
    const pool = candidates.length > 0 ? candidates : values;
    sheet[key] = pool.reduce((a, b) => (b.length > a.length ? b : a));
  }

  for (const [key, value] of Object.entries(sheet)) {
    LOAD_PROBLEMS.push(...assertBoundFamily(h.id, key, value));
  }


  out.push(`
  -- ${h.id} — ${h.title.replace(/'/g, "")}
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = ${sql(h.id)}) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES (${sql(h.id)}, 'source'::t3a_content_family, ${sql(h.title)}, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', ${sql(h.id)},
              'title', ${sql(h.title)},
              'stage_code', ${sql(h.stage)},
              'source_sheet', ${sql(JSON.stringify(sheet))}::jsonb,
              'verbatim', ${sql(body)},
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;`);
});

out.push(`
END;
$load$;
`);

const joined = out.join("\n");
const b = joined.indexOf(CAPTURE_BEGIN);
const e = joined.indexOf(CAPTURE_END);

if (b === -1 || e === -1 || e < b) {
  throw new Error(
    "extract-d1-content: capture-section sentinels missing or out of order. "
    + "Sections 5.2/5.3/5.4 must be written to their own migration, because "
    + "the tables they load into are created by a later one.");
}

const CAPTURE_HEADER = `-- =====================================================================
-- T3A-D1-EXEC-001 Section 5 — capture content load (5.2, 5.3, 5.4)
--
-- GENERATED by scripts/extract-d1-content.mjs from the issued Execution
-- Edition, in the same run that writes the main content load. Split out
-- because the question object register, the response capture catalogue
-- and the branch rules load into tables created by
-- 20260927000000_t3a_d1_capture_and_branching.sql, which sorts after the
-- content load. Keeping them together put the inserts ahead of the DDL.
-- =====================================================================

set search_path = public;
`;

writeFileSync(OUT, joined.slice(0, b) + joined.slice(e + CAPTURE_END.length));
writeFileSync(CAPTURE_OUT,
  CAPTURE_HEADER + joined.slice(b + CAPTURE_BEGIN.length, e) + "\n");
console.log(
  `statements=${stmtRows.length} templates=${tplRows.length} sources=${heads.length}`
);

// CS-I-23: the recovered field boundaries are a quality signal on the
// issued file. They are reported, never suppressed.
if (RECOVERED_BOUNDARIES.length) {
  console.log(`\nfield boundaries recovered (CS-I-21): ${RECOVERED_BOUNDARIES.length}`);
  for (const r of RECOVERED_BOUNDARIES) console.log(`  ${r}`);
}

// CS-I-19 and CS-I-20: a truncated bound family fails the load. It does
// not load short, because a short list is indistinguishable at serve time
// from a complete one and would be offered to a participant as the
// approved answer set.
if (LOAD_PROBLEMS.length) {
  console.error(`\nBOUND_FAMILY_PARSE_FAILURE — ${LOAD_PROBLEMS.length} problem(s):`);
  for (const p of LOAD_PROBLEMS) console.error(`  ${p}`);
  process.exit(1);
}
console.log("bound families: parse assertions clean");
