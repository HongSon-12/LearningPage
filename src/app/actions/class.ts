"use server";

import { requireUser, classScope, assertClassAccess } from "@/lib/auth";
import { occupiedWhere, rosterTransaction, errorMessage } from "@/lib/admissions";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { CertificateType, ClassStatus, CourseType, TargetAudience } from "@prisma/client";

export async function getClasses() {
  try {
    const actor = await requireUser();
    const classes = await prisma.class.findMany({
      where: classScope(actor),
      orderBy: { startDate: "asc" },
      include: {
        _count: {
          select: {
            registrations: {
              where: {
                ...occupiedWhere
              }
            }
          },
        },
      },
    });
    return { success: true, data: classes };
  } catch (error) {
    console.error("Lỗi lấy danh sách lớp:", error);
    return { success: false, error: "Không thể lấy danh sách lớp" };
  }
}

export async function createClass(formData: FormData) {
  try {
    await requireUser(["ADMIN"]);
    const code = formData.get("code") as string;
    const name = formData.get("name") as string;
    const courseType = formData.get("courseType") as CourseType || "COMMUNITY_FIRST_AID";
    const courseBatch = formData.get("courseBatch") as string || null;
    const fee = parseFloat(formData.get("fee") as string) || 0;
    const location = formData.get("location") as string || "";
    const startDate = new Date(formData.get("startDate") as string);
    const endDate = new Date(formData.get("endDate") as string || formData.get("startDate") as string);
    const registrationDeadlineStr = formData.get("registrationDeadline") as string;
    const registrationDeadline = registrationDeadlineStr ? new Date(registrationDeadlineStr) : null;
    const totalLessons = parseInt(formData.get("totalLessons") as string) || 0;
    const targetAudiences = formData.getAll("targetAudiences") as TargetAudience[];
    const certificateType = formData.get("certificateType") as CertificateType || "CERTIFICATE";

    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const capacity = Number(formData.get("capacity"));
    if (!Number.isInteger(capacity) || capacity < 1 || !Number.isFinite(fee) || fee < 0) throw new Error("Sĩ số/học phí không hợp lệ.");

    await prisma.class.create({
      data: {
        code,
        name,
        courseType,
        courseBatch,
        fee,
        location,
        startDate,
        endDate,
        registrationDeadline,
        totalLessons,
        targetAudiences,
        certificateType,
        startTime,
        endTime,
        capacity,
      },
    });

    revalidatePath("/courses", "layout"); revalidatePath("/hocsocapcuu/courses");
    return { success: true };
  } catch (error) {
    console.error("Lỗi tạo lớp học:", error);
    return { success: false, error: errorMessage(error) };
  }
}

export async function deleteClass(id: string) {
  try {
    await requireUser(["ADMIN"]);
    // Kiem tra xem co the xoa khong, Prisma se bao loi neu co khoa ngoai
    await prisma.class.delete({
      where: { id },
    });
    revalidatePath("/courses", "layout"); revalidatePath("/hocsocapcuu/courses");
    return { success: true };
  } catch (error) {
    console.error("Lỗi xóa lớp học:", error);
    return { success: false, error: "Không thể xóa lớp học này vì đã có học viên đăng ký." };
  }
}

export async function updateClass(id: string, formData: FormData) {
  try {
    const actor = await requireUser(["ADMIN", "CLASS_MANAGER"]);
    const existing = await prisma.class.findUniqueOrThrow({where: {id}});
    assertClassAccess(actor, existing);
    const code = formData.get("code") as string;
    const name = formData.get("name") as string;
    const courseType = formData.get("courseType") as CourseType || "COMMUNITY_FIRST_AID";
    const courseBatch = formData.get("courseBatch") as string || null;
    const fee = parseFloat(formData.get("fee") as string) || 0;
    const location = formData.get("location") as string || "";
    const startDate = new Date(formData.get("startDate") as string);
    const endDate = new Date(formData.get("endDate") as string || formData.get("startDate") as string);
    const registrationDeadlineStr = formData.get("registrationDeadline") as string;
    const registrationDeadline = registrationDeadlineStr ? new Date(registrationDeadlineStr) : null;
    const totalLessons = parseInt(formData.get("totalLessons") as string) || 0;
    const targetAudiences = formData.getAll("targetAudiences") as TargetAudience[];
    const certificateType = formData.get("certificateType") as CertificateType || "CERTIFICATE";

    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const capacity = Number(formData.get("capacity"));
    if (!Number.isInteger(capacity) || capacity < 1 || !Number.isFinite(fee) || fee < 0) throw new Error("Sĩ số/học phí không hợp lệ.");
    const status = formData.get("status") as ClassStatus || "OPEN";

    await rosterTransaction(async tx => {
    const count = await tx.registration.count({where: {classId: id, ...occupiedWhere}});
    if (count > 0 && courseType !== existing.courseType) throw new Error("Không đổi chương trình khi lớp đã có học viên.");
    if (capacity < count) throw new Error("Sức chứa không thể nhỏ hơn số học viên đang ghi nhận.");
    await tx.class.update({
      where: { id },
      data: {
        code,
        name,
        courseType,
        courseBatch,
        fee,
        location,
        startDate,
        endDate,
        registrationDeadline,
        totalLessons,
        targetAudiences,
        certificateType,
        startTime,
        endTime,
        capacity,
        status,
      },
    });

    });
    revalidatePath("/courses", "layout"); revalidatePath("/hocsocapcuu/courses");
    revalidatePath("/courses", "layout"); revalidatePath("/hocsocapcuu/courses");
    return { success: true };
  } catch (error) {
    console.error("Lỗi cập nhật lớp học:", error);
    return { success: false, error: errorMessage(error) };
  }
}
