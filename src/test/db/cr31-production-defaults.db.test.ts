/** CORR-007 Rev 1.6 rule CR-31-T2: on a database built from the migrations, with nothing switched on, every enforcement switch and lsa_activation is off. This is the state production keeps until the activation decision. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { connect, run } from "./helpers";

let c: pg.Client;
beforeAll(async () => { c = await connect(); });
afterAll(async () => { await c.end(); });

describe("CR-31 switch defaults", () => {
  it("every switch reads off and lsa_activation reads off", async () => {
    const r = (await run(c, `select (select value from public.t3a_event_config where key='canonical_writers') cw, (select value from public.t3a_event_config where key='ingest_mode') im,
      (select enforce_required from public.t3a_capture_config) er, (select enforce_sequence from public.t3a_capture_config) es, (select enforce_gate from public.t3a_consent_config) eg, public.t3a_lsa_flag('lsa_activation') lsa`))[0];
    // the enforced run (npm run test:db:enforced) turns the required-fields switch on for itself, and the later two when T3A_ENFORCE_ALSO names them; the others are off in it
    const also = (process.env.T3A_ENFORCE_ALSO ?? "").split(",");
    // the switch rehearsal (tools/day1/switch_rehearsal.py) turns the two event switches on in the database before the suite and names them in T3A_REHEARSAL_ON
    const rehearsed = (process.env.T3A_REHEARSAL_ON ?? "").split(",");
    expect(r).toEqual({ cw: rehearsed.includes("canonical_writers") ? "on" : "off", im: rehearsed.includes("strict_event_ingest") ? "strict" : "legacy_tolerant", er: process.env.T3A_ENFORCED_RUN === "1", es: also.includes("sequence"), eg: also.includes("gate"), lsa: false });
  });
});
