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
const ROUTES = ["entry", "commit", "interrupt", "suspend"];

beforeAll(() => {
  rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(OUT, "package.json"), JSON.stringify({ type: "module" }));
  writeFileSync(resolve(OUT, "tsconfig.json"), JSON.stringify({
    compilerOptions: { target: "es2022", module: "nodenext", moduleResolution: "nodenext", outDir: resolve(OUT, "out"), rootDir: ROOT, skipLibCheck: true, esModuleInterop: true, types: ["node"], typeRoots: [resolve(ROOT, "node_modules/@types")] },
    files: ROUTES.map((r) => resolve(ROOT, `api/t3a/${r}.ts`)),
  }));
}, 120_000);
afterAll(() => rmSync(OUT, { recursive: true, force: true }));

const res = () => { const r: { code?: number; body?: unknown; status: (c: number) => typeof r; json: (b: unknown) => typeof r } = { status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };

describe("the /api/t3a handlers load and answer under Node ESM", () => {
  it("compiles with no errors", () => {
    let out = "";
    try { execFileSync(resolve(ROOT, "node_modules/.bin/tsc"), ["-p", resolve(OUT, "tsconfig.json")], { encoding: "utf8", stdio: "pipe" }); } catch (e: any) { out = String(e.stdout || e.message); }
    expect(out).toBe("");
    writeFileSync(resolve(OUT, "out/package.json"), JSON.stringify({ type: "module" }));
  }, 120_000);

  it.each(ROUTES)("%s: loads, refuses with 503 when the Supabase settings are missing, and with 401 when there is no sign-in", async (route) => {
    const mod = await import(pathToFileURL(resolve(OUT, `out/api/t3a/${route}.js`)).href);
    const saved = { u: process.env.SUPABASE_URL, v: process.env.VITE_SUPABASE_URL, k: process.env.SUPABASE_SERVICE_ROLE_KEY };
    try {
      delete process.env.SUPABASE_URL; delete process.env.VITE_SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      const a = res(); await mod.default({ method: "POST", headers: {}, body: {} }, a);
      expect(a.code).toBe(503);
      process.env.SUPABASE_URL = "http://127.0.0.1:9"; process.env.SUPABASE_SERVICE_ROLE_KEY = "x".repeat(40);
      const b = res(); await mod.default({ method: "POST", headers: {}, body: {} }, b);
      expect(b.code).toBe(401); expect(b.body).toEqual({ error: "sign_in_required" });
      const c = res(); await mod.default({ method: "GET", headers: {} }, c);
      expect(c.code).toBe(405);
    } finally {
      for (const [k, v] of [["SUPABASE_URL", saved.u], ["VITE_SUPABASE_URL", saved.v], ["SUPABASE_SERVICE_ROLE_KEY", saved.k]] as const) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    }
  }, 60_000);
});
