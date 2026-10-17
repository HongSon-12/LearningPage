import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { Pool } from "pg";
import { compare } from "bcryptjs";
async function main() {
  const schema = "ttcc_attendance_" + randomUUID().replaceAll("-", "");
  assert.match(schema, /^ttcc_attendance_[a-f0-9]{32}$/);
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
    const {
      saveClassSession,
      setSessionClosed,
      findAttendanceCandidates,
      recordAttendance,
    } = await import("../src/lib/attendance");
    const { persistUser, persistManagerAssignment } = await import(
      "../src/lib/user-management"
    );
    const { cccdFromQr } = await import("../src/lib/cccd-qr");
    for (const payload of [
      "001234567890",
      "001234567890||Synthetic Person|01011990|Nam|Synthetic address|01012020",
    ])
      assert.equal(cccdFromQr(payload), "001234567890");
    for (const payload of [
      "123456789",
      "https://example.invalid/?id=001234567890",
      "prefix001234567890",
      "001234567890|too|short",
      "x".repeat(5000),
      '{"cccd":"001234567890"}',
    ])
      assert.equal(cccdFromQr(payload), null);
    const makeUser = async (
      role: "ADMIN" | "CLASS_MANAGER" | "ACCOUNTANT",
      active = true,
    ) =>
      prisma!.user.create({
        data: { username: randomUUID(), passwordHash: "unused", role, active },
      });
    const admin = await makeUser("ADMIN"),
      secondAdmin = await makeUser("ADMIN"),
      manager = await makeUser("CLASS_MANAGER"),
      other = await makeUser("CLASS_MANAGER"),
      accountant = await makeUser("ACCOUNTANT"),
      inactive = await makeUser("CLASS_MANAGER", false);
    const course = await prisma.class.create({
      data: {
        code: "SYNTHETIC",
        name: "Synthetic attendance",
        startTime: "08:00",
        endTime: "12:00",
        managerId: manager.id,
      },
    });
    const outside = await prisma.class.create({
      data: {
        code: "OUTSIDE",
        name: "Synthetic outside",
        startTime: "08:00",
        endTime: "12:00",
        managerId: other.id,
      },
    });
    const input = {
      title: "Synthetic session",
      startsAt: "2026-10-17T08:00",
      endsAt: "2026-10-17T12:00",
      location: "Synthetic room",
    };
    for (const actor of [other, accountant, inactive])
      await assert.rejects(() =>
        saveClassSession(actor, course.id, null, input),
      );
    const session = await saveClassSession(manager, course.id, null, input);
    assert.equal(session.startsAt.toISOString(), "2026-10-17T01:00:00.000Z");
    for (const invalid of [
      { ...input, startsAt: "2026-02-30T08:00" },
      { ...input, endsAt: "2026-10-17T07:00" },
      { ...input, endsAt: "2026-10-19T08:00" },
    ])
      await assert.rejects(() =>
        saveClassSession(admin, course.id, null, invalid),
      );
    await assert.rejects(() => saveClassSession(admin, course.id, null, input));
    await assert.rejects(() =>
      saveClassSession(other, outside.id, session.id, input),
    );
    const reg = await prisma.registration.create({
      data: {
        classId: course.id,
        fullName: "Synthetic Student",
        cccd: "001234567890",
        phone: "0900000000",
        dob: new Date("1990-01-01"),
      },
    });
    const rejected = await prisma.registration.create({
      data: {
        classId: course.id,
        fullName: "Synthetic Rejected",
        cccd: "001234567891",
        phone: "0900000000",
        dob: new Date("1990-01-01"),
        status: "REJECTED",
      },
    });
    const cancelled = await prisma.registration.create({
      data: {
        classId: course.id,
        fullName: "Synthetic Cancelled",
        cccd: "001234567892",
        phone: "0900000000",
        dob: new Date("1990-01-01"),
        paymentStatus: "CANCELLED",
      },
    });
    const foreign = await prisma.registration.create({
      data: {
        classId: outside.id,
        fullName: "Synthetic Foreign",
        cccd: "001234567893",
        phone: "0900000000",
        dob: new Date("1990-01-01"),
      },
    });
    assert.equal(
      (
        await findAttendanceCandidates(
          manager,
          session.id,
          "001234567890",
          "QR",
        )
      )[0].id,
      reg.id,
    );
    assert.equal(
      await prisma.attendance.count(),
      0,
      "lookup must never record presence",
    );
    assert.equal(
      (
        await findAttendanceCandidates(
          manager,
          session.id,
          "Synthetic",
          "MANUAL",
        )
      ).length,
      1,
    );
    for (const actor of [other, accountant, inactive]) {
      await assert.rejects(() =>
        findAttendanceCandidates(actor, session.id, "Synthetic", "MANUAL"),
      );
      await assert.rejects(() =>
        recordAttendance(actor, session.id, reg.id, true, "MANUAL"),
      );
      await assert.rejects(() => setSessionClosed(actor, session.id, true));
    }
    for (const candidate of [rejected, cancelled, foreign])
      await assert.rejects(() =>
        recordAttendance(manager, session.id, candidate.id, true, "QR"),
      );
    const duplicate = await prisma.registration.create({
      data: {
        classId: course.id,
        fullName: "Synthetic duplicate",
        cccd: reg.cccd,
        phone: "0900000000",
        dob: new Date("1990-01-01"),
      },
    });
    await assert.rejects(
      () => findAttendanceCandidates(manager, session.id, reg.cccd!, "QR"),
      /nhiều hồ sơ/,
    );
    await prisma.registration.update({
      where: { id: duplicate.id },
      data: { status: "REJECTED" },
    });
    await Promise.all(
      Array.from({ length: 8 }, () =>
        recordAttendance(manager, session.id, reg.id, true, "QR"),
      ),
    );
    assert.equal(await prisma.attendance.count(), 1);
    assert.equal(
      await prisma.auditLog.count({ where: { action: "ATTENDANCE_CONFIRM" } }),
      1,
    );
    await setSessionClosed(manager, session.id, true);
    await assert.rejects(
      () => recordAttendance(manager, session.id, reg.id, false, "MANUAL"),
      /đã chốt/,
    );
    await assert.rejects(
      () =>
        findAttendanceCandidates(manager, session.id, "Synthetic", "MANUAL"),
      /đã chốt/,
    );
    await setSessionClosed(admin, session.id, false);
    await recordAttendance(manager, session.id, reg.id, false, "QR");
    assert.equal(
      await prisma.attendance.count({ where: { present: true } }),
      0,
    );
    assert.equal(
      await prisma.auditLog.count({ where: { action: "ATTENDANCE_WITHDRAW" } }),
      1,
    );
    await recordAttendance(manager, session.id, reg.id, true, "MANUAL");
    await prisma.registration.update({
      where: { id: reg.id },
      data: { classId: outside.id },
    });
    assert.equal(
      await prisma.attendance.count({
        where: { sessionId: session.id, present: true },
      }),
      1,
      "transfer must preserve original session attendance",
    );
    await assert.rejects(() =>
      recordAttendance(manager, session.id, reg.id, true, "QR"),
    );
    await recordAttendance(manager, session.id, reg.id, false, "MANUAL");
    await assert.rejects(() =>
      prisma!.registration.delete({ where: { id: reg.id } }),
    );
    await assert.rejects(() =>
      prisma!.classSession.delete({ where: { id: session.id } }),
    );
    await persistManagerAssignment(admin, course.id, other.id);
    await assert.rejects(() =>
      recordAttendance(manager, session.id, rejected.id, true, "MANUAL"),
    );
    await assert.rejects(() => setSessionClosed(manager, session.id, true));
    await setSessionClosed(other, session.id, true);
    await assert.rejects(() =>
      persistManagerAssignment(admin, course.id, accountant.id),
    );
    const account = {
      id: "",
      username: "synthetic-new-user",
      role: "CLASS_MANAGER" as const,
      active: true,
      password: "Synthetic-password-123",
    };
    await assert.rejects(() => persistUser(accountant, account));
    const created = await persistUser(admin, account);
    const saved = await prisma.user.findUniqueOrThrow({
      where: { id: created.id },
    });
    assert(await compare(account.password, saved.passwordHash));
    await assert.rejects(() => persistUser(admin, account), /đã được sử dụng/);
    await assert.rejects(() =>
      persistUser(admin, {
        ...account,
        username: "synthetic-long",
        password: "á".repeat(37),
      }),
    );
    await prisma.session.create({
      data: {
        tokenHash: "synthetic-session",
        userId: created.id,
        expiresAt: new Date(Date.now() + 100000),
      },
    });
    await persistUser(admin, {
      ...account,
      id: created.id,
      password: "",
      role: "ACCOUNTANT",
    });
    assert.equal(
      await prisma.session.count({ where: { userId: created.id } }),
      0,
    );
    await assert.rejects(() =>
      persistUser(admin, {
        ...account,
        id: admin.id,
        username: admin.username,
        password: "",
        active: false,
      }),
    );
    await assert.rejects(
      () =>
        persistUser(admin, {
          ...account,
          id: other.id,
          username: other.username,
          password: "",
          active: false,
        }),
      /phân công/,
    );
    const outcomes = await Promise.allSettled([
      persistUser(admin, {
        ...account,
        id: secondAdmin.id,
        username: secondAdmin.username,
        password: "",
        role: "ACCOUNTANT",
      }),
      persistUser(secondAdmin, {
        ...account,
        id: admin.id,
        username: admin.username,
        password: "",
        role: "ACCOUNTANT",
      }),
    ]);
    assert.equal(
      outcomes.filter((row) => row.status === "fulfilled").length,
      1,
    );
    assert.equal(
      await prisma.user.count({ where: { role: "ADMIN", active: true } }),
      1,
    );
    console.log(
      "PASS isolated migrations, strict QR parsing, role/class scope, UTC+7 validation, eligible roster, human confirmation separation, ambiguity, concurrent idempotence, close/reopen/undo, transfer history, restrictive deletion, account creation/reset/session revocation/assignments and concurrent admin safety",
    );
  } finally {
    await prisma?.$disconnect();
    assert.match(schema, /^ttcc_attendance_[a-f0-9]{32}$/);
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
