import "dotenv/config";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";
import { prepareStandalone } from "./prepare-standalone";
async function main() {
    const standalone = await prepareStandalone(process.env.NEXT_BUILD_DIR || ".next-build");
    const child = spawn(process.execPath, [join(standalone, "server.js")], { stdio: "inherit", env: { ...process.env, AUTH_MODE: "local", PORT: "3101", HOSTNAME: "localhost", APP_ORIGIN: "http://localhost:3101", PRIVATE_UPLOAD_DIR: resolve(process.env.PRIVATE_UPLOAD_DIR || ".local/uploads") } });
    process.on("SIGTERM", () => child.kill("SIGTERM"));
    process.on("SIGINT", () => child.kill("SIGINT"));
    child.on("exit", code => { process.exitCode = code || 0; });
}
main().catch(() => { console.error("UI server failed to start; run the production build first."); process.exitCode = 1; });
