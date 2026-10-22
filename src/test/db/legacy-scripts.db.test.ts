/**
 * Runs the older database test scripts (tools/nonprod-replay/*_test.mjs, about 1,300 checks) against the throwaway database,
 * in order, and fails on any check that is not listed in known-failures.json. New tests are written in vitest directly
 * (see CLAUDE.md); this keeps the old ones inside the gate until they are ported.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { dbUrl } from "./helpers";

const ROOT = path.resolve(__dirname, "../../..");
const SRC = path.join(ROOT, "tools/nonprod-replay");
const KNOWN: Record<string, { failed: number; why: string }> = JSON.parse(readFileSync(path.join(__dirname, "known-failures.json"), "utf8"));
const PKG = path.join(ROOT, "docs/day1/package");
// Scripts that need an argument, or several steps, get it here; policy_test.mjs is a multi step script and is not wrapped yet.
const ARGS: Record<string, string[]> = {
  "event_test.mjs": [PKG],
  "registry_test.mjs": [path.join(PKG, "T3A-DEV-DAY1-001_Field_Dictionary_v1.3.json")],
};
const SKIP = new Set(["policy_test.mjs"]);

let work = "";
beforeAll(() => {
  const url = dbUrl();
  work = mkdtempSync(path.join(tmpdir(), "t3a-legacy-"));
  const nm = path.join(work, "node_modules");
  const pgEntry = path.join(ROOT, "node_modules/pg/lib/index.js");
  if (!existsSync(pgEntry)) throw new Error("pg is not installed: run `npm i --no-save pg` (see CLAUDE.md).");
  const mod = (name: string, body: string) => { const d = path.join(nm, name); mkdirSync(d, { recursive: true }); writeFileSync(path.join(d, "package.json"), JSON.stringify({ name, type: "module", main: "index.js" })); writeFileSync(path.join(d, "index.js"), body); };
  mod("@neondatabase/serverless", `import pg from ${JSON.stringify(pgEntry)}; export const neonConfig = {}; export class Client extends pg.Client {} export default { Client, neonConfig };`);
  mod("ws", "export default class WebSocket {}");
  mod("https-proxy-agent", "export class HttpsProxyAgent { constructor() {} }");
  for (const f of readdirSync(SRC)) if (f.endsWith(".mjs")) cpSync(path.join(SRC, f), path.join(work, f));
  writeFileSync(path.join(work, "conn.txt"), url);
  // the acceptance scripts read the recorded evidence; they get a copy so a run never changes the repository
  cpSync(path.join(ROOT, "docs/day1/evidence"), path.join(work, "evidence"), { recursive: true });
});
afterAll(() => { if (work) rmSync(work, { recursive: true, force: true }); });

const scripts = readdirSync(SRC).filter((f) => f.endsWith("_test.mjs") && !SKIP.has(f)).sort();

describe("older database test scripts", () => {
  it.each(scripts)("%s", async (script) => {
    const out = await new Promise<{ code: number; text: string }>((resolve) => {
      execFile("node", [path.join(work, script), ...(ARGS[script] ?? [])], { cwd: work, maxBuffer: 64 * 1024 * 1024, timeout: 280000, env: { ...process.env, EVIDENCE_DIR: path.join(work, "evidence") + "/", T3A_REPO_ROOT: ROOT } },
        (err, stdout, stderr) => resolve({ code: err ? ((err as any).code ?? 1) : 0, text: stdout + stderr }));
    });
    let failed: any[] = [];
    try {
      // the report is the last object the script prints, opening on a line of its own
      const start = out.text.lastIndexOf("\n{\n") >= 0 ? out.text.lastIndexOf("\n{\n") + 1 : out.text.indexOf("{");
      const j = JSON.parse(out.text.slice(start, out.text.lastIndexOf("}") + 1));
      failed = typeof j.fail === "number" ? new Array(j.fail).fill({ id: "acceptance", label: "see report" }) : (j.failed ?? (j.results ?? []).filter((r: any) => r.result === "FAIL" || r.pass === false));
    } catch {
      /* output that is not the usual report: judged by the exit code below */
    }
    const allowed = KNOWN[script]?.failed ?? 0;
    expect(failed.length, `failed checks in ${script}: ${JSON.stringify(failed.map((f) => f.id + " " + (f.label ?? f.name)))}\n--- last output (exit ${out.code}):\n${out.text.slice(-700)}`).toBe(allowed);
    expect(out.code, `exit code of ${script}:\n${out.text.slice(-600)}`).toBe(0);
  }, 300000);
});
