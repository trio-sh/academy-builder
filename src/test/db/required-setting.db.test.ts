import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { connect, RUN, run } from "./helpers";

let c: pg.Client;
beforeAll(async () => { c = await connect(); });
afterAll(async () => { await c.end(); });

const SET = "00000000-0000-0000-0000-000000000000";
const put = (key: string, value: string) => run(c, `insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('${key}','${value}','1.0','${SET}')`);
const read = async (key: string) => { try { return { v: (await run(c, `select t3a_required_setting('${key}') v`))[0].v as string }; } catch (e: any) { return { err: e.message as string }; } };

describe("t3a_required_setting: a blank value is unset", () => {
  const key = "probe_setting_" + RUN;
  it("a key with no row refuses CONFIGURATION_UNSET", async () => {
    expect((await read(key)).err).toMatch(/CONFIGURATION_UNSET/);
  });
  it("a value is returned as set", async () => {
    await put(key, "900");
    expect((await read(key)).v).toBe("900");
  });
  it("blanking it again makes it unset: it refuses and does not return the blank text", async () => {
    await put(key, "");
    const r = await read(key);
    expect(r.err).toMatch(/CONFIGURATION_UNSET/);
    expect(r.v).toBeUndefined();
  });
  it("a blank row falls back to the deployment configuration column of the same name", async () => {
    await put("stage_entry_hold_ttl", "");
    await run(c, `update t3a_deployment_config set stage_entry_hold_ttl = 777`);
    expect((await read("stage_entry_hold_ttl")).v).toBe("777");
    await run(c, `update t3a_deployment_config set stage_entry_hold_ttl = null`);
  });
});
