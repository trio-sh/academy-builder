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
    expect(r).toEqual({ cw: "off", im: "legacy_tolerant", er: false, es: false, eg: false, lsa: false });
  });
});
