import type { Prisma } from "@prisma/client";
import { canonicalCccd } from "@/lib/student-identity";
import type { Actor } from "@/lib/permissions";
import { classScope } from "@/lib/permissions";
export function studentScope(actor: Actor): Prisma.StudentWhereInput {
  return actor.role !== "ADMIN"
    ? { registrations: { some: { class: classScope(actor) } } }
    : {};
}
export async function studentForRegistration(
  tx: Prisma.TransactionClient,
  data: {
    cccd: string | null;
    fullName: string;
    dob: Date;
    phone: string;
    email: string | null;
  },
  previousStudentId?: string | null,
) {
  const cccd = canonicalCccd(data.cccd);
  if (previousStudentId) {
    const previous = await tx.student.findUnique({
      where: { id: previousStudentId },
    });
    if (previous?.cccd && previous.cccd !== cccd)
      throw new Error(
        "Sửa CCCD tại hồ sơ học viên sau khi đối chiếu; không đổi định danh qua Excel.",
      );
  }
  const existing = cccd
    ? await tx.student.findUnique({ where: { cccd } })
    : previousStudentId
      ? await tx.student.findUnique({ where: { id: previousStudentId } })
      : null;
  if (existing) {
    // Registration fields are snapshots. Public registration/import never changes the canonical identity or lookup email.
    const differs =
      existing.fullName.trim().toLocaleLowerCase("vi") !==
        data.fullName.trim().toLocaleLowerCase("vi") ||
      existing.dob.toISOString().slice(0, 10) !==
        data.dob.toISOString().slice(0, 10) ||
      existing.phone !== data.phone ||
      (existing.email?.trim().toLowerCase() || null) !==
        (data.email?.trim().toLowerCase() || null);
    return {
      studentId: existing.id,
      profileReviewRequired: existing.needsReview || differs,
    };
  }
  const student = await tx.student.create({
    data: {
      cccd,
      fullName: data.fullName,
      dob: data.dob,
      phone: data.phone,
      email: data.email,
      needsReview: !cccd || !data.email,
    },
  });
  return { studentId: student.id, profileReviewRequired: student.needsReview };
}
