import type { Prisma } from "@prisma/client";
import { assertClassAccess, type Actor } from "@/lib/permissions";
import { availableClass, registrationData, preventDuplicate, validateProgram } from "@/lib/admissions";
export async function transferInTransaction(tx: Prisma.TransactionClient, user: Actor, id: string, classId: string, reason: string) {
 if (!["ADMIN","CLASS_MANAGER"].includes(user.role)) throw new Error("Bạn không có quyền chuyển lớp.");
 if (!reason.trim()) throw new Error("Vui lòng nhập lý do chuyển lớp.");

      const reg = await tx.registration.findUniqueOrThrow({where:{id},include:{class:true}}); assertClassAccess(user,reg.class);
      if (reg.classId === classId) throw new Error("Vui lòng chọn lớp khác.");
      if (reg.status === "REJECTED" || reg.paymentStatus === "CANCELLED") throw new Error("Cần kích hoạt lại hồ sơ trước khi chuyển lớp.");
      if (reg.certificateCode || reg.confirmationNumber || reg.invoiceCode || reg.class.status === "DONE") throw new Error("Hồ sơ đã có chứng từ hoặc lớp đã kết thúc. Cần xử lý chứng từ trước khi chuyển.");
      const target = await availableClass(tx, classId); assertClassAccess(user, target);
      if (target.courseType !== reg.class.courseType) throw new Error("Chỉ chuyển giữa các lớp cùng chương trình.");
      if (target.fee !== reg.class.fee) throw new Error("Hai lớp khác học phí. Cần đối soát chênh lệch trước khi chuyển.");
      const data = registrationData({...reg, classId, email: reg.email || undefined, organization: reg.organization || undefined,
        cccd: reg.cccd || undefined, workplace: reg.workplace || undefined, idPhotoUrl: reg.idPhotoUrl || undefined,
        degreeUrl: reg.degreeUrl || undefined, paymentReceiptUrl: reg.paymentReceiptUrl || undefined, note: reg.note || undefined,
        sessionId: reg.sessionId || undefined, source: reg.source || undefined, gender: reg.gender || undefined});
      validateProgram(data, target.courseType); await preventDuplicate(tx, data, id);
      await tx.registration.update({where: {id}, data: {classId}});
      await tx.registrationEvent.create({data:{registrationId:id,actorId:user.id,action:"TRANSFER",details:{from:reg.class.code,to:target.code,reason:reason.trim(),status:reg.status,paymentStatus:reg.paymentStatus}}});

}
