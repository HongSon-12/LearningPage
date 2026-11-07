import assert from "node:assert/strict";
import { productionConfigErrors } from "../scripts/lib/production-config";
const valid = {
  AUTH_MODE: "sso", SSO_ISSUER: "https://sso.115.org.vn/application/o/edu/", SSO_CLIENT_ID: "synthetic-client",
  SSO_CLIENT_SECRET: "synthetic-client-secret", SSO_API_TOKEN: "synthetic-api-secret", SSO_WEBHOOK_SECRET: "synthetic-webhook-secret-long-enough-for-test",
  SSO_TOKEN_ENCRYPTION_KEY: "fedcba9876543210".repeat(4),
  NODE_ENV: "production", DATABASE_URL: "postgresql://learning_app:Ab8dF02aC6e91b52fD9a4cEe@database:5432/learning_production?schema=public",
  APP_ORIGIN: "https://training.hospital.vn", TRUST_PROXY: "true",
  LOOKUP_OTP_SECRET: "0123456789abcdef".repeat(4), SMTP_HOST: "smtp.hospital.vn", SMTP_PORT: "587", SMTP_SECURE: "false",
  SMTP_USER: "mailer@hospital.vn", SMTP_PASS: "synthetic-only-secret", PRIVATE_UPLOAD_DIR: "/data/uploads", DATABASE_POOL_MAX: "10",
};
assert.deepEqual(productionConfigErrors(valid), []);
assert.deepEqual(productionConfigErrors({...valid,PG_HOST:"database",PG_PORT:"5432"}), []);
for (const change of [
  { PG_HOST: "other-database" }, { PG_PORT: "5433" }, { AUTH_MODE: "local" }, { SSO_CLIENT_SECRET: "" }, { SSO_TOKEN_ENCRYPTION_KEY: valid.LOOKUP_OTP_SECRET }, { NODE_ENV: "development" }, { DATABASE_URL: "postgresql://app:ttcc_password@db/test" },
  { DATABASE_URL: valid.DATABASE_URL.replace("public", "another_schema") },
  { MIGRATION_DATABASE_URL: valid.DATABASE_URL.replace("learning_production", "other_database") },
  { APP_ORIGIN: "http://training.hospital.vn" }, { APP_ORIGIN: "https://training.hospital.vn/path" },
  { APP_ORIGIN: "https://training.example.org" }, { TRUST_PROXY: "false" },
  { LOOKUP_OTP_SECRET: "a".repeat(64) }, { SMTP_PASS: "REPLACE_WITH_SMTP_PASSWORD" },
  { SMTP_PORT: "465" }, { SMTP_PORT: "NaN" }, { DATABASE_POOL_MAX: "101" },
  { PRIVATE_UPLOAD_DIR: "public/uploads" },
]) assert(productionConfigErrors({ ...valid, ...change }).length, `Expected rejection of ${Object.keys(change).join()}`);
assert.deepEqual(productionConfigErrors({ ...valid, SMTP_PORT: "465", SMTP_SECURE: "true" }), []);
assert.deepEqual(productionConfigErrors({ ...valid, MIGRATION_DATABASE_URL: valid.DATABASE_URL.replace("learning_app", "learning_owner") }), []);
console.log("PASS production configuration: HTTPS, secrets, database isolation, SMTP, pooling and private storage");
