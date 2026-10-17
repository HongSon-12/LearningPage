import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import type { Prisma, Student } from "@prisma/client";
import prisma from "@/lib/prisma";
import { rateLimit, audit, RequestError } from "@/lib/security";
import { canonicalCccd } from "@/lib/student-identity";
import {
  otpDigest,
  matchesCode,
  profileLookupReady,
  OTP_MAX_ATTEMPTS,
} from "@/lib/lookup-otp";
export const lookupMessage =
  "Nếu hồ sơ học viên có email đã đăng ký hợp lệ, mã xác thực sẽ được gửi đến email đó. Kiểm tra cả thư mục thư rác. Nếu không nhận được mã hoặc đã đổi email, vui lòng liên hệ trung tâm.";
const invalidCode =
  "Mã xác thực không đúng, đã dùng hoặc hết hạn. Vui lòng kiểm tra email hoặc yêu cầu mã mới.";
export async function requestLookup(cccdInput: string, identity: string) {
  await rateLimit("lookup-otp-request", identity, 10, 15 * 60 * 1000);
  const start = Date.now();
  const challengeId = randomUUID();
  const cccd = canonicalCccd(cccdInput.slice(0, 32));
  const identityHash = otpDigest(`identity:${cccd || cccdInput.slice(0, 32)}`);
  try {
    // Apply the same cooldown/target limits to unknown IDs, too: no existence signal.
    await rateLimit("lookup-otp-target", identityHash, 3, 60 * 60 * 1000);
    await rateLimit("lookup-otp-cooldown", identityHash, 1, 60 * 1000);
    const student = cccd
      ? await prisma.student.findUnique({ where: { cccd } })
      : null;
    if (student && profileLookupReady(student)) {
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${"student-lookup:" + student.id}))`;
        const current = await tx.student.findUniqueOrThrow({
          where: { id: student.id },
        });
        if (!profileLookupReady(current) || current.cccd !== cccd) return;
        await tx.lookupChallenge.updateMany({
          where: { studentId: current.id, usedAt: null },
          data: { usedAt: new Date(), codeHash: null },
        });
        await tx.emailOutbox.updateMany({
          where: {
            studentId: current.id,
            type: "SEARCH_OTP",
            status: { in: ["PENDING", "SENDING"] },
          },
          data: { status: "CANCELLED", leaseId: null, leaseUntil: null },
        });
        await tx.lookupChallenge.create({
          data: {
            id: challengeId,
            studentId: current.id,
            identityHash,
            emailHash: otpDigest(
              `email:${current.email!.trim().toLowerCase()}`,
            ),
          },
        });
        await tx.emailOutbox.create({
          data: {
            type: "SEARCH_OTP",
            studentId: current.id,
            challengeId,
            recipient: current.email!,
            idempotencyKey: `SEARCH_OTP:${challengeId}`,
          },
        });
      });
    }
    await audit("LOOKUP_REQUEST", "ACCEPTED");
    return { challengeId, message: lookupMessage };
  } finally {
    await setTimeout(Math.max(0, 300 - (Date.now() - start)));
  }
}
async function redeemLookupData<T>(
  challengeId: string,
  code: string,
  identity: string,
  resolve: (tx: Prisma.TransactionClient, student: Student) => Promise<T>,
  expectedCccd?: string,
) {
  await rateLimit("lookup-otp-verify", identity, 20, 15 * 60 * 1000);
  if (!/^[a-f0-9-]{36}$/.test(challengeId)) throw new RequestError(invalidCode);
  const result = await prisma.$transaction(async (tx) => {
    const initial = await tx.lookupChallenge.findUnique({
      where: { id: challengeId },
      select: { studentId: true },
    });
    if (!initial) return null;
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${"student-lookup:" + initial.studentId}))`;
    const challenge = await tx.lookupChallenge.findUniqueOrThrow({
      where: { id: challengeId },
      include: { student: true },
    });
    const student = challenge.student;
    if (
      challenge.usedAt ||
      !challenge.expiresAt ||
      challenge.expiresAt <= new Date() ||
      challenge.failedAttempts >= OTP_MAX_ATTEMPTS ||
      !challenge.codeHash ||
      !profileLookupReady(student) ||
      (expectedCccd !== undefined && student.cccd !== expectedCccd) ||
      otpDigest(`identity:${student.cccd}`) !== challenge.identityHash ||
      otpDigest(`email:${student.email!.trim().toLowerCase()}`) !==
        challenge.emailHash
    )
      return null;
    if (!matchesCode(challengeId, code, challenge.codeHash)) {
      const attempts = challenge.failedAttempts + 1;
      await tx.lookupChallenge.update({
        where: { id: challengeId },
        data: {
          failedAttempts: attempts,
          ...(attempts >= OTP_MAX_ATTEMPTS
            ? { usedAt: new Date(), codeHash: null }
            : {}),
        },
      });
      return null;
    }
    await tx.lookupChallenge.update({
      where: { id: challengeId },
      data: { usedAt: new Date(), codeHash: null },
    });
    return resolve(tx, student);
  });
  await audit("LOOKUP_VERIFY", result ? "ALLOWED" : "DENIED");
  if (!result) throw new RequestError(invalidCode);
  return result;
}

export async function redeemLookup(challengeId: string, code: string, identity: string) {
  return redeemLookupData(challengeId, code, identity, async (tx, student) => {
    const historyWhere = {
      studentId: student.id,
      profileReviewRequired: false,
    };
    const [rows, total] = await Promise.all([
      tx.registration.findMany({
        where: historyWhere,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        take: 100,
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          invoiceCode: true,
          certificateCode: true,
          confirmationNumber: true,
          createdAt: true,
          class: {
            select: {
              name: true,
              code: true,
              startDate: true,
              endDate: true,
              status: true,
              certificateType: true,
            },
          },
        },
      }),
      tx.registration.count({ where: historyWhere }),
    ]);
    const fullName = student.fullName
      .trim()
      .split(/\s+/)
      .map((word) => `${Array.from(word)[0]}.`)
      .join(" ");
    return {
      fullName,
      total,
      history: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        class: {
          ...row.class,
          startDate: row.class.startDate.toISOString(),
          endDate: row.class.endDate.toISOString(),
        },
      })),
    };
  });
}

// Full profile details are released only after the same single-use email OTP check.
// Documents, notes and administrative fields never enter this DTO.
export async function redeemRegistrationProfile(
  challengeId: string, code: string, cccdInput: string, identity: string,
) {
  const cccd = canonicalCccd(cccdInput);
  if (!cccd) throw new RequestError(invalidCode);
  return redeemLookupData(challengeId, code, identity, async (tx, student) => {
    const latest = await tx.registration.findFirst({
      where: { studentId: student.id, cccd: student.cccd, profileReviewRequired: false },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      select: { gender: true, organization: true, workplace: true },
    });
    return {
      fullName: student.fullName,
      dob: student.dob.toISOString().slice(0, 10),
      cccd: student.cccd!,
      phone: student.phone,
      email: student.email!,
      gender: latest?.gender ?? ("" as const),
      organization: latest?.organization ?? "",
      workplace: latest?.workplace ?? "",
      returning: Boolean(latest),
    };
  }, cccd);
}
