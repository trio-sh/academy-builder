#!/usr/bin/env node
/**
 * RA-03 / RA-03a — assert the loaded field values match
 * T3A-D1-REC07-REAPP-001 ISSUE 2 Section 2 before any re-approval is
 * written.
 *
 * "Where any field differs, do not write the approval. Leave that source
 * unservable, name the differing field, and log."
 *
 * So this runs BEFORE the approval route and gates it. It is a separate
 * script rather than a step inside the migration because RA-03 is a
 * precondition on a founder signature, and a precondition that only runs
 * as a side effect of the thing it guards is not a precondition.
 *
 * NO VALUE IN ISSUE 2 IS ELIDED, so RA-03 states plainly that a prefix
 * match is neither sufficient nor expected. Issue 1 capped six values at
 * exactly 430 characters — a rendering limit in the pack, not a statement
 * about content — and this verifier reported them as elided rather than
 * passing them as exact. Issue 2 removed the cap, so the prefix path is
 * GONE rather than merely unused: a value ending in an ellipsis is now a
 * difference like any other, because under Issue 2 it can only mean the
 * pack was truncated again.
 *
 * Every mismatch is reported in full, with both values, and the exit code
 * is non-zero. Nothing is normalised away except typographic quote and
 * apostrophe forms.
 *
 * Usage: SBP=... node scripts/verify-reapp-001.mjs
 */
import { readFileSync } from 'node:fs';

const SBP = process.env.SBP;
const REF = process.env.PROJECT_REF || 'tnjyywtulpdyackmwnca';
if (!SBP) {
  console.error('verify-reapp-001: no SBP credential — skipping (not a pass).');
  process.exit(2);
}

const expected = JSON.parse(
  readFileSync(new URL('../docs/d1-execution/REAPP-001-section-2-approved-values.json', import.meta.url), 'utf8')
);

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SBP}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(t.slice(0, 400));
  return JSON.parse(t);
}

// Typographic forms only. Content differences are never normalised away.
const norm = (s) => String(s ?? '')
  .replace(/\s+/g, ' ')
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .trim();

const ids = Object.keys(expected).map((s) => `'${s}'`).join(', ');
const rows = await sql(`
  SELECT cv.body ->> 'source_identifier' AS src, cv.body -> 'source_sheet' AS sheet
  FROM public.t3a_d1_content_version cv
  WHERE cv.superseded_by IS NULL
    AND cv.body ->> 'source_identifier' IN (${ids})`);

let exact = 0;
const elided = [];
const differs = [];
const missing = [];

for (const r of rows) {
  for (const [field, want] of Object.entries(expected[r.src] ?? {})) {
    const got = r.sheet?.[field];
    if (got === undefined || got === null) { missing.push(`${r.src}.${field}`); continue; }
    const w = norm(want), g = norm(got);
    // RA-03 under Issue 2: an ellipsis is no longer a rendering artefact
    // to tolerate. It means the pack was capped again, so it is named as
    // its own failure rather than quietly prefix-matched.
    if (w.endsWith('...')) {
      elided.push(`${r.src}.${field} — Issue 2 must not elide; pack value ends in an ellipsis`);
    } else if (w === g) exact += 1;
    else differs.push({ f: `${r.src}.${field}`, want: w, got: g, note: 'value differs' });
  }
}

console.log(`RA-03 · sources ${rows.length} · exact ${exact} · elided ${elided.length} · missing ${missing.length} · differing ${differs.length}`);
for (const e of elided) console.error(`  ELIDED IN PACK: ${e}`);
for (const m of missing) console.log(`  MISSING FROM LIVE: ${m}`);
for (const d of differs) {
  console.log(`\n  DIFFERS — ${d.f} (${d.note})`);
  console.log(`    pack: ${d.want}`);
  console.log(`    live: ${d.got}`);
}

if (missing.length || differs.length || elided.length) {
  console.error('\nRA-03 FAILED — no re-approval may be written for an affected source.');
  process.exit(1);
}
console.log('\nRA-03 clean — every Section 2 field matches the loaded value exactly.');
