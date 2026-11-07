import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { Pool } from "pg";
async function main() {
  const schema = "ttcc_rbac_ui_" + randomUUID().replaceAll("-", "");
  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  let created = false;
  try {
    await pool.query(`CREATE SCHEMA "${schema}"`); created = true;
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO "${schema}"`);
      for (const dir of (await readdir("prisma/migrations", {withFileTypes:true})).filter(d=>d.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))
        await client.query(await readFile(`prisma/migrations/${dir.name}/migration.sql`,"utf8"));
    } finally { client.release(); }
    const code = await new Promise<number>(resolve => {
      const child = spawn("pnpm",["exec","playwright","test","--config=playwright.rbac.config.ts"],{stdio:"inherit",env:{...process.env,DATABASE_SCHEMA:schema}});
      child.on("error",()=>resolve(1)); child.on("exit",code=>resolve(code ?? 1));
    });
    process.exitCode = code;
  } finally {
    if(created) { if(!/^ttcc_rbac_ui_[a-f0-9]{32}$/.test(schema)) throw new Error("Invalid test schema"); await pool.query(`DROP SCHEMA "${schema}" CASCADE`); }
    await pool.end();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
