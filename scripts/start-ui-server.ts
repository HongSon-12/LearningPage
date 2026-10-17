import "dotenv/config";
import { cp, access } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
async function main() {
  const root = process.cwd(); const standalone = resolve(root,".next-build/standalone");
  await access(join(standalone,"server.js"));
  // Mirror Docker's static asset copies and run the artifact that will actually be deployed.
  await cp(join(root,"public"),join(standalone,"public"),{recursive:true,filter: source => source !== join(root,"public/uploads")});
  await cp(join(root,".next-build/static"),join(standalone,".next-build/static"),{recursive:true});
  const child = spawn(process.execPath,[join(standalone,"server.js")],{stdio:"inherit",env:{...process.env,PORT:"3101",HOSTNAME:"localhost",APP_ORIGIN:"http://localhost:3101",PRIVATE_UPLOAD_DIR:resolve(process.env.PRIVATE_UPLOAD_DIR || join(root,".local/uploads"))}});
  process.on("SIGTERM",()=>child.kill("SIGTERM"));process.on("SIGINT",()=>child.kill("SIGINT"));
  child.on("exit", code=>{process.exitCode=code || 0;});
}
main().catch(()=>{console.error("UI server failed to start; run the production build first.");process.exitCode=1;});
