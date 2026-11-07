import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { join } from "node:path";
import assert from "node:assert/strict";
import { prepareStandalone } from "./prepare-standalone";
async function main() {
    const standalone = await prepareStandalone();
    const socket = createServer();
    await new Promise<void>(r => socket.listen(0, "127.0.0.1", r));
    const address = socket.address();
    assert(address && typeof address !== "string");
    const port = address.port;
    await new Promise<void>((r, j) => socket.close(e => e ? j(e) : r()));
    const base = `http://127.0.0.1:${port}`;
    const child = spawn(process.execPath, [join(standalone, "server.js")], { env: { ...process.env, AUTH_MODE: "local", PORT: String(port), HOSTNAME: "127.0.0.1", APP_ORIGIN: base }, stdio: "ignore" });
    let spawnError: Error | undefined;
    child.on("error", error => { spawnError = error; });
    try {
        let response: Response | undefined;
        const deadline = Date.now() + 20000;
        while (Date.now() < deadline) {
            if (spawnError)
                throw spawnError;
            if (child.exitCode !== null)
                throw Error("STANDALONE_EXITED");
            try {
                response = await fetch(base + "/login", { signal: AbortSignal.timeout(3000) });
                break;
            }
            catch {
                await new Promise(r => setTimeout(r, 100));
            }
        }
        assert(response, "STANDALONE_START_TIMEOUT");
        assert.equal(response.status, 200, "LOGIN_FAILED");
        const html = await response.text();
        const assetPaths = [...html.matchAll(/(?:src|href)="([^\"]*\/_next\/static\/[^\"]+\.(?:js|css))"/g)].map(match => match[1].replaceAll("&amp;", "&"));
        assert(assetPaths.some(path => path.endsWith(".js")), "MISSING_CLIENT_SCRIPTS");
        assert(assetPaths.some(path => path.endsWith(".css")), "MISSING_STYLES");
        for (const path of new Set(assetPaths)) {
            const asset = await fetch(base + path, { signal: AbortSignal.timeout(5000) });
            assert.equal(asset.status, 200, "STATIC_ASSET_MISSING");
            assert((await asset.arrayBuffer()).byteLength > 0);
        }
        const privatePage = await fetch(base + "/", { redirect: "manual", signal: AbortSignal.timeout(5000) });
        assert.equal(privatePage.status, 307);
        assert.equal(privatePage.headers.get("location"), "/login");
        assert.equal((await fetch(base + "/audit-not-a-real-route", { signal: AbortSignal.timeout(5000) })).status, 404);
        console.log("PASS isolated standalone smoke: login, framework JS/CSS, authentication redirect and 404");
    }
    finally {
        if (child.exitCode === null) {
            child.kill("SIGTERM");
            await new Promise<void>(resolve => { const timer = setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 3000); child.once("exit", () => { clearTimeout(timer); resolve(); }); });
        }
    }
}
main().catch(error => { console.error("Standalone smoke failed:", error instanceof Error ? error.message : "UNKNOWN"); process.exitCode = 1; });
