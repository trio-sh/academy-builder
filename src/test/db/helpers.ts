import pg from "pg";
import { randomUUID } from "node:crypto";

const URL = process.env.T3A_TEST_DB_URL;

/** A test that needs the database fails loudly when it is not configured: skipping would hide a missing gate. */
export function dbUrl(): string {
  if (!URL) throw new Error("T3A_TEST_DB_URL is not set. Build the throwaway database (tools/nonprod-replay/local_pg/build.sh) and point T3A_TEST_DB_URL at it.");
  return URL;
}

export async function connect(): Promise<pg.Client> {
  const c = new pg.Client({ connectionString: dbUrl() });
  await c.connect();
  await c.query("set search_path to public, extensions");
  return c;
}

export const RUN = randomUUID().slice(0, 8);

/** Run one statement as a role inside its own transaction (committed on success, rolled back if it raises). */
export async function asRole(c: pg.Client, role: string, sub: string | null, sql: string) {
  await c.query("begin");
  let msg = "ok";
  let rows: any[] = [];
  try {
    await c.query(`set local role ${role}`);
    await c.query(`select set_config('request.jwt.claims', '${JSON.stringify(sub ? { role, sub } : { role })}', true)`);
    await c.query(`select set_config('request.jwt.claim.sub', '${sub ?? ""}', true)`);
    rows = (await c.query(sql)).rows;
  } catch (e: any) {
    msg = e.message;
  }
  await c.query(msg === "ok" ? "commit" : "rollback");
  return { msg, rows, r: rows[0]?.r };
}
export const asService = (c: pg.Client, sql: string) => asRole(c, "service_role", null, sql);

export async function run(c: pg.Client, sql: string) {
  return (await c.query(sql)).rows;
}

/** A synthetic participant with a verified email. */
export async function mkParticipant(c: pg.Client, tag: string): Promise<string> {
  const u = randomUUID();
  await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','${tag}-${RUN}@t.local',now())`);
  await c.query(`insert into profiles(id,email,role) values ('${u}','${tag}-${RUN}@t.local','candidate')`);
  return u;
}

export const iso = (t: unknown) => (t ? new Date(t as string).toISOString() : null);
