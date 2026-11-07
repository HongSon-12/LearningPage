import {RequestError} from "@/lib/errors";
import { canonicalCccd } from "@/lib/student-identity";
import { studentForRegistration, lockStudentIdentities } from "@/lib/students";
import { bindRegistrationFiles, fileIdFromUrl } from "@/lib/stored-files";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";
export const occupiedWhere: Prisma.RegistrationWhereInput = {
  status: { not: "REJECTED" },
  paymentStatus: { not: "CANCELLED" },
};
export const publicRegistrationSelect = {
  id: true,
  classId: true,
  fullName: true,
} satisfies Prisma.RegistrationSelect;
export const fullMessage =
  "Số lượng học viên đã đủ. Vui lòng kiểm tra lại hoặc chọn lớp khác.";
export {publicError as errorMessage} from "./errors";
// Administrative multi-record operations retain their existing serialization.
// Seat correctness also uses per-class locks, shared with the independent public reservation path.
// READ COMMITTED sees the winner's commit after waiting for the transaction-scoped lock.
export function rosterTransaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(1152026)`;
      return work(tx);
    },
    { isolationLevel: "ReadCommitted", timeout: 15000, maxWait: 15000 },
  );
}
// A class lock is shared by every seat/capacity writer. Sort multi-class locks to avoid transfer deadlocks.
export async function lockClasses(tx: Prisma.TransactionClient, classIds: string[]) {
  for (const id of [...new Set(classIds)].sort()) {
    const key = `ttcc:${process.env.DATABASE_SCHEMA || "public"}:class:${id}`;
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${key}))`;
  }
}
export async function availableClass(
  tx: Prisma.TransactionClient,
  classId: string,
  excludeId?: string,
  late = false,
) {
  await lockClasses(tx, [classId]);
  const course = await tx.class.findUnique({ where: { id: classId } });
  if (!course || course.status !== "OPEN")
    throw new RequestError("Lớp không mở đăng ký.");
  if (
    !late &&
    course.registrationDeadline &&
    course.registrationDeadline < new Date()
  )
    throw new RequestError("Đã hết hạn đăng ký.");
  const count = await tx.registration.count({
    where: {
      classId,
      ...occupiedWhere,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  if (count >= course.capacity) throw new RequestError(fullMessage);
  return course;
}
export type RegistrationInput = {
  classId: string;
  fullName: string;
  dob: Date;
  phone: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  email?: string;
  organization?: string;
  printOrgOnCert?: boolean;
  cccd?: string;
  workplace?: string;
  idPhotoUrl?: string;
  degreeUrl?: string;
  paymentReceiptUrl?: string;
  note?: string;
  sessionId?: string;
  source?: string;
};
export function registrationData(data: RegistrationInput) {
  for (const key of [
    "fullName",
    "phone",
    "email",
    "organization",
    "cccd",
    "workplace",
    "note",
    "sessionId",
    "source",
  ] as const) {
    const value = data[key];
    if (
      value &&
      (typeof value !== "string" ||
        value.length > (key === "note" ? 2000 : 250))
    )
      throw new RequestError("Thông tin nhập quá dài.");
  }
  if (
    !data.fullName?.trim() ||
    !/^\+?[0-9 .()-]{8,20}$/.test(data.phone?.trim() || "")
  )
    throw new RequestError("Kiểm tra lại họ tên và số điện thoại.");
  const dob = new Date(data.dob);
  if (isNaN(dob.getTime()) || dob > new Date() || dob.getFullYear() < 1900)
    throw new RequestError("Ngày sinh không hợp lệ.");
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    throw new RequestError("Email không hợp lệ.");
  if (data.gender && !["MALE", "FEMALE", "OTHER"].includes(data.gender))
    throw new RequestError("Giới tính không hợp lệ.");
  for (const url of [data.idPhotoUrl, data.degreeUrl, data.paymentReceiptUrl]) {
    if (url) fileIdFromUrl(url);
  }
  return {
    classId: data.classId,
    fullName: data.fullName.trim(),
    dob,
    phone: data.phone.trim(),
    gender: data.gender,
    email: data.email?.trim().toLowerCase() || null,
    organization: data.organization?.trim() || null,
    printOrgOnCert: data.printOrgOnCert === true,
    cccd: canonicalCccd(data.cccd) || data.cccd?.trim() || null,
    workplace: data.workplace?.trim() || null,
    idPhotoUrl: data.idPhotoUrl || null,
    degreeUrl: data.degreeUrl || null,
    paymentReceiptUrl: data.paymentReceiptUrl || null,
    note: data.note?.trim() || null,
    sessionId: data.sessionId || null,
    source: data.source || null,
  };
}
export function validateProgram(
  data: ReturnType<typeof registrationData>,
  courseType: string,
) {
  if (!data.cccd) throw new RequestError("Vui lòng cung cấp số CCCD.");
  if (
    courseType !== "COMMUNITY_FIRST_AID" &&
    (!data.workplace || !data.idPhotoUrl || !data.degreeUrl)
  ) {
    throw new RequestError(
      "Chương trình này yêu cầu đơn vị công tác, ảnh CCCD và bằng chuyên môn/bằng lái xe.",
    );
  }
}
export async function preventDuplicate(
  tx: Prisma.TransactionClient,
  data: ReturnType<typeof registrationData>,
  excludeId?: string,
) {
  await lockClasses(tx, [data.classId]);
  const cccd = canonicalCccd(data.cccd);
  await lockStudentIdentities(tx,[cccd]);
  const student = cccd
    ? await tx.student.findUnique({ where: { cccd }, select: { id: true } })
    : null;
  if (
    data.cccd &&
    (await tx.registration.findFirst({
      where: {
        classId: data.classId,
        OR: [
          { cccd: data.cccd },
          ...(student ? [{ studentId: student.id }] : []),
        ],
        ...occupiedWhere,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    }))
  )
    throw new RequestError("Học viên đã có hồ sơ trong lớp này.");
}
export async function addRegistration(
  tx: Prisma.TransactionClient,
  input: RegistrationInput,
  options: {
    method?: "ONLINE" | "MANUAL" | "LATE";
    actorId?: string;
    requestKey?: string;
    receiptTokenHash?: string;
  } = {},
) {
  const data = registrationData(input);
  const course = await availableClass(
    tx,
    data.classId,
    undefined,
    options.method === "LATE",
  );
  validateProgram(data, course.courseType);
  await preventDuplicate(tx, data);
  const student = await studentForRegistration(tx, data);
  const registration = await tx.registration.create({
    data: {
      ...data,
      ...student,
      registrationMethod: options.method || "ONLINE",
      createdById: options.actorId,
      requestKey: options.requestKey,
      receiptTokenHash: options.receiptTokenHash,
    },
  });
  const files = await bindRegistrationFiles(
    tx,
    registration.id,
    registration.classId,
    data,
    options,
  );
  return tx.registration.update({
    where: { id: registration.id },
    data: files,
  });
}

export async function reserveOnline(
  input: RegistrationInput & { requestKey: string; receiptToken: string },
) {
  if (
    !input || typeof input !== "object" || typeof input.classId !== "string" || !/^[a-f0-9-]{36}$/.test(input.classId) ||
    typeof input.requestKey !== "string" || typeof input.receiptToken !== "string" ||
    !/^[a-f0-9-]{36}$/.test(input.requestKey) ||
    !/^[a-f0-9-]{72}$/.test(input.receiptToken)
  )
    throw new RequestError("Phiên đăng ký không hợp lệ.");
  const receiptTokenHash = createHash("sha256")
    .update(input.receiptToken)
    .digest("hex");
  // Retried requests serialize independently of the selected class, including a changed classId.
  // Do not take the administrative global lock: unrelated classes can reserve seats concurrently.
  return prisma.$transaction(async (tx) => {
    const key = `ttcc:${process.env.DATABASE_SCHEMA || "public"}:request:${input.requestKey}`;
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${key}))`;
    await lockClasses(tx, [input.classId]);
    const existing = await tx.registration.findUnique({
      where: { requestKey: input.requestKey },
    });
    if (existing) {
      if (existing.receiptTokenHash !== receiptTokenHash || existing.classId !== input.classId)
        throw new RequestError("Phiên đăng ký không hợp lệ.");
      return { registration: existing, created: false };
    }
    const registration = await addRegistration(tx, input, {
      requestKey: input.requestKey,
      receiptTokenHash,
    });
    return { registration, created: true };
  }, { isolationLevel: "ReadCommitted", timeout: 15000, maxWait: 15000 });
}
