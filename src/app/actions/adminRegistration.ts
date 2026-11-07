"use server";
import { requirePermission } from "@/lib/auth";
import {RequestError} from "@/lib/errors";

import { invalidatePublicClasses } from "@/lib/public-classes";
import { assertPermission, can } from "@/lib/permissions";
import { transactionPermission, freshActor } from "@/lib/rbac";
import { transferInTransaction } from "@/lib/transfers";
import { PaymentStatus, RegistrationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import {
  requireUser,
  assertClassAccess,
  type Actor,
} from "@/lib/auth";
import {
  addRegistration,
  availableClass,
  lockClasses,
  occupiedWhere,
  errorMessage,
  rosterTransaction,
  type RegistrationInput,
} from "@/lib/admissions";
import type { Prisma } from "@prisma/client";
import { queryRegistrationPage } from "@/lib/registration-page";
import { registrationFilter } from "@/lib/registration-filter";
function refresh() {
  invalidatePublicClasses();
  revalidatePath("/", "layout");
  revalidatePath("/courses", "layout");
  revalidatePath("/hocsocapcuu/courses");
  revalidatePath("/hocsocapcuu");
}
async function record(
  tx: Prisma.TransactionClient,
  id: string,
  user: Actor,
  action: string,
  details: Prisma.InputJsonValue,
) {
  await tx.registrationEvent.create({
    data: { registrationId: id, actorId: user.id, action, details },
  });
}
async function registrationFor(
  tx: Prisma.TransactionClient,
  id: string,
  user: Actor,
) {
  const reg = await tx.registration.findUnique({
    where: { id },
    include: { class: true },
  });
  if (!reg) throw new RequestError("Không tìm thấy hồ sơ.");
  await lockClasses(tx, [reg.classId]);
  assertClassAccess(user, reg.class);
  return reg;
}
export async function getRegistrations(classId?: string) {
  try {
    const user = await requireUser();
    assertPermission(user, "registrations.view");
    const page=await queryRegistrationPage(user,{...registrationFilter,classId:classId || ""});
    return {success:true as const,data:page.items};
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
export async function createManualRegistration(
  data: RegistrationInput,
  method: "MANUAL" | "LATE",
) {
  try {
    let user = await requireUser();
    assertPermission(user, "registrations.create");
    if (!["MANUAL", "LATE"].includes(method))
      throw new RequestError("Hình thức đăng ký không hợp lệ.");
    await rosterTransaction(async (tx) => {
      user = await transactionPermission(tx, user, "registrations.create");
      const course = await tx.class.findUniqueOrThrow({
        where: { id: data.classId },
      });
      assertClassAccess(user, course);
      const reg = await addRegistration(tx, data, { method, actorId: user.id });
      await record(tx, reg.id, user, "CREATE", { method });
    });
    refresh();
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
export async function transferRegistration(
  id: string,
  classId: string,
  reason: string,
) {
  try {
    const user = await requireUser();
    assertPermission(user, "registrations.transfer");
    if (!reason.trim()) throw new RequestError("Vui lòng nhập lý do chuyển lớp.");
    await rosterTransaction(async (tx) => {
      const current = await transactionPermission(tx, user, "registrations.transfer");
      return transferInTransaction(tx, current, id, classId, reason);
    });
    refresh();
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
export async function updatePaymentStatus(
  id: string,
  paymentStatus: PaymentStatus,
) {
  try {
    let user = await requireUser();
    assertPermission(user, "payments.manage");
    if (!Object.values(PaymentStatus).includes(paymentStatus))
      throw new RequestError("Trạng thái không hợp lệ.");
    await rosterTransaction(async (tx) => {
      user = await transactionPermission(tx, user, "payments.manage");
      const reg = await registrationFor(tx, id, user);
      if (
        reg.paymentStatus === "CANCELLED" &&
        paymentStatus !== "CANCELLED" &&
        reg.status !== "REJECTED"
      ) {
        await availableClass(tx, reg.classId, id, true);
        if (
          reg.cccd &&
          (await tx.registration.findFirst({
            where: {
              classId: reg.classId,
              cccd: reg.cccd,
              ...occupiedWhere,
              id: { not: id },
            },
          }))
        )
          throw new RequestError("Học viên đã có hồ sơ hoạt động trong lớp.");
      }
      await tx.registration.update({ where: { id }, data: { paymentStatus } });
      await record(tx, id, user, "PAYMENT", {
        from: reg.paymentStatus,
        to: paymentStatus,
      });
    });
    refresh();
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
export async function updateRegistrationStatus(
  id: string,
  status: RegistrationStatus,
  rejectionReason = "",
) {
  try {
    let user = await requireUser();
    assertPermission(user, "registrations.review");
    if (!Object.values(RegistrationStatus).includes(status))
      throw new RequestError("Trạng thái không hợp lệ.");
    if (status === "REJECTED" && !rejectionReason.trim())
      throw new RequestError("Vui lòng nhập lý do từ chối.");
    await rosterTransaction(async (tx) => {
      user = await transactionPermission(tx, user, "registrations.review");
      const reg = await registrationFor(tx, id, user);
      if (
        reg.status === "REJECTED" &&
        status !== "REJECTED" &&
        reg.paymentStatus !== "CANCELLED"
      ) {
        await availableClass(tx, reg.classId, id, true);
        if (
          reg.cccd &&
          (await tx.registration.findFirst({
            where: {
              classId: reg.classId,
              cccd: reg.cccd,
              ...occupiedWhere,
              id: { not: id },
            },
          }))
        )
          throw new RequestError("Học viên đã có hồ sơ hoạt động trong lớp.");
      }
      await tx.registration.update({
        where: { id },
        data: {
          status,
          rejectionReason:
            status === "REJECTED" ? rejectionReason.trim() : null,
        },
      });
      await record(tx, id, user, "STATUS", {
        from: reg.status,
        to: status,
        reason: rejectionReason.trim(),
      });
    });
    refresh();
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
export async function deleteRegistration(id: string) {
  try {
    const actor = await requirePermission("registrations.delete");
    await rosterTransaction(async tx => {
      const current=await transactionPermission(tx,actor,"registrations.delete");
      await registrationFor(tx,id,current);
      await tx.registration.delete({where:{id}});
    });
    refresh();
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
export async function updateRegistrationCodes(
  id: string,
  invoiceCode: string,
  certificateCode: string,
  confirmationNumber = "",
  certificateDeliveredDirect = false,
  certificateSentByPost = false,
) {
  try {
    let user = await requireUser();
    if (!can(user, "invoices.manage") && !can(user, "certificates.manage")) throw new RequestError("Bạn không có quyền thực hiện thao tác này.");
    const reg = await prisma.registration.findUniqueOrThrow({
      where: { id },
      include: { class: true },
    });
    assertClassAccess(user, reg.class);
    await rosterTransaction(async (tx) => {
      user = await freshActor(user, tx);
      const currentReg = await registrationFor(tx, id, user);
      if (!can(user, "invoices.manage") && !can(user, "certificates.manage")) throw new RequestError("Bạn không có quyền thực hiện thao tác này.");
      if (!can(user, "invoices.manage") && invoiceCode !== (currentReg.invoiceCode || "")) throw new RequestError("Không có quyền sửa hóa đơn.");
      if (!can(user, "certificates.manage") && (certificateCode !== (currentReg.certificateCode || "") || confirmationNumber !== (currentReg.confirmationNumber || "") || certificateDeliveredDirect !== currentReg.certificateDeliveredDirect || certificateSentByPost !== currentReg.certificateSentByPost)) throw new RequestError("Không có quyền sửa chứng chỉ / giấy xác nhận.");

      await tx.registration.update({
        where: { id },
        data: {
          ...(can(user, "invoices.manage")
            ? { invoiceCode: invoiceCode.trim() || null }
            : {}),
          ...(can(user, "certificates.manage")
            ? {
                certificateCode: certificateCode.trim() || null,
                confirmationNumber: confirmationNumber.trim() || null,
                certificateDeliveredDirect,
                certificateSentByPost,
              }
            : {}),
        },
      });
      await record(tx, id, user, "DOCUMENTS", {
        invoiceCode,
        certificateCode,
        confirmationNumber,
        certificateDeliveredDirect,
        certificateSentByPost,
      });
    });
    if (reg.email) {
      const mailer = await import("@/lib/mailer");
      if (invoiceCode && invoiceCode !== reg.invoiceCode)
        void mailer
          .sendInvoiceEmail(reg.email, reg.fullName, invoiceCode)
          .catch(console.error);
      if (certificateCode && certificateCode !== reg.certificateCode)
        void mailer
          .sendCertificateEmail(
            reg.email,
            reg.fullName,
            certificateCode,
            (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001") +
              "/search",
          )
          .catch(console.error);
    }
    refresh();
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
