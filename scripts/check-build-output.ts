import { resolve, join } from "node:path";
import { readdir, lstat, unlink, access } from "node:fs/promises";
async function main() {
  const root = resolve(process.cwd());
  const dist = process.env.NEXT_BUILD_DIR || ".next";
  const standalone = resolve(root, dist, "standalone");
  if (!standalone.startsWith(root + "/") || standalone === root)
    throw new Error("UNSAFE_BUILD_PATH");
  // Next standalone explicitly copies loaded .env files independently of tracing exclusions.
  // Remove only copies in this generated directory; deployment injects runtime secrets.
  for (const name of await readdir(standalone)) {
    if (name === ".env" || name.startsWith(".env.")) {
      const path = join(standalone, name);
      if (!(await lstat(path)).isFile())
        throw new Error("UNEXPECTED_ENV_ENTRY");
      await unlink(path);
    }
  }
  for (const entry of [".local", ".git", "public/uploads", ".next/dev"]) {
    let exists = false;
    try {
      await access(join(standalone, entry));
      exists = true;
    } catch {}
    if (exists) throw new Error("PRIVATE_DATA_IN_BUILD");
  }
  const traces: string[] = [];
  async function walk(folder: string) {
    for (const item of await readdir(folder, { withFileTypes: true })) {
      const path = join(folder, item.name);
      if (
        item.isDirectory() &&
        item.name !== "standalone" &&
        item.name !== "cache"
      )
        await walk(path);
      else if (item.isFile() && item.name.endsWith(".nft.json"))
        traces.push(path);
    }
  }
  const { readFile } = await import("node:fs/promises");
  await walk(resolve(root, dist));
  for (const trace of traces) {
    const value = JSON.parse(await readFile(trace, "utf8")) as {
      files: string[];
    };
    if (
      value.files.some((file) =>
        /(?:^|\/)(?:\.local|\.git|\.env(?:\.[^/]+)?)(?:\/|$)/.test(file),
      )
    )
      throw new Error("PRIVATE_DATA_IN_TRACE");
  }
  console.log(
    "PASS standalone and server traces exclude private files, backups and local secrets",
  );
}
main().catch(() => {
  console.error(
    "Build output verification failed; do not deploy this artifact.",
  );
  process.exitCode = 1;
});
