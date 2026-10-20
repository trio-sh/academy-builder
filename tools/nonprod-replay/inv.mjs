import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
const q = async s => (await c.query(s)).rows;
const out = {
 objects: await q("select n.nspname schema_name,c.relname object_name,c.relkind object_kind from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname not in ('pg_catalog','information_schema','pg_toast') order by 1,2"),
 columns: await q("select table_schema,table_name,column_name,data_type,udt_name,is_nullable from information_schema.columns where table_schema not in ('pg_catalog','information_schema') order by 1,2,ordinal_position"),
 policies: await q("select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies order by 1,2,3"),
 routines: await q("select routine_schema,routine_name,routine_type from information_schema.routines where routine_schema not in ('pg_catalog','information_schema') order by 1,2"),
};
fs.writeFileSync(process.argv[2], JSON.stringify(out)); await c.end(); process.exit(0);
