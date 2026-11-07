"use server";
import {RequestError} from "@/lib/errors";

import { invalidatePublicClasses } from "@/lib/public-classes";
import { assignManagerInTransaction } from "@/lib/user-management";
import { transactionPermission } from "@/lib/rbac";
import { assertPermission, can } from "@/lib/permissions";

import { requireUser, requirePermission, classScope, assertClassAccess } from "@/lib/auth";
import { occupiedWhere, rosterTransaction, errorMessage, lockClasses } from "@/lib/admissions";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { CertificateType, ClassStatus, CourseType, TargetAudience } from "@prisma/client";

export async function getClasses() {
  try {
    const actor = await requireUser();
    assertPermission(actor, "classes.view");
    const classes = await prisma.class.findMany({
      where: classScope(actor),
      orderBy: { startDate: "asc" },
      include: {
        manager: { select: { id: true, username: true } },
        _count: {
          select: {
            sessions: true,
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
    const actor = await requirePermission("classes.create");
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
    if (!Number.isInteger(capacity) || capacity < 1 || !Number.isFinite(fee) || fee < 0) throw new RequestError("Sĩ số/học phí không hợp lệ.");

    await rosterTransaction(async tx => {
    const current = await transactionPermission(tx, actor, "classes.create");
    const course = await tx.class.create({
      data: {
        managerId:can(current,"classes.all") ? null : current.id,
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

    if (formData.has("managerId")) await assignManagerInTransaction(tx, current, course.id, String(formData.get("managerId") || ""));
    });
    invalidatePublicClasses();
    revalidatePath("/courses", "layout"); revalidatePath("/hocsocapcuu/courses");
    return { success: true };
  } catch (error) {
    console.error("Lỗi tạo lớp học:", error);
    return { success: false, error: errorMessage(error) };
  }
}

export async function deleteClass(id: string) {
  try {
    const actor = await requirePermission("classes.delete");
    await rosterTransaction(async tx => {
      const current = await transactionPermission(tx,actor,"classes.delete");
      const course = await tx.class.findUniqueOrThrow({where:{id}});
      assertClassAccess(current,course);
      await tx.class.delete({where:{id}});
    });
    invalidatePublicClasses();
    revalidatePath("/courses", "layout"); revalidatePath("/hocsocapcuu/courses");
    return { success: true };
  } catch (error) {
    console.error("Lỗi xóa lớp học:", error);
    return { success: false, error: "Không thể xóa lớp học này vì đã có học viên đăng ký." };
  }
}

export async function updateClass(id: string, formData: FormData) {
  try {
    const actor = await requirePermission("classes.edit");
    assertPermission(actor, "classes.edit");
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
    if (!Number.isInteger(capacity) || capacity < 1 || !Number.isFinite(fee) || fee < 0) throw new RequestError("Sĩ số/học phí không hợp lệ.");
    const status = formData.get("status") as ClassStatus || "OPEN";

    await rosterTransaction(async tx => {
    await lockClasses(tx, [id]);
    const current = await transactionPermission(tx, actor, "classes.edit");
    const currentClass = await tx.class.findUniqueOrThrow({where: {id}});
    assertClassAccess(current, currentClass);
    if (formData.has("managerId")) await assignManagerInTransaction(tx, current, id, String(formData.get("managerId") || ""));
    const count = await tx.registration.count({where: {classId: id, ...occupiedWhere}});
    if (count > 0 && courseType !== currentClass.courseType) throw new RequestError("Không đổi chương trình khi lớp đã có học viên.");
    if (capacity < count) throw new RequestError("Sức chứa không thể nhỏ hơn số học viên đang ghi nhận.");
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
    invalidatePublicClasses();
    revalidatePath("/courses", "layout"); revalidatePath("/hocsocapcuu/courses");
    invalidatePublicClasses();
    revalidatePath("/courses", "layout"); revalidatePath("/hocsocapcuu/courses");
    return { success: true };
  } catch (error) {
    console.error("Lỗi cập nhật lớp học:", error);
    return { success: false, error: errorMessage(error) };
  }
}
