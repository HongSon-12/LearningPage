import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { Pool } from "pg";
async function main() {
  const schema = "ttcc_directory_" + randomUUID().replaceAll("-", "");
  assert.match(schema, /^ttcc_directory_[a-f0-9]{32}$/);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let prisma: typeof import("../src/lib/prisma").default | undefined;
  try {
    await pool.query(`CREATE SCHEMA "${schema}"`);
    process.env.DATABASE_SCHEMA = schema;
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO "${schema}"`);
      for (const dir of (
        await readdir("prisma/migrations", { withFileTypes: true })
      )
        .filter((dir) => dir.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name)))
        await client.query(
          await readFile(`prisma/migrations/${dir.name}/migration.sql`, "utf8"),
        );
    } finally {
      client.release();
    }
    prisma = (await import("../src/lib/prisma")).default;
    const { queryStudentDirectory } = await import(
      "../src/lib/student-directory"
    );
    const { defaultStudentFilter } = await import(
      "../src/lib/student-directory-input"
    );
    const makeUser = async (role: "ADMIN" | "CLASS_MANAGER" | "ACCOUNTANT") =>
      prisma!.user.create({
        data: { username: randomUUID(), role, passwordHash: "unused" },
      });
    const admin = await makeUser("ADMIN"),
      manager = await makeUser("CLASS_MANAGER"),
      other = await makeUser("CLASS_MANAGER"),
      accountant = await makeUser("ACCOUNTANT");
    const a = await prisma.class.create({
        data: {
          code: "A",
          name: "Assigned",
          startTime: "08:00",
          endTime: "12:00",
          managerId: manager.id,
        },
      }),
      b = await prisma.class.create({
        data: {
          code: "B",
          name: "Outside",
          startTime: "08:00",
          endTime: "12:00",
          managerId: other.id,
        },
      });
    const create = async (
      fullName: string,
      cccd: string,
      classes: string[],
      needsReview = false,
    ) => {
      const s = await prisma!.student.create({
        data: {
          fullName,
          cccd,
          dob: new Date("1990-01-01"),
          phone: "0900000000",
          email: "synthetic@example.invalid",
          needsReview,
        },
      });
      for (const classId of classes)
        await prisma!.registration.create({
          data: {
            studentId: s.id,
            classId,
            fullName,
            cccd,
            dob: s.dob,
            phone: s.phone,
          },
        });
      return s;
    };
    const shared = await create("Shared Synthetic", "001234567890", [
      a.id,
      b.id,
    ]);
    await prisma.registration.updateMany({
      where: { studentId: shared.id, classId: b.id },
      data: { profileReviewRequired: true },
    });
    await create("Outside Synthetic", "001234567891", [b.id]);
    for (let i = 0; i < 21; i++)
      await create(
        `Directory Test ${String(i).padStart(2, "0")}`,
        "99" + String(i).padStart(10, "0"),
        [a.id],
        i === 0,
      );
    const filter = { ...defaultStudentFilter, query: "Directory Test" };
    let data = await queryStudentDirectory(manager, filter);
    assert.equal(data.total, 21);
    assert.equal(data.items.length, 20);
    assert.equal(data.pages, 2);
    data = await queryStudentDirectory(manager, { ...filter, page: 2 });
    assert.equal(data.items.length, 1);
    assert.equal(data.page, 2);
    data = await queryStudentDirectory(manager, { ...filter, page: 999 });
    assert.equal(data.page, 2);
    assert.equal(
      (
        await queryStudentDirectory(manager, {
          ...defaultStudentFilter,
          query: "Outside",
        })
      ).total,
      0,
    );
    assert.equal(
      (
        await queryStudentDirectory(manager, {
          ...defaultStudentFilter,
          classId: b.id,
        })
      ).total,
      0,
    );
    assert.equal(
      (
        await queryStudentDirectory(manager, {
          ...defaultStudentFilter,
          query: shared.cccd!,
        })
      ).items[0].id,
      shared.id,
    );
    assert.equal(
      (
        await queryStudentDirectory(accountant, {
          ...defaultStudentFilter,
          query: shared.cccd!,
        })
      ).total,
      0,
    );
    const masked = await queryStudentDirectory(accountant, {
      ...defaultStudentFilter,
      query: "Shared",
    });
    assert.equal(masked.items[0].cccd, "********7890");
    assert(!JSON.stringify(masked).includes(shared.cccd!));
    assert.equal(
      (
        await queryStudentDirectory(manager, {
          ...defaultStudentFilter,
          query: "Shared",
          review: "confirmed",
        })
      ).total,
      1,
    );
    assert.equal(
      (
        await queryStudentDirectory(manager, {
          ...defaultStudentFilter,
          query: "Shared",
          review: "review",
        })
      ).total,
      0,
    );
    assert.equal(
      (
        await queryStudentDirectory(admin, {
          ...defaultStudentFilter,
          query: "Shared",
          review: "review",
        })
      ).total,
      1,
    );
    assert.equal(
      (await queryStudentDirectory(manager, { ...filter, review: "review" }))
        .total,
      1,
    );
    assert.equal(
      (await queryStudentDirectory(manager, { ...filter, review: "confirmed" }))
        .total,
      20,
    );
    for (const invalid of [
      { ...filter, page: 0 },
      { ...filter, page: NaN },
      { ...filter, query: "x".repeat(121) },
    ])
      await assert.rejects(() => queryStudentDirectory(admin, invalid));
    console.log(
      "PASS scoped directory search/contact/class/review filters, stable pagination/clamping, unresolved intake scope, accountant mask/no full-ID search and invalid filters",
    );
  } finally {
    await prisma?.$disconnect();
    assert.match(schema, /^ttcc_directory_[a-f0-9]{32}$/);
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
