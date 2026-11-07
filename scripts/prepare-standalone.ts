import { cp, access } from "node:fs/promises";
import { resolve, join } from "node:path";
export async function prepareStandalone(dist = process.env.NEXT_BUILD_DIR || ".next") {
    const root = resolve(process.cwd()), standalone = resolve(root, dist, "standalone");
    if (!standalone.startsWith(root + "/") || standalone === root)
        throw Error("UNSAFE_BUILD_PATH");
    await access(join(standalone, "server.js"));
    const publicRoot = resolve(root, "public"), legacy = resolve(publicRoot, "uploads");
    await cp(publicRoot, join(standalone, "public"), { recursive: true, filter: source => source !== legacy });
    await cp(resolve(root, dist, "static"), resolve(standalone, dist, "static"), { recursive: true });
    return standalone;
}
