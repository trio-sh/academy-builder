#!/usr/bin/env node
/**
 * RA-03 — assert the loaded field values match T3A-D1-REC07-REAPP-001
 * Section 2 before any re-approval is written.
 *
 * "Where any field differs, do not write the approval. Leave that source
 * unservable, name the differing field, and log."
 *
 * So this runs BEFORE the approval route and gates it. It is a separate
 * script rather than a step inside the migration because RA-03 is a
 * precondition on a founder signature, and a precondition that only runs
 * as a side effect of the thing it guards is not a precondition.
 *
 * TWO CLASSES OF DIFFERENCE THIS DISTINGUISHES, because treating them
 * alike would either block a correct approval or wave through a wrong one.
 *
 * 1. ELIDED. Six Section 2 values are cut at exactly 430 characters and
 *    end in an ellipsis — cross_context_map on two sources,
 *    information_made_available on two, and one each of available_routes
 *    and administration_timing_protocol. 430 on the nose across six
 *    unrelated fields is a rendering limit, not a statement about
 *    content. These are checked as prefixes and reported as elided, never
 *    silently passed as exact.
 *
 * 2. GENUINELY DIFFERENT. Reported in full, with both values, and the
 *    exit code is non-zero.
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
    if (w.endsWith('...')) {
      const stem = w.slice(0, -3);
      if (g.startsWith(stem)) elided.push(`${r.src}.${field} (pack ${w.length}, live ${g.length})`);
      else differs.push({ f: `${r.src}.${field}`, want: w, got: g, note: 'elided prefix does not match' });
    } else if (w === g) exact += 1;
    else differs.push({ f: `${r.src}.${field}`, want: w, got: g, note: 'value differs' });
  }
}

console.log(`RA-03 · sources ${rows.length} · exact ${exact} · elided ${elided.length} · missing ${missing.length} · differing ${differs.length}`);
for (const e of elided) console.log(`  elided (prefix verified): ${e}`);
for (const m of missing) console.log(`  MISSING FROM LIVE: ${m}`);
for (const d of differs) {
  console.log(`\n  DIFFERS — ${d.f} (${d.note})`);
  console.log(`    pack: ${d.want}`);
  console.log(`    live: ${d.got}`);
}

if (missing.length || differs.length) {
  console.error('\nRA-03 FAILED — no re-approval may be written for an affected source.');
  process.exit(1);
}
console.log('\nRA-03 clean — every Section 2 field matches the loaded value.');
