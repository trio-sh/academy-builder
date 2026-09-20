#!/usr/bin/env node
// Replay repo migrations into a Supabase project via the Management API.
//
// The database was lost with the old project. This is not restoring a
// backup — there is no backup to restore. It rebuilds the schema and the
// loaded D1 content from the migrations in this repository, which are the
// only surviving record of either.
//
// Usage:
//   SBP=<token> node scripts/replay-migrations.mjs <project-ref> [--from f] [--only f] [--continue]

import { readFileSync, readdirSync, appendFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SBP = process.env.SBP;
const REF = process.argv[2];
if (!SBP || !REF) {
  console.error('usage: SBP=<token> node scripts/replay-migrations.mjs <project-ref> [--from f] [--only f]');
  process.exit(2);
}

const arg = (n) => process.argv.includes(n)
  ? process.argv[process.argv.indexOf(n) + 1] : null;
const argFrom = arg('--from');
const argOnly = arg('--only');
const continueOnError = process.argv.includes('--continue');

const DIR = resolve(fileURLToPath(new URL('../supabase/migrations', import.meta.url)));
const LOG = process.env.REPLAY_LOG || resolve(DIR, '../../replay.log');

// Migrations that were superseded before they ever reached a database.
// Each is a draft that a later file in the same series replaced, and each
// is provably incompatible with the file that actually ran. Skipping them
// reproduces the original database; applying them would not.
const SUPERSEDED = {
  '002_complete_schema.sql':
    'competing draft of the same schema — keys candidate_profiles/mentor_profiles '
    + 'on profile_id, where 002_actual_schema.sql ("this matches the existing '
    + 'database structure") does not. Its CREATE TABLE IF NOT EXISTS no-ops '
    + 'against the tables 002_actual already made and its index on profile_id '
    + 'then fails, which is what it would have done originally too.',
  '20260130_platform_updates.sql':
    'superseded by 20260130_platform_updates_fixed.sql, whose own header says '
    + 'it "creates missing tables first". The unfixed file fails on '
    + 'escrow_transactions not existing — the exact fault the fixed one was '
    + 'written to correct.',
};

// The four migrations that 20260905000000_t3a_d1_repair_and_namespace.sql
// opens by post-mortem: they were applied by a helper that ran statements
// one at a time and swallowed the errors, so each landed PARTIALLY. Its
// enum types are there; its generated-column tables are not, and its
// colliding tables silently kept the spec-002 shape.
//
// Everything after 20260905 is written against that partial outcome — the
// canonical objects carry the t3a_d1_* prefix and call extensions.digest.
// Applying these four whole would land tables the repair then works
// around; refusing them entirely would drop the enum types it needs. So
// they are replayed the way they originally ran: statement by statement,
// failures recorded rather than fatal.
const PARTIAL = new Set([
  '20260901000000_t3a_d1_content_registry.sql',
  '20260902000000_t3a_d1_role_and_progression.sql',
  '20260903000000_t3a_d1_gateway_and_source.sql',
  '20260904000000_t3a_d1_statement_library.sql',
]);

// Split on semicolons that are not inside a string, an identifier, a
// line/block comment or a dollar-quoted body. plpgsql bodies are full of
// semicolons, so a naive split shreds every function in the file.
function splitStatements(sql) {
  const out = [];
  let buf = '', i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (c === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i);
      const end = nl === -1 ? sql.length : nl + 1;
      buf += sql.slice(i, end); i = end; continue;
    }
    if (c === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      const stop = end === -1 ? sql.length : end + 2;
      buf += sql.slice(i, stop); i = stop; continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === c) { if (sql[j + 1] === c) { j += 2; continue; } break; }
        j++;
      }
      buf += sql.slice(i, j + 1); i = j + 1; continue;
    }
    if (c === '$') {
      const m = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(sql.slice(i));
      if (m) {
        const tag = m[0];
        const end = sql.indexOf(tag, i + tag.length);
        const stop = end === -1 ? sql.length : end + tag.length;
        buf += sql.slice(i, stop); i = stop; continue;
      }
    }
    if (c === ';') { out.push(buf); buf = ''; i++; continue; }
    buf += c; i++;
  }
  if (buf.trim()) out.push(buf);
  return out.map(s => s.trim()).filter(s => s && !/^(--|\/\*)/.test(s.replace(/\s/g, '').slice(0, 2)) ? true : s.replace(/--[^\n]*\n?/g, '').trim().length > 0);
}

