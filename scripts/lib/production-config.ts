import { isAbsolute, resolve, sep } from "node:path";

export function productionConfigErrors(env: Record<string, string | undefined>): string[] {
  const errors: string[] = [];
  const missing = (key: string) => !env[key] || /REPLACE_|example\.(org|com)|changeme/i.test(env[key]!);
  if (env.AUTH_MODE !== "sso") errors.push("AUTH_MODE must be sso in production");
  for (const key of ["SSO_CLIENT_ID", "SSO_CLIENT_SECRET", "SSO_API_TOKEN", "SSO_WEBHOOK_SECRET"]) if (missing(key)) errors.push(`${key} is required`);
  if ((env.SSO_WEBHOOK_SECRET || "").length < 32) errors.push("SSO_WEBHOOK_SECRET must contain at least 32 random characters");
  if (!/^[a-f0-9]{64}$/i.test(env.SSO_TOKEN_ENCRYPTION_KEY || "") || new Set((env.SSO_TOKEN_ENCRYPTION_KEY || "").toLowerCase()).size < 8) errors.push("SSO_TOKEN_ENCRYPTION_KEY must be a separate random 64-character hex key");
  if (env.SSO_TOKEN_ENCRYPTION_KEY === env.LOOKUP_OTP_SECRET) errors.push("Use separate SSO encryption and OTP keys");
  try { if (new URL(env.SSO_ISSUER || "").protocol !== "https:") throw Error(); } catch { errors.push("SSO_ISSUER must use HTTPS"); }
  if (env.NODE_ENV !== "production") errors.push("NODE_ENV must be production");
  let database: URL | undefined;
  try {
    database = new URL(env.DATABASE_URL || "");
    if (!["postgres:", "postgresql:"].includes(database.protocol) || !database.hostname || !database.pathname.slice(1)) throw Error();
    if (env.PG_HOST && database.hostname !== env.PG_HOST) errors.push("DATABASE_URL hostname must match PG_HOST");
    if (env.PG_PORT && (database.port || "5432") !== env.PG_PORT) errors.push("DATABASE_URL port must match PG_PORT");
    const password = decodeURIComponent(database.password);
    if (password.length < 20 || /REPLACE_|password|changeme/i.test(password)) errors.push("DATABASE_URL requires a strong dedicated database password (20+ characters)");
    if (database.searchParams.get("schema") && database.searchParams.get("schema") !== "public") errors.push("Use a dedicated database with schema=public; runtime and migration schema must match");
  } catch { errors.push("DATABASE_URL must be a valid PostgreSQL URL with a database name"); }
  if (env.MIGRATION_DATABASE_URL && database) {
    try {
      const migration = new URL(env.MIGRATION_DATABASE_URL);
      if (migration.host !== database.host || migration.pathname !== database.pathname || (migration.searchParams.get("schema") || "public") !== "public") errors.push("MIGRATION_DATABASE_URL must target the same host, database and public schema as DATABASE_URL");
    } catch { errors.push("MIGRATION_DATABASE_URL is invalid"); }
  }
  try {
    const origin = new URL(env.APP_ORIGIN || "");
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash || ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname) || /example\.(org|com)$/.test(origin.hostname)) throw Error();
  } catch { errors.push("APP_ORIGIN must be the real canonical HTTPS origin without a path"); }
  if (env.TRUST_PROXY !== "true") errors.push("TRUST_PROXY must be true behind the trusted Nginx");
  const secret = env.LOOKUP_OTP_SECRET || "";
  if (!/^[a-f0-9]{64}$/i.test(secret) || new Set(secret.toLowerCase()).size < 8) errors.push("LOOKUP_OTP_SECRET must be 32 random bytes encoded as 64 hex characters");
  for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"]) if (missing(key)) errors.push(`${key} is required`);
  if (!Number.isInteger(Number(env.SMTP_PORT)) || Number(env.SMTP_PORT) < 1 || Number(env.SMTP_PORT) > 65535) errors.push("SMTP_PORT is invalid");
  if (!["true", "false"].includes(env.SMTP_SECURE || "")) errors.push("SMTP_SECURE must be true or false");
  if (env.SMTP_PORT === "465" && env.SMTP_SECURE !== "true") errors.push("SMTP port 465 requires SMTP_SECURE=true");
  const pool = Number(env.DATABASE_POOL_MAX || 10);
  if (!Number.isInteger(pool) || pool < 2 || pool > 100) errors.push("DATABASE_POOL_MAX must be an integer between 2 and 100");
  const storage = env.PRIVATE_UPLOAD_DIR || "";
  const publicRoot = resolve("public");
  if (!isAbsolute(storage) || resolve(storage) === publicRoot || resolve(storage).startsWith(publicRoot + sep)) errors.push("PRIVATE_UPLOAD_DIR must be an absolute private path outside public");
  return errors;
}
