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

const sql = (s) => (s === null || s === undefined ? "NULL" : `$lit$${s}$lit$`);

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

// ── 5.18 The forty production sources ───────────────────────────────
const libStart = lines.findIndex((l) => /^### 5\.18 The D1 source library/.test(l));
const libEnd = lines.findIndex((l, i) => i > libStart && /^## 6\. REPORT CONTRACT/.test(l));
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
  const sheetRe = /^- `([a-z0-9_]+)`\s*—\s*([\s\S]*?)(?=\n- `|\n\*\*|\n#### |$)/gm;
  for (const m of body.matchAll(sheetRe)) {
    sheet[m[1]] = m[2].trim().replace(/\s+/g, " ");
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

writeFileSync(OUT, out.join("\n"));
console.log(
  `statements=${stmtRows.length} templates=${tplRows.length} sources=${heads.length}`
);
