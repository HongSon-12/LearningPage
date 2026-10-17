import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { occupiedWhere, rosterTransaction } from "@/lib/admissions";
import type { Actor } from "@/lib/permissions";
import { RequestError } from "@/lib/security";
import { sessionInput, type SessionInput } from "@/lib/session-input";

export async function attendanceActor(
  tx: Prisma.TransactionClient,
  actor: Actor,
) {
  const user = await tx.user.findUnique({
    where: { id: actor.id },
    select: { id: true, username: true, role: true, active: true },
  });
  if (!user?.active || !["ADMIN", "CLASS_MANAGER"].includes(user.role))
    throw new RequestError("Không có quyền điểm danh.", 403);
  return user;
}
export async function attendanceClass(
  tx: Prisma.TransactionClient,
  actor: Actor,
  classId: string,
) {
  const user = await attendanceActor(tx, actor);
  const course = await tx.class.findFirst({
    where: {
      id: classId,
      ...(user.role === "CLASS_MANAGER" ? { managerId: user.id } : {}),
    },
  });
  if (!course)
    throw new RequestError("Không tìm thấy lớp trong phạm vi quản lý.", 404);
  return course;
}
export async function attendanceSession(
  tx: Prisma.TransactionClient,
  actor: Actor,
  sessionId: string,
) {
  const session = await tx.classSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) throw new RequestError("Không tìm thấy buổi học.", 404);
  await attendanceClass(tx, actor, session.classId);
  return session;
}
export async function saveClassSession(
  actor: Actor,
  classId: string,
  id: string | null,
  input: SessionInput,
) {
  const result = sessionInput.safeParse(input);
  if (!result.success) throw new RequestError(result.error.issues[0].message);
  const { title, location, startsAt, endsAt } = result.data;
  return rosterTransaction(async (tx) => {
    await attendanceClass(tx, actor, classId);
    if (id) {
      const existing = await attendanceSession(tx, actor, id);
      if (existing.classId !== classId)
        throw new RequestError("Buổi học không thuộc lớp.", 404);
    }
    const data = {
      title,
      location,
      startsAt: new Date(startsAt + ":00+07:00"),
      endsAt: new Date(endsAt + ":00+07:00"),
    };
    const session = id
      ? await tx.classSession.update({ where: { id }, data })
      : await tx.classSession.create({
          data: { ...data, classId, createdById: actor.id },
        });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: id ? "SESSION_UPDATE" : "SESSION_CREATE",
        resourceId: session.id,
        result: "ALLOWED",
      },
    });
    return session;
  });
}
export async function setSessionClosed(
  actor: Actor,
  sessionId: string,
  closed: boolean,
) {
  if (typeof closed !== "boolean")
    throw new RequestError("Trạng thái không hợp lệ.");
  return rosterTransaction(async (tx) => {
    const session = await attendanceSession(tx, actor, sessionId);
    if (session.closed !== closed) {
      await tx.classSession.update({
        where: { id: sessionId },
        data: { closed },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: closed ? "SESSION_CLOSE" : "SESSION_REOPEN",
          resourceId: sessionId,
          result: "ALLOWED",
        },
      });
    }
    return session.classId;
  });
}
const candidateSelect = {
  id: true,
  fullName: true,
  dob: true,
  cccd: true,
  profileReviewRequired: true,
  status: true,
  paymentStatus: true,
  student: { select: { cccd: true } },
  idPhotoFile: { select: { id: true, mime: true } },
} satisfies Prisma.RegistrationSelect;
function candidate(
  row: Prisma.RegistrationGetPayload<{ select: typeof candidateSelect }>,
  sessionId: string,
) {
  return {
    id: row.id,
    fullName: row.fullName,
    dob: row.dob.toISOString().slice(0, 10),
    cccd: row.student?.cccd || row.cccd,
    needsReview:
      row.profileReviewRequired ||
      Boolean(row.student?.cccd && row.cccd && row.student.cccd !== row.cccd),
    status: row.status,
    paymentStatus: row.paymentStatus,
    previewUrl:
      row.idPhotoFile &&
      ["image/png", "image/jpeg", "image/webp"].includes(row.idPhotoFile.mime)
        ? `/api/attendance/${sessionId}/identity/${row.id}`
        : null,
    downloadUrl: row.idPhotoFile ? `/api/files/${row.idPhotoFile.id}` : null,
  };
}
export type AttendanceCandidate = ReturnType<typeof candidate>;
export async function findAttendanceCandidates(
  actor: Actor,
  sessionId: string,
  query: string,
  mode: "QR" | "MANUAL",
) {
  if (
    typeof query !== "string" ||
    query.trim().length < 2 ||
    query.length > 120 ||
    !["QR", "MANUAL"].includes(mode)
  )
    throw new RequestError("Nhập ít nhất 2 ký tự, tối đa 120 ký tự.");
  const text = query.trim();
  if (mode === "QR" && !/^\d{12}$/.test(text))
    throw new RequestError("Số căn cước trong QR không hợp lệ.");
  return prisma.$transaction(async (tx) => {
    const session = await attendanceSession(tx, actor, sessionId);
    if (session.closed) throw new RequestError("Buổi học đã chốt điểm danh.");
    const rows = await tx.registration.findMany({
      where: {
        classId: session.classId,
        ...occupiedWhere,
        OR:
          mode === "QR"
            ? [{ cccd: text }, { student: { cccd: text } }]
            : [
                { fullName: { contains: text, mode: "insensitive" } },
                { phone: { contains: text } },
                { cccd: { contains: text } },
                { student: { cccd: { contains: text } } },
              ],
      },
      select: candidateSelect,
      orderBy: [{ fullName: "asc" }, { id: "asc" }],
      take: mode === "QR" ? 2 : 20,
    });
    if (mode === "QR" && rows.length > 1)
      throw new RequestError(
        "Có nhiều hồ sơ trùng căn cước trong lớp. Hãy tìm thủ công và đối chiếu hồ sơ.",
      );
    if (
      mode === "QR" &&
      rows.some(
        (row) => row.student?.cccd && row.cccd && row.student.cccd !== row.cccd,
      )
    )
      throw new RequestError(
        "Căn cước trong hồ sơ và lần đăng ký chưa khớp. Hãy tìm thủ công và đối chiếu.",
      );
    return rows.map((row) => candidate(row, sessionId));
  });
}
export async function recordAttendance(
  actor: Actor,
  sessionId: string,
  registrationId: string,
  present: boolean,
  method: "QR" | "MANUAL",
) {
  if (typeof present !== "boolean" || !["QR", "MANUAL"].includes(method))
    throw new RequestError("Thông tin điểm danh không hợp lệ.");
  return rosterTransaction(async (tx) => {
    const session = await attendanceSession(tx, actor, sessionId);
    if (session.closed)
      throw new RequestError(
        "Buổi học đã chốt điểm danh. Cần mở lại trước khi sửa.",
      );
    const key = { sessionId_registrationId: { sessionId, registrationId } };
    const existing = await tx.attendance.findUnique({ where: key });
    const registration = await tx.registration.findFirst({
      where: { id: registrationId, classId: session.classId, ...occupiedWhere },
    });
    // A transferred/rejected learner's historic attendance is retained; staff may withdraw it in the original session.
    if (!registration && (present || !existing))
      throw new RequestError("Học viên không còn trong danh sách học của lớp.");
    if ((!existing && !present) || existing?.present === present)
      return session.classId;
    const data = {
      present,
      method,
      recordedById: actor.id,
      recordedAt: new Date(),
    };
    const saved = await tx.attendance.upsert({
      where: key,
      create: { sessionId, registrationId, ...data },
      update: data,
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: present ? "ATTENDANCE_CONFIRM" : "ATTENDANCE_WITHDRAW",
        resourceId: saved.id,
        result: "ALLOWED",
      },
    });
    return session.classId;
  });
}
