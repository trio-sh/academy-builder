#!/usr/bin/env node
/**
 * T3A-DEV-SPEC-002 §6 + AC-03 — WorkRehearsal ↔ Evidence firewall.
 *
 * Static schema attack: given only access to the evidence domain
 * (t3a_* tables that are NOT t3a_rehearsal_* / t3a_coaching_*), can
 * we reconstruct that a participant rehearsed?
 *
 * A pass means: no evidence-domain column, foreign key or index
 * carries a reference — direct or inferable — to the rehearsal
 * domain. A fail means the boundary leaks something the outside
 * engineer could walk across.
 *
 * The attempt + outcome are appended to
 * docs/firewall-reconstruction-attempts/<date>.md per §6 rule 6.
 *
 * Runs against the live schema via exec_claudecode_query so the
 * check reflects deployed reality, not just the migration file
 * that landed most recently. If ANON is missing the check is
 * skipped with a warning (rather than a false pass) — CI must set
 * it for the guarantee to hold.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SB_URL = process.env.SB_URL || "https://ijxnsmponlrdhomaurkg.supabase.co";
const ANON = process.env.ANON || readAnonFromEnvFile();

function readAnonFromEnvFile() {
  const envFile = resolve(ROOT, ".env");
  if (!existsSync(envFile)) return "";
  const txt = readFileSync(envFile, "utf8");
  const m = txt.match(/^VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]?([^'"\n]+)/m);
  return m ? m[1].trim() : "";
}

if (!ANON) {
  console.warn("⚠ check-firewall: ANON key not set — skipping (not a pass).");
  process.exit(0);
}

async function q(sql) {
  const res = await fetch(`${SB_URL}/rest/v1/rpc/exec_claudecode_query`, {
    method: "POST",
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query_text: sql }),
  });
  if (!res.ok) throw new Error(`RPC failed ${res.status}: ${await res.text()}`);
  const raw = await res.text();
  if (!raw || raw.trim() === "" || raw.trim() === "null") return [];
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error(`RPC returned non-JSON: ${raw.slice(0, 200)}`); }
  return Array.isArray(parsed) ? parsed : [];
}

const REHEARSAL_TABLES = new Set([
  "t3a_rehearsal_session",
  "t3a_rehearsal_artifact",
  "t3a_coaching_feedback",
  "t3a_rehearsal_activity_history",
  // t3a_rehearsal_telemetry_aggregate is intentionally EXCLUDED — it
  // is a write-only aggregate sink in the evidence-facing plane by
  // spec (§21.11). It carries no identifiers (a trigger enforces
  // that), so its presence in evidence readers is not a leak.
]);

// Anything that starts with these prefixes in the evidence domain
// would be a red flag: a column or index referring to rehearsal by
// name even if not by FK.
const REHEARSAL_NAMEISH = /(?:^|_)(rehearsal|coaching|bridgefast|practice_session)(?:_|$)/i;

const findings = [];

// ────────────────────────────────────────────────────────────
// Attack 1: any foreign key from an evidence-domain table
// pointing at a rehearsal-domain table?
// ────────────────────────────────────────────────────────────
{
  const rows = await q(`
    SELECT
      tc.table_name       AS src_table,
      kcu.column_name     AS src_column,
      ccu.table_name      AS dst_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = $ft$FOREIGN KEY$ft$
      AND tc.table_schema = $ps$public$ps$
      AND tc.table_name LIKE $ev$t3a_%$ev$
  `);
  for (const r of rows) {
    if (REHEARSAL_TABLES.has(r.src_table)) continue; // rehearsal→rehearsal is fine
    if (REHEARSAL_TABLES.has(r.dst_table)) {
      findings.push({
        rule: "§12.1 #1",
        detail: `${r.src_table}.${r.src_column} → ${r.dst_table} — evidence-domain FK into rehearsal domain`,
      });
    }
  }
}

// ────────────────────────────────────────────────────────────
// Attack 2: any evidence-domain COLUMN whose name would let an
// outside engineer infer rehearsal activity?
// ────────────────────────────────────────────────────────────
{
  const rows = await q(`
    SELECT table_name, column_name, data_type
      FROM information_schema.columns
     WHERE table_schema = $ps$public$ps$
       AND table_name LIKE $ev$t3a_%$ev$
  `);
  for (const r of rows) {
    if (REHEARSAL_TABLES.has(r.table_name)) continue;
    if (REHEARSAL_NAMEISH.test(r.column_name)) {
      // Allow one deliberately-named exception if we ever add it —
      // for example, a boolean explicitly declaring "has_rehearsed"
      // would be a spec violation and this rule should flag it.
      findings.push({
        rule: "§6 rule 3",
        detail: `${r.table_name}.${r.column_name} — evidence-domain column carries a rehearsal-shaped name (${r.data_type}); outside engineer could infer rehearsal activity from its presence alone`,
      });
    }
  }
}

// ────────────────────────────────────────────────────────────
// Attack 3: any evidence-domain INDEX whose columns reference
// rehearsal (indexes can leak schema shape even without SELECT).
// ────────────────────────────────────────────────────────────
{
  const rows = await q(`
    SELECT schemaname, tablename, indexname, indexdef
      FROM pg_indexes
     WHERE schemaname = $ps$public$ps$
       AND tablename LIKE $ev$t3a_%$ev$
  `);
  for (const r of rows) {
    if (REHEARSAL_TABLES.has(r.tablename)) continue;
    if (REHEARSAL_NAMEISH.test(r.indexname) || REHEARSAL_NAMEISH.test(r.indexdef)) {
      findings.push({
        rule: "§6 rule 4",
        detail: `${r.tablename} index ${r.indexname} — indexdef mentions rehearsal domain`,
      });
    }
  }
}

// ────────────────────────────────────────────────────────────
// Attack 4: any view / materialized view joining the two domains?
// ────────────────────────────────────────────────────────────
{
  const rows = await q(`
    SELECT table_name, view_definition
      FROM information_schema.views
     WHERE table_schema = $ps$public$ps$
       AND view_definition ILIKE $reh$%t3a_rehearsal_%$reh$
  `);
  for (const r of rows) {
    findings.push({
      rule: "§6 rule 4",
      detail: `view ${r.table_name} joins the rehearsal domain — every arrow crossing the boundary must be removed or justified in writing`,
    });
  }
}

// ────────────────────────────────────────────────────────────
// Attack 5: rehearsal_telemetry_aggregate carrying a UUID-shaped
// value in any of its user-writable columns?
// ────────────────────────────────────────────────────────────
{
  const rows = await q(`
    SELECT
      count(*) AS n
    FROM t3a_rehearsal_telemetry_aggregate
    WHERE duration_distribution::text ~* $uid$\\y[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\y$uid$
       OR cohort_period ~* $uid2$\\y[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\y$uid2$
  `);
  if (rows[0] && Number(rows[0].n) > 0) {
    findings.push({
      rule: "§21.11",
      detail: `${rows[0].n} rehearsal_telemetry_aggregate row(s) carry a UUID-shaped value`,
    });
  }
}

// ────────────────────────────────────────────────────────────
// Document the attempt per §6 rule 6.
// ────────────────────────────────────────────────────────────
const attemptDir = resolve(ROOT, "docs/firewall-reconstruction-attempts");
mkdirSync(attemptDir, { recursive: true });
const isoDate = new Date().toISOString().slice(0, 10);
const attempt = [
  `# Firewall reconstruction attempt — ${isoDate}`,
  ``,
  `Automated attack executed by \`scripts/check-firewall.mjs\` against the`,
  `live schema at ${SB_URL}.`,
  ``,
  `## Attacks performed`,
  `1. Cross-domain foreign keys: SELECT on \`information_schema\` looking for`,
  `   evidence-domain \`t3a_*\` tables with a FOREIGN KEY pointing to any`,
  `   \`t3a_rehearsal_*\` / \`t3a_coaching_*\` table.`,
  `2. Rehearsal-shaped column names: SELECT on \`information_schema.columns\``,
  `   looking for evidence-domain columns matching`,
  `   \`/(rehearsal|coaching|bridgefast|practice_session)/\`.`,
  `3. Rehearsal-shaped index names / defs: SELECT on \`pg_indexes\` looking`,
  `   for the same pattern.`,
  `4. Cross-domain views: SELECT on \`information_schema.views\` looking for`,
  `   any view whose definition mentions \`t3a_rehearsal_\`.`,
  `5. UUID-shaped values in \`t3a_rehearsal_telemetry_aggregate\`.`,
  ``,
  `## Outcome`,
  ``,
  findings.length === 0
    ? `✅ PASS — the evidence domain contains no cross-boundary reference to the rehearsal domain. Rehearsal activity is not reconstructable from the evidence surface an outside engineer sees.`
    : `❌ FAIL — ${findings.length} finding(s):\n\n` + findings.map(f => `- **${f.rule}** — ${f.detail}`).join("\n"),
  ``,
].join("\n");

writeFileSync(resolve(attemptDir, `${isoDate}.md`), attempt);
console.log(`Attempt logged to docs/firewall-reconstruction-attempts/${isoDate}.md`);

if (findings.length === 0) {
  console.log("✓ firewall clean — no reconstruction path from evidence → rehearsal.");
  process.exit(0);
} else {
  console.error(`✗ firewall: ${findings.length} finding(s):`);
  for (const f of findings) console.error(`  [${f.rule}] ${f.detail}`);
  process.exit(1);
}
