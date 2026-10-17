import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { Pool } from "pg";
async function main() {
  const schema = "ttcc_students_" + randomUUID().replaceAll("-", "");
  assert.match(schema, /^ttcc_students_[a-f0-9]{32}$/);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let prisma: typeof import("../src/lib/prisma").default | undefined;
  try {
    await pool.query(`CREATE SCHEMA "${schema}"`);
    process.env.DATABASE_SCHEMA = schema;
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO "${schema}"`);
      const dirs = (await readdir("prisma/migrations", { withFileTypes: true }))
        .filter((dir) => dir.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name));
      for (const dir of dirs.filter(
        (dir) => dir.name !== "20261017000100_cccd_email_otp",
      ))
        await client.query(
          await readFile(`prisma/migrations/${dir.name}/migration.sql`, "utf8"),
        );
      const classId = randomUUID();
      await client.query(
        'INSERT INTO "Class" ("id","code","name","startTime","endTime","updatedAt") VALUES ($1,$2,$3,$4,$5,now())',
        [classId, "MIGRATION", "Synthetic migration", "08:00", "12:00"],
      );
      const rows = [
        ["001234567890", "Same@Example.Invalid"],
        ["001 234 567 890", "same@example.invalid"],
        ["990000000012", "first@example.invalid"],
        ["990000000012", "second@example.invalid"],
        ["legacy", "same@example.invalid"],
        ["legacy", "same@example.invalid"],
        ["990000000013", "same@example.invalid"],
        ["990000000013", null],
      ];
      const ids: string[] = [];
      for (const [cccd, email] of rows) {
        const id = randomUUID();
        ids.push(id);
        await client.query(
          'INSERT INTO "Registration" ("id","classId","fullName","dob","phone","cccd","email") VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [
            id,
            classId,
            "Synthetic Person",
            "1990-01-01",
            "0900000000",
            cccd,
            email,
          ],
        );
      }
      await client.query(
        'INSERT INTO "SearchToken" ("tokenHash","registrationId","jobId","expiresAt") VALUES ($1,$2,$3,$4)',
        ["a".repeat(64), ids[0], randomUUID(), new Date(Date.now() + 3600000)],
      );
      await client.query(
        'INSERT INTO "EmailOutbox" ("id","registrationId","recipient","idempotencyKey") VALUES ($1,$2,$3,$4)',
        [randomUUID(), ids[0], "same@example.invalid", "legacy-link"],
      );
      await client.query(
        await readFile(
          "prisma/migrations/20261017000100_cccd_email_otp/migration.sql",
          "utf8",
        ),
      );
    } finally {
      client.release();
    }
    prisma = (await import("../src/lib/prisma")).default;
    assert.equal(await prisma.registration.count(), 8);
    assert.equal(await prisma.student.count(), 5);
    const same = await prisma.student.findUniqueOrThrow({
      where: { cccd: "001234567890" },
      include: { registrations: true },
    });
    assert.equal(same.registrations.length, 2);
    assert.equal(same.email, "same@example.invalid");
    assert.equal(same.needsReview, false);
    assert(same.registrations.every((row) => row.cccd === "001234567890"));
    for (const cccd of ["990000000012", "990000000013"]) {
      const student: { email: string | null; needsReview: boolean } =
        await prisma.student.findUniqueOrThrow({ where: { cccd } });
      assert.equal(student.email, null);
      assert.equal(student.needsReview, true);
    }
    assert.equal(await prisma.student.count({ where: { cccd: null } }), 2);
    assert.equal(
      await prisma.registration.count({ where: { studentId: null } }),
      0,
    );
    assert((await prisma.searchToken.findFirstOrThrow()).usedAt);
    assert.equal(
      (
        await prisma.emailOutbox.findUniqueOrThrow({
          where: { idempotencyKey: "legacy-link" },
        })
      ).status,
      "CANCELLED",
    );
    console.log(
      "PASS populated migration: all registrations preserved/linked, matching CCCD merged, format/leading zeros retained, conflicting/missing emails quarantined, invalid IDs kept separate, old links revoked",
    );
  } finally {
    await prisma?.$disconnect();
    assert.match(schema, /^ttcc_students_[a-f0-9]{32}$/);
    await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await pool.end();
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