let files = readdirSync(DIR).filter(f => f.endsWith('.sql')).sort();
if (argOnly) files = files.filter(f => f === argOnly);
if (argFrom) {
  const i = files.indexOf(argFrom);
  if (i < 0) { console.error('no such migration: ' + argFrom); process.exit(2); }
  files = files.slice(i);
}

async function run(sql) {
  for (let attempt = 0; ; attempt++) {
    let res, text;
    try {
      res = await fetch(
        `https://api.supabase.com/v1/projects/${REF}/database/query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SBP}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: sql }),
        });
      text = await res.text();
    } catch (e) {
      if (attempt >= 3) return { ok: false, status: 0, text: String(e) };
      await new Promise(r => setTimeout(r, 2000 * (2 ** attempt)));
      continue;
    }
    // 429 is the Management API throttling the statement-level replay,
    // not a fault in the SQL. Back off and try the same statement again.
    if (!res.ok && (res.status === 429 || res.status >= 500) && attempt < 6) {
      await new Promise(r => setTimeout(r, 3000 * (2 ** Math.min(attempt, 4))));
      continue;
    }
    return { ok: res.ok, status: res.status, text };
  }
}

// The endpoint runs a request as one transaction, and PostgreSQL refuses
// to use an enum value added in the transaction that added it. The
// original tooling applied these as separate statements; committing the
// ALTER TYPEs first reproduces that, and does not change what the
// migration means.
const ADD_VALUE = /^\s*ALTER\s+TYPE\s+.*ADD\s+VALUE\b.*;\s*$/gim;

async function applyFile(f) {
  const raw = readFileSync(join(DIR, f), 'utf8');
  if (!raw.trim()) return { ok: true, status: 200, text: 'empty' };

  const adds = raw.match(ADD_VALUE) || [];
  for (const stmt of adds) {
    const r = await run(stmt.trim());
    if (!r.ok) return r;
  }
  const body = adds.length ? raw.replace(ADD_VALUE, '') : raw;

  if (PARTIAL.has(f)) {
    const stmts = splitStatements(body);
    let ok = 0, bad = 0;
    for (const s of stmts) {
      await new Promise(r => setTimeout(r, 250));
      const r = await run(s);
      if (r.ok) ok++;
      else {
        bad++;
        appendFileSync(LOG,
          `     partial-fail ${f} :: ${s.slice(0, 90).replace(/\s+/g, ' ')} :: `
          + `${r.text.slice(0, 160).replace(/\s+/g, ' ')}\n`);
      }
    }
    return { ok: true, status: 200, text: `partial ${ok} ok / ${bad} failed`,
             partial: { ok, bad } };
  }

  // extensions is where Supabase installs pgcrypto, and the migrations
  // call digest()/gen_random_bytes() unqualified.
  return run(`SET search_path = public, extensions;\n${body}`);
}

let applied = 0, failed = 0, skipped = 0;
for (const f of files) {
  if (SUPERSEDED[f]) {
    skipped++;
    console.log(`SKIP ${f}`);
    appendFileSync(LOG, `SKIP ${f} :: ${SUPERSEDED[f]}\n`);
    continue;
  }
  process.stdout.write(`... ${f} `);
  const r = await applyFile(f);
  if (r.ok) {
    applied++;
    console.log(r.partial ? `PARTIAL (${r.partial.ok} ok, ${r.partial.bad} failed)` : 'OK');
    appendFileSync(LOG, `${r.partial ? 'PART' : 'OK  '} ${f} ${r.partial ? r.text : ''}\n`);
  } else {
    failed++;
    console.log(`FAIL (${r.status})`);
    console.log(r.text.slice(0, 2000));
    appendFileSync(LOG, `FAIL ${f} ${r.status} ${r.text.slice(0, 600)}\n`);
    if (!continueOnError) break;
  }
}

console.log(`\napplied=${applied} skipped=${skipped} failed=${failed}`);
process.exit(failed ? 1 : 0);
