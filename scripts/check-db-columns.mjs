#!/usr/bin/env node
/**
 * Does every column this codebase names actually exist?
 *
 * Written after three separate surfaces were found reading columns that
 * are not there. Two failed loudly — "some rows could not be read" on the
 * participant's pathway page — and the third failed SILENTLY: a
 * select("*") followed by row.created_at on a table whose column is
 * assembled_at returns undefined, not an error, so a date simply never
 * rendered and nobody knew.
 *
 * That silence is the reason this exists. TypeScript cannot catch it,
 * because the rows come back as `any` and are cast with `as SomeRow`. The
 * only thing that knows is the database.
 *
 * WHAT IT CHECKS. Every `.from("table")` paired with the columns named in
 * an adjacent `.select(...)`, `.eq(...)`, `.order(...)` or `.insert({...})`.
 * A column the table does not have is reported with the table's actual
 * columns beside it, because the useful next question is always "then
 * what is it called".
 *
 * WHAT IT DOES NOT CHECK. Embedded selects (`profiles!fk(...)`), computed
 * aliases, and anything built by string concatenation. It is a net with
 * known holes, not a proof — a clean run means nothing obvious is wrong.
 *
 * Needs a service-role key to read information_schema, so it is NOT part
 * of `npm run build`. Run it deliberately:
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/check-db-columns.mjs
 *
 * Or against the management API, which is how it was first run:
 *
 *   SBP=<token> PROJECT_REF=<ref> node scripts/check-db-columns.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SRC = join(ROOT, "src");

// ---------------------------------------------------------------------
// 1. Read the schema
// ---------------------------------------------------------------------

async function loadSchema() {
  const sql = `select table_name, column_name from information_schema.columns
               where table_schema = 'public'`;

  let rows;
  if (process.env.SBP && process.env.PROJECT_REF) {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${process.env.PROJECT_REF}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SBP}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      });
    if (!res.ok) throw new Error(`management API: ${res.status} ${await res.text()}`);
    rows = await res.json();
  } else if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    const res = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`,
      {
        method: "POST",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      });
    if (!res.ok) throw new Error(`rest: ${res.status} ${await res.text()}`);
    rows = await res.json();
  } else {
    console.log(
      "⚠ check-db-columns: no credentials (SBP+PROJECT_REF, or "
      + "SUPABASE_URL+SUPABASE_SERVICE_KEY) — skipping (not a pass).");
    process.exit(0);
  }

  const schema = new Map();
  for (const r of rows) {
    if (!schema.has(r.table_name)) schema.set(r.table_name, new Set());
    schema.get(r.table_name).add(r.column_name);
  }
  return schema;
}

// ---------------------------------------------------------------------
// 2. Read what the code asks for
// ---------------------------------------------------------------------

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

// `.from("t")` up to the next `.from(` or the end of the statement. Good
// enough: the chained calls that name columns sit right after it.
const FROM_RE = /\.from\(\s*["'`]([a-z0-9_]+)["'`]\s*\)/g;

function columnsNamedNear(chunk) {
  const cols = new Set();

  for (const m of chunk.matchAll(/\.(?:eq|neq|gt|gte|lt|lte|like|ilike|is|in|order|contains)\(\s*["'`]([a-z0-9_]+)["'`]/g)) {
    cols.add(m[1]);
  }

  for (const m of chunk.matchAll(/\.select\(\s*["'`]([^"'`]*)["'`]/g)) {
    const spec = m[1];
    if (spec.trim() === "*" || spec.includes("(")) continue; // embeds skipped
    for (const part of spec.split(",")) {
      const name = part.trim().split(":").pop().trim();
      if (/^[a-z0-9_]+$/.test(name) && name !== "*") cols.add(name);
    }
  }

  return cols;
}

// ---------------------------------------------------------------------
// 3. Compare
// ---------------------------------------------------------------------

const schema = await loadSchema();
const findings = [];

for (const file of walk(SRC)) {
  const text = readFileSync(file, "utf8");
  const hits = [...text.matchAll(FROM_RE)];

  for (let i = 0; i < hits.length; i++) {
    const table = hits[i][1];
    if (!schema.has(table)) continue; // not ours, or a view we cannot see
    const start = hits[i].index;
    let end = i + 1 < hits.length ? hits[i + 1].index : Math.min(text.length, start + 1200);

    // Stop at the next `.from(` of ANY kind, not just the next literal
    // one. A `.from(tableName)` in a loop does not match FROM_RE, so
    // without this the columns chained onto IT get attributed to this
    // table — which is exactly how the first run of this script reported
    // t3a_stage_entry_event.body, a column belonging to a different
    // table read two lines later.
    const next = text.indexOf(".from(", start + 6);
    if (next !== -1 && next < end) end = next;

    const chunk = text.slice(start, end);

    for (const col of columnsNamedNear(chunk)) {
      if (!schema.get(table).has(col)) {
        const line = text.slice(0, start).split("\n").length;
        findings.push({ file: file.replace(ROOT + "/", ""), line, table, col });
      }
    }
  }
}

if (findings.length === 0) {
  console.log("✓ no missing columns — every column named near a .from() exists.");
  process.exit(0);
}

console.error(`✗ ${findings.length} column${findings.length === 1 ? "" : "s"} named in code that the database does not have:\n`);
for (const f of findings) {
  const actual = [...schema.get(f.table)].sort().join(", ");
  console.error(`  ${f.file}:${f.line}`);
  console.error(`    ${f.table}.${f.col} does not exist`);
  console.error(`    has: ${actual}\n`);
}
process.exit(1);
