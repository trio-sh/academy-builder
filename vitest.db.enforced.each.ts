import { beforeAll } from "vitest";
import pg from "pg";

// Before every test file in the enforced run: the hold time is set, because older scripts clear it to test the unset case and put it back only when they finish.
beforeAll(async () => {
  const c = new pg.Client({ connectionString: process.env.T3A_TEST_DB_URL });
  await c.connect();
  try { await c.query("update public.t3a_deployment_config set stage_entry_hold_ttl = 1800 where singleton and stage_entry_hold_ttl is null"); } finally { await c.end(); }
});
