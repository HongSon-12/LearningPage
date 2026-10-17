"use server";
import { transferInTransaction } from "@/lib/transfers";
import { PaymentStatus, RegistrationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireUser, classScope, assertClassAccess, type Actor } from "@/lib/auth";
import { addRegistration, availableClass, occupiedWhere, errorMessage, rosterTransaction, type RegistrationInput } from "@/lib/admissions";
import type { Prisma } from "@prisma/client";
function refresh() {revalidatePath("/", "layout"); revalidatePath("/courses", "layout"); revalidatePath("/hocsocapcuu/courses"); revalidatePath("/hocsocapcuu");}
async function record(tx: Prisma.TransactionClient, id: string, user: Actor, action: string, details: Prisma.InputJsonValue) {
  await tx.registrationEvent.create({data: {registrationId: id, actorId: user.id, action, details}});
}
async function registrationFor(tx: Prisma.TransactionClient, id: string, user: Actor) {
  const reg = await tx.registration.findUnique({where: {id}, include: {class: true}});
  if (!reg) throw new Error("Không tìm thấy hồ sơ.");
  assertClassAccess(user, reg.class); return reg;
}
export async function getRegistrations(classId?: string) {
  try {
    const user = await requireUser();
    const data = await prisma.registration.findMany({where: {class: classScope(user), ...(classId ? {classId} : {})}, orderBy: {createdAt: "desc"},
      omit: {receiptTokenHash: true, requestKey: true}, include: {class: true, events: {orderBy: {createdAt: "desc"}}}});
    return {success: true, data};
  } catch(error) {return {success: false, error: errorMessage(error)};}
}
export async function createManualRegistration(data: RegistrationInput, method: "MANUAL"|"LATE") {
  try {
    const user = await requireUser(["ADMIN", "CLASS_MANAGER"]);
    if (!["MANUAL", "LATE"].includes(method)) throw new Error("Hình thức đăng ký không hợp lệ.");
    await rosterTransaction(async tx => {
      const course = await tx.class.findUniqueOrThrow({where: {id: data.classId}}); assertClassAccess(user, course);
      const reg = await addRegistration(tx, data, {method, actorId: user.id});
      await record(tx, reg.id, user, "CREATE", {method});
    }); refresh(); return {success: true};
  } catch(error) {return {success: false, error: errorMessage(error)};}
}
export async function transferRegistration(id: string, classId: string, reason: string) {
  try {
    const user = await requireUser(["ADMIN", "CLASS_MANAGER"]);
    if (!reason.trim()) throw new Error("Vui lòng nhập lý do chuyển lớp.");
    await rosterTransaction(tx => transferInTransaction(tx,user,id,classId,reason)); refresh(); return {success: true};
  } catch(error) {return {success: false, error: errorMessage(error)};}
}
export async function updatePaymentStatus(id: string, paymentStatus: PaymentStatus) {
  try {
    const user = await requireUser(["ADMIN", "ACCOUNTANT"]);
    if (!Object.values(PaymentStatus).includes(paymentStatus)) throw new Error("Trạng thái không hợp lệ.");
    await rosterTransaction(async tx => {
      const reg = await registrationFor(tx, id, user);
      if (reg.paymentStatus === "CANCELLED" && paymentStatus !== "CANCELLED" && reg.status !== "REJECTED") {
        await availableClass(tx, reg.classId, id, true);
        if(reg.cccd && await tx.registration.findFirst({where:{classId:reg.classId,cccd:reg.cccd,...occupiedWhere,id:{not:id}}}))throw new Error("Học viên đã có hồ sơ hoạt động trong lớp.");
      }
      await tx.registration.update({where: {id}, data: {paymentStatus}});
      await record(tx, id, user, "PAYMENT", {from: reg.paymentStatus, to: paymentStatus});
    }); refresh(); return {success: true};
  } catch(error) {return {success: false, error: errorMessage(error)};}
}
export async function updateRegistrationStatus(id: string, status: RegistrationStatus, rejectionReason = "") {
  try {
    const user = await requireUser(["ADMIN", "CLASS_MANAGER"]);
    if (!Object.values(RegistrationStatus).includes(status)) throw new Error("Trạng thái không hợp lệ.");
    if (status === "REJECTED" && !rejectionReason.trim()) throw new Error("Vui lòng nhập lý do từ chối.");
    await rosterTransaction(async tx => {
      const reg = await registrationFor(tx, id, user);
      if (reg.status === "REJECTED" && status !== "REJECTED" && reg.paymentStatus !== "CANCELLED") {
        await availableClass(tx, reg.classId, id, true);
        if(reg.cccd && await tx.registration.findFirst({where:{classId:reg.classId,cccd:reg.cccd,...occupiedWhere,id:{not:id}}}))throw new Error("Học viên đã có hồ sơ hoạt động trong lớp.");
      }
      await tx.registration.update({where: {id}, data: {status, rejectionReason: status === "REJECTED" ? rejectionReason.trim() : null}});
      await record(tx, id, user, "STATUS", {from: reg.status, to: status, reason: rejectionReason.trim()});
    }); refresh(); return {success: true};
  } catch(error) {return {success: false, error: errorMessage(error)};}
}
export async function deleteRegistration(id: string) {
  try {
    await requireUser(["ADMIN"]);
    await rosterTransaction(tx => tx.registration.delete({where: {id}})); refresh(); return {success: true};
  } catch(error) {return {success: false, error: errorMessage(error)};}
}
export async function updateRegistrationCodes(id: string, invoiceCode: string, certificateCode: string,
  confirmationNumber = "", certificateDeliveredDirect = false, certificateSentByPost = false) {
  try {
    const user = await requireUser();
    const reg = await prisma.registration.findUniqueOrThrow({where: {id}, include: {class: true}}); assertClassAccess(user, reg.class);
    if (user.role === "CLASS_MANAGER" && invoiceCode !== (reg.invoiceCode || "")) throw new Error("Chỉ Kế toán/Quản trị được sửa mã hóa đơn.");
    if (user.role === "ACCOUNTANT" && (certificateCode !== (reg.certificateCode || "") || confirmationNumber !== (reg.confirmationNumber || "") || certificateDeliveredDirect !== reg.certificateDeliveredDirect || certificateSentByPost !== reg.certificateSentByPost)) throw new Error("Kế toán chỉ được sửa thông tin hóa đơn.");
    await rosterTransaction(async tx => {
      await tx.registration.update({where: {id}, data: {
        ...(user.role !== "CLASS_MANAGER" ? {invoiceCode: invoiceCode.trim() || null} : {}),
        ...(user.role !== "ACCOUNTANT" ? {certificateCode: certificateCode.trim() || null, confirmationNumber: confirmationNumber.trim() || null, certificateDeliveredDirect, certificateSentByPost} : {})}});
      await record(tx, id, user, "DOCUMENTS", {invoiceCode, certificateCode, confirmationNumber, certificateDeliveredDirect, certificateSentByPost});
    });
    if (reg.email) {
      const mailer = await import("@/lib/mailer");
      if (invoiceCode && invoiceCode !== reg.invoiceCode) void mailer.sendInvoiceEmail(reg.email,reg.fullName,invoiceCode).catch(console.error);
      if (certificateCode && certificateCode !== reg.certificateCode) void mailer.sendCertificateEmail(reg.email,reg.fullName,certificateCode,(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001")+"/search").catch(console.error);
    }
    refresh(); return {success: true};
  } catch(error) {return {success: false, error: errorMessage(error)};}
}
