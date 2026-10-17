import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";
export const occupiedWhere: Prisma.RegistrationWhereInput = {status: {not: "REJECTED"}, paymentStatus: {not: "CANCELLED"}};
export const publicRegistrationSelect = {id: true, classId: true, fullName: true} satisfies Prisma.RegistrationSelect;
export const fullMessage = "Số lượng học viên đã đủ. Vui lòng kiểm tra lại hoặc chọn lớp khác.";
export function errorMessage(error: unknown) {return error instanceof Error ? error.message : "Lỗi cần kiểm tra lại. Vui lòng thử lại.";}
// All writers that change seats share this lock, including transfers, imports and reactivation.
// READ COMMITTED sees the winner's commit after waiting for the transaction-scoped lock.
export function rosterTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(1152026)`;
    return work(tx);
  }, {isolationLevel: "ReadCommitted", timeout: 15000, maxWait: 15000});
}
export async function availableClass(tx: Prisma.TransactionClient, classId: string, excludeId?: string, late = false) {
  const course = await tx.class.findUnique({where: {id: classId}});
  if (!course || course.status !== "OPEN") throw new Error("Lớp không mở đăng ký.");
  if (!late && course.registrationDeadline && course.registrationDeadline < new Date()) throw new Error("Đã hết hạn đăng ký.");
  const count = await tx.registration.count({where: {classId, ...occupiedWhere, ...(excludeId ? {id: {not: excludeId}} : {})}});
  if (count >= course.capacity) throw new Error(fullMessage);
  return course;
}
export type RegistrationInput = {
  classId: string; fullName: string; dob: Date; phone: string; gender?: "MALE" | "FEMALE" | "OTHER";
  email?: string; organization?: string; printOrgOnCert?: boolean; cccd?: string; workplace?: string;
  idPhotoUrl?: string; degreeUrl?: string; paymentReceiptUrl?: string; note?: string; sessionId?: string; source?: string;
};
export function registrationData(data: RegistrationInput) {
  if (!data.fullName?.trim() || !/^\+?[0-9 .()-]{8,20}$/.test(data.phone?.trim() || "")) throw new Error("Kiểm tra lại họ tên và số điện thoại.");
  const dob = new Date(data.dob);
  if (isNaN(dob.getTime()) || dob > new Date() || dob.getFullYear() < 1900) throw new Error("Ngày sinh không hợp lệ.");
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error("Email không hợp lệ.");
  if (data.gender && !["MALE", "FEMALE", "OTHER"].includes(data.gender)) throw new Error("Giới tính không hợp lệ.");
  for (const url of [data.idPhotoUrl, data.degreeUrl, data.paymentReceiptUrl]) {
    if (url && !/^\/uploads\/[a-zA-Z0-9-]+\.(png|jpg|jpeg|webp|pdf)$/i.test(url)) throw new Error("Đường dẫn hồ sơ không hợp lệ.");
  }
  return {classId: data.classId, fullName: data.fullName.trim(), dob, phone: data.phone.trim(), gender: data.gender,
    email: data.email?.trim() || null, organization: data.organization?.trim() || null,
    printOrgOnCert: data.printOrgOnCert === true, cccd: data.cccd?.trim() || null, workplace: data.workplace?.trim() || null,
    idPhotoUrl: data.idPhotoUrl || null, degreeUrl: data.degreeUrl || null, paymentReceiptUrl: data.paymentReceiptUrl || null,
    note: data.note?.trim() || null, sessionId: data.sessionId || null, source: data.source || null};
}
export function validateProgram(data: ReturnType<typeof registrationData>, courseType: string) {
  if (!data.cccd) throw new Error("Vui lòng cung cấp số CCCD.");
  if (courseType !== "COMMUNITY_FIRST_AID" && (!data.workplace || !data.idPhotoUrl || !data.degreeUrl)) {
    throw new Error("Chương trình này yêu cầu đơn vị công tác, ảnh CCCD và bằng chuyên môn/bằng lái xe.");
  }
}
export async function preventDuplicate(tx: Prisma.TransactionClient, data: ReturnType<typeof registrationData>, excludeId?: string) {
  if (data.cccd && await tx.registration.findFirst({where: {classId: data.classId, cccd: data.cccd, ...occupiedWhere, ...(excludeId ? {id: {not: excludeId}} : {})}})) throw new Error("Học viên đã có hồ sơ trong lớp này.");
}
export async function addRegistration(tx: Prisma.TransactionClient, input: RegistrationInput, options: {method?: "ONLINE"|"MANUAL"|"LATE"; actorId?: string; requestKey?: string; receiptTokenHash?: string} = {}) {
  const data = registrationData(input);
  const course = await availableClass(tx, data.classId, undefined, options.method === "LATE");
  validateProgram(data, course.courseType);
  await preventDuplicate(tx, data);
  return tx.registration.create({data: {...data, registrationMethod: options.method || "ONLINE", createdById: options.actorId,
    requestKey: options.requestKey, receiptTokenHash: options.receiptTokenHash}});
}

export async function reserveOnline(input: RegistrationInput & {requestKey:string;receiptToken:string}) {
 if(!/^[a-f0-9-]{36}$/.test(input.requestKey)||!/^[a-f0-9-]{72}$/.test(input.receiptToken))throw new Error("Phiên đăng ký không hợp lệ.");
 const receiptTokenHash=createHash("sha256").update(input.receiptToken).digest("hex");
 return rosterTransaction(async tx=>{
  const existing=await tx.registration.findUnique({where:{requestKey:input.requestKey}});
  if(existing){if(existing.receiptTokenHash!==receiptTokenHash)throw new Error("Phiên đăng ký không hợp lệ.");return {registration:existing,created:false};}
  const registration=await addRegistration(tx,input,{requestKey:input.requestKey,receiptTokenHash});
  return {registration,created:true};
 });
}
