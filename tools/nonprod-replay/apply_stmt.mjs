import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent";
import fs from "node:fs"; import path from "node:path"; import { splitSql } from "./split.mjs";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const conn = fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim();
const [dir, out] = process.argv.slice(2);
const only = process.argv[4];
const files = fs.readdirSync(dir).filter(f => f.endsWith(".sql")).sort().filter(f => !only || f === only);
const timeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error("STMT_TIMEOUT")), ms))]);
fs.writeFileSync(out, "");
for (const f of files) {
  const stmts = splitSql(fs.readFileSync(path.join(dir, f), "utf8"));
  const rec = { file: f, stmts: stmts.length, ok: 0, errors: [] };
  let c = new Client({ connectionString: conn }); let dead = false; c.on("error", () => { dead = true; });
  try { await c.connect(); await c.query("set search_path to public, extensions"); } catch (e) { rec.errors.push({ i: -1, msg: "CONNECT " + e.message }); }
  for (let i = 0; i < stmts.length; i++) {
    try { if (dead) throw new Error("CONN_DEAD"); await timeout(c.query(stmts[i]), 120000); rec.ok++; }
    catch (e) {
      rec.errors.push({ i, code: e.code, msg: String(e.message).slice(0, 160), sql: stmts[i].slice(0, 90).replace(/\s+/g, " ") });
      if (dead || e.message === "STMT_TIMEOUT" || e.message === "CONN_DEAD") { try { await c.end(); } catch {} c = new Client({ connectionString: conn }); dead = false; c.on("error", () => { dead = true; }); try { await c.connect(); await c.query("set search_path to public, extensions"); } catch {} }
    }
  }
  try { await c.end(); } catch {}
  fs.appendFileSync(out, JSON.stringify(rec) + "\n"); process.stdout.write(rec.errors.length ? "F" : ".");
}
console.log("\nfinished");
