import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { realpath } from "node:fs/promises";
import { resolve, join } from "node:path";
import { Pool } from "pg";
let stage = "PATH";
async function main() {
  const root = await realpath(process.cwd());
  const folder = await realpath(resolve(process.argv[2] || ""));
  assert(folder.startsWith(join(root, ".local/backups") + "/"));
  const db = "ttcc_restore_" + randomUUID().replaceAll("-", "");
  assert.match(db, /^ttcc_restore_[a-f0-9]{32}$/);
  const source = new URL(process.env.DATABASE_URL || "");
  const control = new Pool({ connectionString: source.toString() });
  let restored: Pool | undefined;
  let created = false;
  try {
    stage = "CREATE_DATABASE";
    await control.query(`CREATE DATABASE "${db}"`);
    created = true;
    stage = "RESTORE_ARCHIVE";
    const result = spawnSync(
      "pg_restore",
      ["--no-owner", "--no-acl", "--dbname", db, join(folder, "database.dump")],
      {
        env: {
          ...process.env,
          PGHOST: source.hostname,
          PGPORT: source.port || "5432",
          PGUSER: decodeURIComponent(source.username),
          PGPASSWORD: decodeURIComponent(source.password),
          PGCONNECT_TIMEOUT: "10",
        },
        encoding: "utf8",
      },
    );
    // pg_dump17 emits this session-only SET even for a PostgreSQL16 source.
    // Accept exactly this one known compatibility error; every other restore error fails verification.
    const errors = result.stderr.match(/^pg_restore: error:/gm) || [];
    const settingOnly =
      result.status === 1 &&
      errors.length === 1 &&
      result.stderr.includes(
        'ERROR:  unrecognized configuration parameter "transaction_timeout"',
      ) &&
      result.stderr.includes("Command was: SET transaction_timeout = 0;") &&
      /errors ignored on restore: 1\s*$/.test(result.stderr);
    if (result.status !== 0 && !settingOnly) throw new Error("RESTORE_FAILED");
    if (settingOnly)
      console.log({
        compatibilitySettingSkipped: "transaction_timeout",
        otherRestoreErrors: 0,
      });
    stage = "VERIFY_DATA";
    source.pathname = "/" + db;
    restored = new Pool({ connectionString: source.toString() });
    const resultCount = await restored.query(
      'SELECT count(*)::int AS count FROM "Registration"',
    );
    const migrations = await restored.query(
      'SELECT count(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL',
    );
    console.log({
      restoreVerified: true,
      registrationCount: resultCount.rows[0].count,
      migrationCount: migrations.rows[0].count,
    });
  } finally {
    await restored?.end();
    // Only the random database created by this invocation can be dropped.
    if (created && /^ttcc_restore_[a-f0-9]{32}$/.test(db))
      await control.query(`DROP DATABASE "${db}"`);
    await control.end();
  }
}
main().catch((error) => {
  console.error({
    error: "Backup restore verification failed; original database unchanged",
    stage,
    code: typeof error?.code === "string" ? error.code : "CHECK_FAILED",
  });
  process.exitCode = 1;
});
