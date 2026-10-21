import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { HttpsProxyAgent } from "https-proxy-agent";
import fs from "node:fs";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const conn = fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim();
const c = new Client({ connectionString: conn });
c.on("error", e => { console.log(JSON.stringify({ ok: false, error: "CONN " + e.message })); process.exit(0); });
const sql = fs.readFileSync(process.argv[2], "utf8");
const pre = process.argv[3] === "raw" ? "" : "set search_path to public, extensions;\n";
try { await c.connect(); await c.query(pre + sql); console.log(JSON.stringify({ ok: true })); }
catch (e) { console.log(JSON.stringify({ ok: false, code: e.code, error: String(e.message).slice(0, 300) })); }
try { await c.end(); } catch {}
process.exit(0);
