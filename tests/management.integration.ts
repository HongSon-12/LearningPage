import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { Pool } from "pg";
import ExcelJS from "exceljs";
async function main() {
  const schema = "ttcc_test_" + randomUUID().replaceAll("-", "");
  assert.match(schema, /^ttcc_test_[a-f0-9]{32}$/);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query(`CREATE SCHEMA "${schema}"`);
  process.env.DATABASE_SCHEMA = schema;
  let prisma: typeof import("../src/lib/prisma").default | undefined;
  try {
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO "${schema}"`);
      for (const dir of (
        await readdir("prisma/migrations", { withFileTypes: true })
      )
        .filter((dir) => dir.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name))) {
        await client.query(
          await readFile(`prisma/migrations/${dir.name}/migration.sql`, "utf8"),
        );
      }
    } finally {
      client.release();
    }
    prisma = (await import("../src/lib/prisma")).default;
    const { reserveOnline, rosterTransaction, addRegistration, occupiedWhere } =
      await import("../src/lib/admissions");
    const { transferInTransaction } = await import("../src/lib/transfers");
    const { assertClassAccess } = await import("../src/lib/permissions");
    const { excelExport, readExcel, importExcel } = await import(
      "../src/lib/excel"
    );
    const admin = await prisma.user.create({
      data: { username: "test-admin", passwordHash: "unused", role: "ADMIN" },
    });
    const manager = await prisma.user.create({
      data: {
        username: "test-manager",
        passwordHash: "unused",
        role: "CLASS_MANAGER",
      },
    });
    const accountant = await prisma.user.create({
      data: {
        username: "test-accountant",
        passwordHash: "unused",
        role: "ACCOUNTANT",
      },
    });
    const base = {
      name: "Test class",
      startTime: "08:00",
      endTime: "12:00",
      startDate: new Date("2099-01-01"),
      endDate: new Date("2099-01-01"),
      fee: 400000,
    };
    const course = await prisma.class.create({
      data: { ...base, code: "RACE", capacity: 40, managerId: manager.id },
    });
    await prisma.registration.createMany({
      data: Array.from({ length: 39 }, (_, i) => ({
        classId: course.id,
        fullName: "Existing " + i,
        phone: "0900000000",
        cccd: "seed-" + i,
        dob: new Date("1990-01-01"),
      })),
    });
    const input = (classId: string, cccd: string) => ({
      classId,
      fullName: "Test Student",
      phone: "0900000001",
      cccd,
      dob: new Date("1990-01-01"),
      requestKey: randomUUID(),
      receiptToken: randomUUID() + randomUUID(),
    });
    const applicants = Array.from({ length: 12 }, (_, i) =>
      input(course.id, "race-" + i),
    );
    const results = await Promise.allSettled(applicants.map(reserveOnline));
    if (!results.some((r) => r.status === "fulfilled"))
      console.error(
        results.map((r) => (r.status === "rejected" ? r.reason.message : "")),
      );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      await prisma.registration.count({
        where: { classId: course.id, ...occupiedWhere },
      }),
      40,
    );
    assert(
      results
        .filter((r) => r.status === "rejected")
        .every(
          (r) =>
            r.status === "rejected" &&
            r.reason.message.includes("Số lượng học viên đã đủ"),
        ),
    );
    console.log(
      "PASS 39/40: 12 concurrent submissions admit exactly one student",
    );
    const winnerIndex = results.findIndex((r) => r.status === "fulfilled");
    const repeated = await reserveOnline(applicants[winnerIndex]);
    assert.equal(repeated.created, false);
    assert.equal(
      await prisma.registration.count({ where: { classId: course.id } }),
      40,
    );
    await assert.rejects(() =>
      reserveOnline({
        ...applicants[winnerIndex],
        receiptToken: randomUUID() + randomUUID(),
      }),
    );
    console.log(
      "PASS retries are idempotent; another token cannot recover the registration",
    );
    const target = await prisma.class.create({
      data: { ...base, code: "TARGET", capacity: 2, managerId: manager.id },
    });
    const student = repeated.registration;
    await rosterTransaction((tx) =>
      transferInTransaction(tx, manager, student.id, target.id, "Đổi lịch"),
    );
    assert.equal(
      await prisma.registration.count({
        where: { classId: course.id, ...occupiedWhere },
      }),
      39,
    );
    assert.equal(
      await prisma.registration.count({
        where: { classId: target.id, ...occupiedWhere },
      }),
      1,
    );
    assert.equal(
      (
        await prisma.registration.findUniqueOrThrow({
          where: { id: student.id },
        })
      ).paymentStatus,
      "PENDING",
    );
    assert.equal(
      await prisma.registrationEvent.count({
        where: { registrationId: student.id, action: "TRANSFER" },
      }),
      1,
    );
    const other = await prisma.class.create({
      data: { ...base, code: "UNASSIGNED", capacity: 1 },
    });
    await assert.rejects(() =>
      rosterTransaction((tx) =>
        transferInTransaction(tx, manager, student.id, other.id, "Đổi"),
      ),
    );
    await assert.rejects(() =>
      rosterTransaction((tx) =>
        transferInTransaction(tx, accountant, student.id, course.id, "Đổi"),
      ),
    );
    assert.throws(() => assertClassAccess(manager, other));
    assert.equal(
      (
        await prisma.registration.findUniqueOrThrow({
          where: { id: student.id },
        })
      ).classId,
      target.id,
    );
    console.log(
      "PASS transfer changes both rosters atomically, records history and enforces assigned-class permissions",
    );
    const rejected = await prisma.registration.create({
      data: {
        classId: course.id,
        fullName: "Rejected",
        phone: "0900000000",
        cccd: "rejected",
        dob: new Date("1990-01-01"),
        status: "REJECTED",
        rejectionReason: "Thiếu hồ sơ",
      },
    });
    assert.equal(
      await prisma.registration.count({
        where: { classId: course.id, ...occupiedWhere },
      }),
      39,
    );
    const columns = [
      "Mã hồ sơ",
      "Mã lớp",
      "Họ và tên",
      "Ngày sinh",
      "Số điện thoại",
      "CCCD",
      "Số GXN",
      "Mã hóa đơn điện tử",
      "Đã gửi GCN trực tiếp",
    ];
    async function excelRows(values: unknown[][]) {
      const book = new ExcelJS.Workbook();
      const sheet = book.addWorksheet("Học viên");
      sheet.addRows([columns, ...values]);
      return readExcel(Buffer.from(await book.xlsx.writeBuffer()));
    }
    const createRows = await excelRows([
      [
        "",
        "TARGET",
        "Excel Student",
        "1991-02-03",
        "0900000012",
        "001234567890",
        "GXN-001",
        "HD-001",
        "Có",
      ],
    ]);
    await importExcel(admin, createRows, false);
    assert.equal(
      await prisma.registration.count({ where: { classId: target.id } }),
      1,
    );
    await importExcel(admin, createRows, true);
    assert.equal(
      await prisma.registration.count({ where: { classId: target.id } }),
      2,
    );
    const excelStudent = await prisma.registration.findFirstOrThrow({
      where: { cccd: "001234567890" },
    });
    assert.equal(excelStudent.confirmationNumber, "GXN-001");
    assert.equal(excelStudent.certificateDeliveredDirect, true);
    console.log(
      "PASS Excel preview rolls back; confirmed import creates records and GCN/GXN/invoice fields",
    );
    const updateRows = await excelRows([
      [
        excelStudent.id,
        "TARGET",
        "Changed Name",
        "1991-02-03",
        "0900000012",
        "001234567890",
        "GXN-002",
        "HD-002",
        "Không",
      ],
    ]);
    await assert.rejects(
      () => importExcel(admin, updateRows, true, "different-class"),
      /lớp khác/,
    );
    await importExcel(admin, updateRows, true, target.id);
    assert.equal(
      (
        await prisma.registration.findUniqueOrThrow({
          where: { id: excelStudent.id },
        })
      ).fullName,
      "Changed Name",
    );
    await assert.rejects(() =>
      importExcel(
        manager,
        updateRows.map((r) => ({
          ...r,
          data: { ...r.data, invoiceCode: "FORBIDDEN" },
        })),
        true,
      ),
    );
    const financeRows = await excelRows([
      [
        excelStudent.id,
        "TARGET",
        "Changed Name",
        "1991-02-03",
        "0900000012",
        "001234567890",
        "GXN-002",
        "HD-003",
        "Không",
      ],
    ]);
    await importExcel(accountant, financeRows, true);
    assert.equal(
      (
        await prisma.registration.findUniqueOrThrow({
          where: { id: excelStudent.id },
        })
      ).invoiceCode,
      "HD-003",
    );
    const badRows = await excelRows([
      [
        excelStudent.id,
        "TARGET",
        "Should Roll Back",
        "1991-02-03",
        "0900000012",
        "001234567890",
      ],
      ["", "TARGET", "Over Capacity", "1991-02-03", "0900000013", "extra"],
    ]);
    await assert.rejects(() => importExcel(admin, badRows, true));
    assert.equal(
      (
        await prisma.registration.findUniqueOrThrow({
          where: { id: excelStudent.id },
        })
      ).fullName,
      "Changed Name",
    );
    const exported = await excelExport(manager, target.id, false);
    const roundtrip = await readExcel(Buffer.from(exported));
    assert(
      roundtrip.some(
        (r) => r.data.cccd === "001234567890" && r.data.phone === "0900000012",
      ),
    );
    await importExcel(manager, roundtrip, false);
    console.log(
      "PASS Excel updates personal information, protects accounting fields, rolls back invalid files and preserves leading zeros",
    );
    const late = await prisma.class.create({
      data: {
        ...base,
        code: "LATE",
        capacity: 1,
        registrationDeadline: new Date("2000-01-01"),
      },
    });
    await assert.rejects(() =>
      rosterTransaction((tx) =>
        addRegistration(tx, input(late.id, "late-1"), { method: "MANUAL" }),
      ),
    );
    await rosterTransaction((tx) =>
      addRegistration(tx, input(late.id, "late-1"), {
        method: "LATE",
        actorId: admin.id,
      }),
    );
    await assert.rejects(() =>
      rosterTransaction((tx) =>
        addRegistration(tx, input(late.id, "late-2"), { method: "LATE" }),
      ),
    );
    assert.equal(rejected.rejectionReason, "Thiếu hồ sơ");
    console.log(
      "PASS late registrations allow expired deadlines but never exceed capacity",
    );
  } finally {
    if (prisma) await prisma.$disconnect();
    assert.match(schema, /^ttcc_test_[a-f0-9]{32}$/);
    await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
    await pool.end();
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
