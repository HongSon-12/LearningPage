"use server";
import { requireUser } from "@/lib/auth";
import {
  registrationData,
  rosterTransaction,
  errorMessage,
} from "@/lib/admissions";
import { canonicalCccd } from "@/lib/student-identity";
import { revalidatePath } from "next/cache";
export async function confirmStudentProfile(id: string, form: FormData) {
  try {
    const actor = await requireUser(["ADMIN"]);
    if (form.get("confirmed") !== "on")
      throw new Error("Cần xác nhận đã đối chiếu thông tin với học viên.");
    const cccd = canonicalCccd(String(form.get("cccd") || ""));
    if (!cccd) throw new Error("CCCD phải gồm 12 chữ số.");
    const data = registrationData({
      classId: "profile",
      fullName: String(form.get("fullName") || ""),
      dob: new Date(String(form.get("dob") || "")),
      phone: String(form.get("phone") || ""),
      email: String(form.get("email") || ""),
      cccd,
    });
    await rosterTransaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${"student-lookup:" + id}))`;
      const student = await tx.student.findUniqueOrThrow({ where: { id } });
      const duplicate = await tx.student.findUnique({ where: { cccd } });
      if (duplicate && duplicate.id !== id)
        throw new Error(
          "CCCD đã thuộc một hồ sơ học viên khác. Cần đối chiếu trước khi gộp hồ sơ.",
        );
      await tx.student.update({
        where: { id },
        data: {
          cccd,
          fullName: data.fullName,
          dob: data.dob,
          phone: data.phone,
          email: data.email,
          needsReview: !data.email,
        },
      });
      await tx.registration.updateMany({
        where: { studentId: id },
        data: { cccd, profileReviewRequired: false },
      });
      await tx.lookupChallenge.updateMany({
        where: { studentId: id, usedAt: null },
        data: { usedAt: new Date(), codeHash: null },
      });
      await tx.emailOutbox.updateMany({
        where: {
          studentId: id,
          type: "SEARCH_OTP",
          status: { in: ["PENDING", "SENDING"] },
        },
        data: { status: "CANCELLED", leaseId: null, leaseUntil: null },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "STUDENT_PROFILE_CONFIRMED",
          resourceId: student.id,
          result: "ALLOWED",
        },
      });
    });
    revalidatePath("/students");
    revalidatePath(`/students/${id}`);
    revalidatePath("/courses", "layout");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
