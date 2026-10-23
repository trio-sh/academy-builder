/**
 * The four /api/t3a handlers are compiled the way the server compiles them (package.json is "type": "module", so Node needs real
 * module resolution with explicit .js endings), loaded in Node, and called. A failed import is exactly what took them down on the first deploy
 * (FUNCTION_INVOCATION_FAILED on every call), which the unit tests, run through vitest, could not see.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ROOT = process.cwd();
const OUT = resolve(ROOT, "node_modules/.cache/t3a-handler-load");
const ROUTES = ["entry", "commit", "interrupt", "suspend", "seal"];

beforeAll(() => {
  rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(OUT, "package.json"), JSON.stringify({ type: "module" }));
  writeFileSync(resolve(OUT, "tsconfig.json"), JSON.stringify({
    compilerOptions: { target: "es2022", module: "nodenext", moduleResolution: "nodenext", outDir: resolve(OUT, "out"), rootDir: ROOT, skipLibCheck: true, esModuleInterop: true, types: ["node"], typeRoots: [resolve(ROOT, "node_modules/@types")] },
    files: [resolve(ROOT, "api/t3a/[route].ts")],
  }));
}, 120_000);
afterAll(() => rmSync(OUT, { recursive: true, force: true }));

// The handlers are run in a separate Node process, as ESM, the way the server runs them (the bracketed file name of the dynamic route is not resolved through vite).
const RUNNER = `
const mod = await import(process.argv[2]);
const out = [];
for (const c of JSON.parse(process.argv[3])) {
  for (const k of ["SUPABASE_URL", "VITE_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "T3A_SEAL_SIGNING_KEY"]) delete process.env[k];
  Object.assign(process.env, c.env ?? {});
  const r = { code: undefined, body: undefined, status(x) { r.code = x; return r; }, json(b) { r.body = b; return r; } };
  await mod.default({ method: c.method, headers: {}, body: {}, query: { route: c.route } }, r);
  out.push({ code: r.code, body: r.body });
}
console.log(JSON.stringify(out));
`;
type Case = { route?: string; method: string; env?: Record<string, string> };
function runCases(cases: Case[]): { code: number; body: unknown }[] {
  writeFileSync(resolve(OUT, "run.mjs"), RUNNER);
  const url = pathToFileURL(resolve(OUT, "out/api/t3a/[route].js")).href;
  return JSON.parse(execFileSync("node", [resolve(OUT, "run.mjs"), url, JSON.stringify(cases)], { encoding: "utf8" }));
}

describe("the /api/t3a handlers load and answer under Node ESM", () => {
  it("compiles with no errors", () => {
    let out = "";
    try { execFileSync(resolve(ROOT, "node_modules/.bin/tsc"), ["-p", resolve(OUT, "tsconfig.json")], { encoding: "utf8", stdio: "pipe" }); } catch (e: any) { out = String(e.stdout || e.message); }
    expect(out).toBe("");
    writeFileSync(resolve(OUT, "out/package.json"), JSON.stringify({ type: "module" }));
  }, 120_000);

  it("is one function for all the routes (the Hobby plan allows twelve in a deployment), and an unknown route is 404", async () => {
    const { readdirSync } = await import("node:fs");
    expect(readdirSync(resolve(ROOT, "api/t3a"))).toEqual(["[route].ts"]);
    const count = (dir: string): number => readdirSync(resolve(ROOT, dir), { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(`${dir}/${e.name}`) : /\.ts$/.test(e.name) ? 1 : 0), 0);
    expect(count("api")).toBeLessThanOrEqual(12);
    const odd = [undefined, "nope", "__proto__", "constructor", "toString", "entry/../seal"];
    const out = runCases(odd.map((route) => ({ route, method: "POST" })));
    out.forEach((o, i) => expect(o.code, String(odd[i])).toBe(404));
  }, 60_000);

  it.each(ROUTES)("%s: loads, refuses with 503 when the Supabase settings are missing, and with 401 when there is no sign-in", (route) => {
    const set = { SUPABASE_URL: "http://127.0.0.1:9", SUPABASE_SERVICE_ROLE_KEY: "x".repeat(40), T3A_SEAL_SIGNING_KEY: Buffer.alloc(32, 7).toString("base64") };
    const [a, b, c] = runCases([{ route, method: "POST" }, { route, method: "POST", env: set }, { route, method: "GET", env: set }]);
    expect(a.code).toBe(503);
    expect(b.code).toBe(401); expect(b.body).toEqual({ error: "sign_in_required" });
    // the sealing job is also called with GET by a scheduler, so it answers GET like POST: no sign-in is still refused
    expect(c.code).toBe(route === "seal" ? 401 : 405);
  }, 60_000);
});
