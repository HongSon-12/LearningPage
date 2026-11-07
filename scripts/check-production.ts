import "dotenv/config";
import { Pool } from "pg";
import { mkdir, readFile, readdir, writeFile, unlink } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { join } from "node:path";
import {oidc,oidcConfiguration} from "../src/lib/sso-oidc";
import {ssoApi} from "../src/lib/sso-directory";
import { productionConfigErrors } from "./lib/production-config";

async function main() {
  const errors = productionConfigErrors(process.env);
  if (errors.length) {
    for (const error of errors) console.error(`FAIL ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log("PASS production configuration (no secret values printed)");
  if (process.argv.includes("--config-only")) return;
  try {
    const config = await oidcConfiguration();
    await oidc.tokenIntrospection(config, "configuration-check-not-a-real-token");
    await ssoApi("core/users/?page_size=1&include_groups=false&include_roles=false");
    await ssoApi("events/events/?page_size=1");
    console.log("PASS SSO discovery, confidential client and user/event API reads");
  } catch { console.error("FAIL SSO_CONNECTION_OR_API_PERMISSIONS"); process.exitCode = 1; }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5000, query_timeout: 10000 });
  try {
    const { rows: [server] } = await pool.query<{ version: string; superuser: boolean; createdb: boolean; createrole: boolean }>("SELECT current_setting('server_version_num') AS version, rolsuper AS superuser, rolcreatedb AS createdb, rolcreaterole AS createrole FROM pg_roles WHERE rolname = current_user");
    if (Math.floor(Number(server.version) / 10000) !== 16) throw Error("DATABASE_MAJOR_MUST_BE_16");
    if (server.superuser || server.createdb || server.createrole) throw Error("RUNTIME_DATABASE_ROLE_MUST_NOT_HAVE_ADMIN_PRIVILEGES");
    console.log("PASS PostgreSQL 16 and restricted runtime role");
    const directories = (await readdir("prisma/migrations", { withFileTypes: true })).filter(dir => dir.isDirectory()).map(dir => dir.name).sort();
    const { rows } = await pool.query<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }>('SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations"');
    const applied = rows.filter(row => !row.rolled_back_at);
    if (applied.some(row => !row.finished_at) || applied.length !== directories.length) throw Error("MIGRATIONS_MISSING_FAILED_OR_UNEXPECTED");
    for (const name of directories) {
      const checksum = createHash("sha256").update(await readFile(join("prisma/migrations", name, "migration.sql"))).digest("hex");
      if (!applied.some(row => row.migration_name === name && row.checksum === checksum)) throw Error("MIGRATION_HISTORY_MISMATCH");
    }
    console.log(`PASS ${directories.length} migrations applied with matching checksums`);
    await pool.query('SELECT 1 FROM "Setting" LIMIT 1');
    await pool.query('SELECT 1 FROM "User" LIMIT 1');
    const { rows: [access] } = await pool.query<{ allowed: boolean }>("SELECT bool_and(has_table_privilege(current_user, c.oid, 'SELECT') AND has_table_privilege(current_user, c.oid, 'INSERT') AND has_table_privilege(current_user, c.oid, 'UPDATE') AND has_table_privilege(current_user, c.oid, 'DELETE')) AS allowed FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname <> '_prisma_migrations'");
    if (!access.allowed) throw Error("RUNTIME_DATABASE_PERMISSIONS_MISSING");
    console.log("PASS application tables and runtime permissions");
  } catch (error) {
    // Never print driver errors: these can contain connection details or SQL.
    const code = error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : "DATABASE_CHECK_FAILED";
    console.error(`FAIL ${code}; check connectivity, migrations and grants privately`);
    process.exitCode = 1;
  } finally { await pool.end(); }
  const path = join(process.env.PRIVATE_UPLOAD_DIR!, `.deployment-check-${randomUUID()}`);
  try {
    await mkdir(process.env.PRIVATE_UPLOAD_DIR!, { recursive: true });
    await writeFile(path, "storage-check", { flag: "wx", mode: 0o600 });
    if (await readFile(path, "utf8") !== "storage-check") throw Error();
    console.log("PASS private uploads writable by runtime user");
  } catch { console.error("FAIL PRIVATE_UPLOAD_STORAGE_NOT_WRITABLE"); process.exitCode = 1; }
  finally { await unlink(path).catch(() => undefined); }
  console.log("SMTP credentials configured; real delivery and HTTPS still require checks on the server.");
}
void main().catch(() => { console.error("FAIL PRODUCTION_CHECK_FAILED"); process.exitCode = 1; });
