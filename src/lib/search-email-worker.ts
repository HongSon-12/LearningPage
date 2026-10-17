import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import {
  codeDigest,
  newLookupCode,
  otpDigest,
  OTP_LIFETIME_MS,
  profileLookupReady,
} from "@/lib/lookup-otp";
import { sendSecurityEmail } from "@/lib/mailer";
export type SecuritySender = (
  to: string,
  subject: string,
  html: string,
) => Promise<void>;
export async function runSearchEmailBatch(
  send: SecuritySender = sendSecurityEmail,
  batchSize = 10,
  onlyJobId?: string,
) {
  // Validate runtime secret before claiming any work; no URL is required for an OTP email.
  otpDigest("configuration-check");
  let sent = 0,
    failed = 0;
  for (let index = 0; index < Math.min(batchSize, 50); index++) {
    const now = new Date();
    const eligible = {
      ...(onlyJobId ? { id: onlyJobId } : {}),
      type: "SEARCH_OTP",
      challengeId: { not: null },
      studentId: { not: null },
      attemptCount: { lt: 5 },
      OR: [
        { status: "PENDING", nextAttemptAt: { lte: now } },
        { status: "SENDING", leaseUntil: { lt: now } },
      ],
    };
    const job = await prisma.emailOutbox.findFirst({
      where: eligible,
      orderBy: { createdAt: "asc" },
    });
    if (!job) break;
    const leaseId = randomUUID();
    const claim = await prisma.emailOutbox.updateMany({
      where: { ...eligible, id: job.id, attemptCount: job.attemptCount },
      data: {
        status: "SENDING",
        leaseId,
        leaseUntil: new Date(Date.now() + 180000),
        attemptCount: { increment: 1 },
      },
    });
    if (!claim.count) continue;
    const code = newLookupCode();
    const hash = codeDigest(job.challengeId!, code);
    try {
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${"student-lookup:" + job.studentId!}))`;
        const current = await tx.emailOutbox.findFirst({
          where: { id: job.id, leaseId, status: "SENDING" },
          include: { student: true, challenge: true },
        });
        if (
          !current?.student ||
          !current.challenge ||
          current.challenge.usedAt ||
          !profileLookupReady(current.student) ||
          current.student.email?.toLowerCase() !==
            job.recipient.toLowerCase() ||
          otpDigest(`identity:${current.student.cccd}`) !==
            current.challenge.identityHash ||
          otpDigest(`email:${current.student.email!.trim().toLowerCase()}`) !==
            current.challenge.emailHash
        )
          throw new Error("LOOKUP_INVALIDATED");
        await tx.lookupChallenge.update({
          where: { id: job.challengeId! },
          data: {
            codeHash: hash,
            expiresAt: new Date(Date.now() + OTP_LIFETIME_MS),
          },
        });
      });
      await send(
        job.recipient,
        "Mã xác thực hồ sơ học viên TTCC115",
        `<p>Mã xác thực hồ sơ học viên của bạn:</p><p style="font-size:28px;letter-spacing:6px"><strong>${code}</strong></p><p>Mã có hiệu lực 10 phút, chỉ dùng một lần. Nhập mã tại trang Tra cứu hoặc Đăng ký học mà bạn đang sử dụng, không chia sẻ mã với người khác. Nếu không yêu cầu, bạn có thể bỏ qua email này.</p>`,
      );
      await prisma.emailOutbox.updateMany({
        where: { id: job.id, leaseId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          leaseId: null,
          leaseUntil: null,
          lastErrorCode: null,
        },
      });
      sent++;
    } catch {
      await prisma.lookupChallenge.updateMany({
        where: { id: job.challengeId!, codeHash: hash },
        data: { codeHash: null, expiresAt: null },
      });
      await prisma.emailOutbox.updateMany({
        where: { id: job.id, leaseId },
        data: {
          status: job.attemptCount + 1 >= 5 ? "FAILED" : "PENDING",
          nextAttemptAt: new Date(Date.now() + 60000 * 2 ** job.attemptCount),
          leaseId: null,
          leaseUntil: null,
          lastErrorCode: "SEND_FAILED",
        },
      });
      failed++;
    }
  }
  await prisma.emailOutbox.updateMany({
    where: {
      ...(onlyJobId ? { id: onlyJobId } : {}),
      type: "SEARCH_OTP",
      status: "SENDING",
      attemptCount: { gte: 5 },
      leaseUntil: { lt: new Date() },
    },
    data: {
      status: "FAILED",
      leaseId: null,
      leaseUntil: null,
      lastErrorCode: "LEASE_EXPIRED",
    },
  });
  return { sent, failed };
}
export async function sendClaimedSearchJob(
  jobId: string,
  send: SecuritySender,
) {
  return runSearchEmailBatch(send, 1, jobId);
}
