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
    if (also.includes("gate")) {
      await c.query("update public.t3a_consent_config set enforce_gate = true, updated_at = now()");
      // With the consent gate on, Stage entry and capture need the participant's own consent for the dimension. Every fixture account the tests make
      // (their own helpers and the older scripts alike) is given it on all nine dimensions the moment its profile row is made, as a real participant
      // gives it before taking part. A test that needs an account without consent sets t3a.no_autoconsent for its own transaction. Throwaway database only.
      await c.query(`create or replace function public.t3a_test_autoconsent() returns trigger language plpgsql security definer set search_path = public as $$
        declare d text; t text;
        begin
          if coalesce(current_setting('t3a.no_autoconsent', true), '') = 'on' then return new; end if;
          perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
          foreach d in array array['D1','D2','D3','D4','D5','D6','D7','D8','D9'] loop
            foreach t in array array['scenario_logging','mentor_observation'] loop
              perform public.t3a_record_consent(new.id, t, 'granted', d, null, '1.0', repeat('d', 64), 'checkbox', 'en-CA', 'observation');
            end loop;
          end loop;
          return new;
        end $$`);
      await c.query("drop trigger if exists t3a_zz_test_autoconsent on public.profiles");
      await c.query("create trigger t3a_zz_test_autoconsent after insert on public.profiles for each row execute function public.t3a_test_autoconsent()");
    }
  } finally { await c.end(); }
}
