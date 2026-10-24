import { afterAll, beforeAll } from "vitest";
import pg from "pg";

// Case review runs (T3A_CASE_DIM): authorizing a mentor on a dimension other than D1 needs a calibration clearance for that dimension that names the
// reference set version (migration t3a_authorization_needs_clearance). The rule tests create their mentors with reference set 1.0, so a test file that
// vitest.db.dim.config.ts swapped onto the dimension under test gets a clearance for it, and loses it again when the file ends so that files written
// for that dimension natively still see none. Throwaway database only; the row says so.
const dim = process.env.T3A_CASE_DIM;
const mark = "SYNTHETIC TEST ONLY case review";
async function withClient(f: (c: pg.Client) => Promise<void>) {
  const c = new pg.Client({ connectionString: process.env.T3A_TEST_DB_URL });
  await c.connect();
  try { await f(c); } finally { await c.end(); }
}
beforeAll(async () => {
  if (!dim || dim === "D1" || !(globalThis as { __T3A_SWAPPED__?: boolean }).__T3A_SWAPPED__) return;
  await withClient(async (c) => {
    await c.query(`insert into public.t3a_calibration_clearance(dimension_id, reference_set_version, construct_version, determination_version, statement_version, source_version_ids)
      select $1, '1.0', $2, $2, $2, array[gen_random_uuid()] where not exists (select 1 from public.t3a_calibration_clearance where dimension_id = $1 and reference_set_version = '1.0')`, [dim, mark]);
  });
});
afterAll(async () => {
  if (!dim || dim === "D1" || !(globalThis as { __T3A_SWAPPED__?: boolean }).__T3A_SWAPPED__) return;
  await withClient(async (c) => {
    // the register is append-only; this fixture row is not a record, so it is removed with the triggers off
    await c.query("begin"); await c.query("set local session_replication_role = replica");
    await c.query(`delete from public.t3a_calibration_clearance where dimension_id = $1 and construct_version = $2`, [dim, mark]);
    await c.query("commit");
  });
});
