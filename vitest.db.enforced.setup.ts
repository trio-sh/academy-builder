import pg from "pg";

// Database tests with the required-fields switch on (CR-31). The throwaway database is built with every switch off, as production keeps it; this turns
// enforce_required on for the run and sets the hold time the entry route reads, which must be set before the switch is turned on in production.
// Set T3A_ENFORCE_ALSO=sequence,gate to add the later two switches.
export default async function setup() {
  process.env.T3A_ENFORCED_RUN = "1";
  const url = process.env.T3A_TEST_DB_URL;
  if (!url) throw new Error("T3A_TEST_DB_URL is not set. Build the throwaway database (tools/nonprod-replay/local_pg/build.sh) and point T3A_TEST_DB_URL at it.");
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    await c.query("update public.t3a_deployment_config set stage_entry_hold_ttl = 1800 where singleton");
    await c.query("update public.t3a_capture_config set enforce_required = true, updated_at = now()");
    const also = (process.env.T3A_ENFORCE_ALSO ?? "").split(",");
    if (also.includes("sequence")) await c.query("update public.t3a_capture_config set enforce_sequence = true, updated_at = now()");
    if (also.includes("gate")) await c.query("update public.t3a_consent_config set enforce_gate = true, updated_at = now()");
  } finally { await c.end(); }
}
