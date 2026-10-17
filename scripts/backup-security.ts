import "dotenv/config";
import { spawnSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import {
  mkdir,
  readdir,
  readFile,
  writeFile,
  chmod,
  lstat,
  copyFile,
  realpath,
} from "node:fs/promises";
import { resolve, join } from "node:path";
async function main() {
  const root = await realpath(process.cwd());
  const folder = resolve(
    root,
    ".local/backups",
    "security-" +
      new Date().toISOString().replace(/[:.]/g, "-") +
      "-" +
      randomUUID().slice(0, 8),
  );
  if (!folder.startsWith(root + "/.local/backups/"))
    throw new Error("UNSAFE_BACKUP_PATH");
  await mkdir(folder, { recursive: true, mode: 0o700 });
  await chmod(folder, 0o700);
  const database = new URL(process.env.DATABASE_URL || "");
  const result = spawnSync(
    "pg_dump",
    [
      "--format=custom",
      "--no-owner",
      "--no-acl",
      "--file",
      join(folder, "database.dump"),
    ],
    {
      env: {
        ...process.env,
        PGHOST: database.hostname,
        PGPORT: database.port || "5432",
        PGUSER: decodeURIComponent(database.username),
        PGPASSWORD: decodeURIComponent(database.password),
        PGDATABASE: decodeURIComponent(database.pathname.slice(1)),
        PGCONNECT_TIMEOUT: "10",
      },
      encoding: "utf8",
    },
  );
  if (result.status !== 0) throw new Error("BACKUP_DATABASE_FAILED");
  await chmod(join(folder, "database.dump"), 0o600);
  const source = join(root, "public/uploads");
  const files: { name: string; sha256: string; size: number }[] = [];
  const entries = await readdir(source).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  await mkdir(join(folder, "public-uploads-copy"), { mode: 0o700 });
  for (const name of entries) {
    if (!/^[a-zA-Z0-9-]+\.(png|jpg|jpeg|webp|pdf)$/i.test(name))
      throw new Error("UNEXPECTED_LEGACY_ENTRY");
    const path = join(source, name);
    const info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink())
      throw new Error("UNSAFE_LEGACY_ENTRY");
    const buffer = await readFile(path);
    files.push({
      name,
      sha256: createHash("sha256").update(buffer).digest("hex"),
      size: buffer.length,
    });
    await copyFile(path, join(folder, "public-uploads-copy", name));
    await chmod(join(folder, "public-uploads-copy", name), 0o600);
  }
  await writeFile(
    join(folder, "manifest.json"),
    JSON.stringify({ createdAt: new Date().toISOString(), files }, null, 2),
    { mode: 0o600, flag: "wx" },
  );
  const validation = spawnSync(
    "pg_restore",
    ["--list", join(folder, "database.dump")],
    { encoding: "utf8" },
  );
  if (validation.status !== 0) throw new Error("BACKUP_ARCHIVE_INVALID");
  console.log(
    JSON.stringify({
      backupFolder: folder,
      legacyFiles: files.length,
      archiveValidated: true,
    }),
  );
}
main().catch(() => {
  console.error(
    "Backup failed; database has not been migrated. Inspect protected local backup files.",
  );
  process.exitCode = 1;
});
