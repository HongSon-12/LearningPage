import ExcelJS from "exceljs";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { classScope, assertClassAccess, type Actor } from "@/lib/permissions";
import { addRegistration, availableClass, errorMessage, rosterTransaction, registrationData, preventDuplicate, validateProgram } from "@/lib/admissions";
const columns = [
 ["id","Mã hồ sơ"], ["classCode","Mã lớp"], ["fullName","Họ và tên"], ["dob","Ngày sinh"], ["gender","Giới tính"],
 ["phone","Số điện thoại"], ["cccd","CCCD"], ["email","Email"], ["workplace","Đơn vị công tác"], ["organization","Tổ chức"],
 ["note","Ghi chú"], ["idPhotoUrl","Hồ sơ CCCD"], ["degreeUrl","Bằng cấp/Bằng lái"], ["paymentReceiptUrl","Biên lai"],
 ["paymentStatus","Thanh toán"], ["status","Trạng thái hồ sơ"], ["rejectionReason","Lý do từ chối"],
 ["certificateCode","Số GCN/Chứng chỉ"], ["confirmationNumber","Số GXN"], ["invoiceCode","Mã hóa đơn điện tử"],
 ["certificateDeliveredDirect","Đã gửi GCN trực tiếp"], ["certificateSentByPost","Đã gửi GCN qua bưu điện"],
 ["registrationMethod","Hình thức đăng ký"]
] as const;
const accountingFields = ["id", "classCode", "invoiceCode"];
function writable(key: string, actor: Actor) {
 return actor.role === "ADMIN" || (actor.role === "ACCOUNTANT" ? accountingFields.includes(key) : !["invoiceCode", "paymentStatus"].includes(key));
}
export async function excelExport(actor: Actor, classId: string | null, template: boolean) {
 const book = new ExcelJS.Workbook(); const sheet = book.addWorksheet("Học viên");
 const chosen = template ? columns.filter(([key]) => writable(key, actor)) : columns;
 sheet.columns = chosen.map(([key,header]) => ({key, header, width: 25})); sheet.views = [{state: "frozen", ySplit: 1}];
 if (!template) {
  const rows = await prisma.registration.findMany({where: {class: classScope(actor), ...(classId ? {classId} : {})}, include: {class: true}, orderBy: {createdAt: "desc"}});
  for (const row of rows) sheet.addRow({...row, classCode: row.class.code, dob: row.dob.toISOString().slice(0,10),
    certificateDeliveredDirect: row.certificateDeliveredDirect ? "Có" : "Không", certificateSentByPost: row.certificateSentByPost ? "Có" : "Không"});
 }
 sheet.getRow(1).font = {bold: true}; sheet.autoFilter = `A1:${sheet.getColumn(chosen.length).letter}1`;
 const instructions = book.addWorksheet("Hướng dẫn");
 instructions.addRows([["Để trống Mã hồ sơ để tạo mới; điền đúng Mã hồ sơ để cập nhật."],
 ["Tạo mới: Hình thức đăng ký là MANUAL hoặc LATE. ONLINE chỉ dành cho hồ sơ trực tuyến đã có."],
 ["Ngày sinh: YYYY-MM-DD. Giới tính: MALE/FEMALE/OTHER. Có/Không cho trạng thái gửi GCN."],
 ["Thanh toán: PENDING/PAID/CANCELLED. Hồ sơ: PENDING/APPROVED/REJECTED."],
 ["File được kiểm tra trước; toàn bộ file chỉ được lưu khi mọi dòng hợp lệ."],
 ["Không đổi mã lớp qua Excel; dùng chức năng Chuyển lớp."],
 ["Cập nhật: ô trống không thay đổi dữ liệu hiện có. Dùng giao diện chi tiết để xóa nội dung."],
 ["Quản lý lớp không sửa thanh toán/hóa đơn. Kế toán chỉ cập nhật mã hóa đơn qua Excel; dùng màn hình đối soát để sửa thanh toán."],
 ["Giữ CCCD, điện thoại và mã chứng từ dạng văn bản để không mất số 0 đầu."]]);
 instructions.getColumn(1).width = 115;
 return book.xlsx.writeBuffer();
}
type RowData = Record<string,string>;
function value(cell: ExcelJS.Cell): string {
 if (cell.value === null || cell.value === undefined) return "";
 if (cell.value instanceof Date) return cell.value.toISOString().slice(0,10);
 if (typeof cell.value === "object") throw new Error("Không hỗ trợ công thức, liên kết hoặc nội dung đặc biệt trong ô.");
 return String(cell.value).trim();
}
function bool(value: string) {
 if (["Có","true","1"].includes(value)) return true;
 if (["Không","false","0"].includes(value)) return false;
 throw new Error("Trạng thái gửi GCN phải là Có hoặc Không.");
}
export async function readExcel(buffer: Buffer) {
 const book = new ExcelJS.Workbook(); await book.xlsx.load(buffer as unknown as Parameters<typeof book.xlsx.load>[0]);
 const sheet = book.getWorksheet("Học viên"); if (!sheet || sheet.rowCount > 501 || sheet.columnCount > 30) throw new Error("Cần sheet Học viên, tối đa 500 dòng và 30 cột.");
 const headers: string[] = []; const seen = new Set<string>();
 sheet.getRow(1).eachCell((cell,index) => {const header=value(cell); const match=columns.find(([,label])=>label===header);
   if (!match || seen.has(match[0])) throw new Error("Tên cột không hợp lệ hoặc trùng: "+header); headers[index]=match[0]; seen.add(match[0]);});
 if (!seen.has("id") || !seen.has("classCode")) throw new Error("Thiếu cột Mã hồ sơ hoặc Mã lớp.");
 const rows: {row: number; data: RowData}[] = [];
 for (let n=2;n<=sheet.rowCount;n++) {const data: RowData={}; headers.forEach((key,index)=>{data[key]=value(sheet.getCell(n,index));});
  if (Object.values(data).some(Boolean)) rows.push({row:n,data});}
 if (!rows.length) throw new Error("File không có dữ liệu."); return rows;
}
export async function importExcel(actor: Actor, rows: Awaited<ReturnType<typeof readExcel>>, commit: boolean, expectedClassId?: string) {
 // Preview runs the exact same constraints in a rollback transaction, including available seats across all rows.
 const report: {row: number; operation: string; fullName: string}[]=[];
 const previewRollback = new Error("PREVIEW_ROLLBACK");
 try {await rosterTransaction(async tx => {
  const ids=new Set<string>();
  for (const {row,data} of rows) {
   try {
    if (data.id && ids.has(data.id)) throw new Error("Mã hồ sơ lặp lại trong file."); if(data.id) ids.add(data.id);
    const course=await tx.class.findUnique({where:{code:data.classCode}}); if(!course) throw new Error("Mã lớp không tồn tại."); assertClassAccess(actor,course); if(expectedClassId && course.id!==expectedClassId) throw new Error("File chứa học viên của lớp khác. Vui lòng nhập file đúng lớp đang quản lý.");
    const existing=data.id ? await tx.registration.findUnique({where:{id:data.id},include:{class:true}}) : null;
    if(data.id && !existing) throw new Error("Mã hồ sơ không tồn tại.");
    if(existing) {assertClassAccess(actor,existing.class); if(existing.classId!==course.id) throw new Error("Không được chuyển lớp qua import.");}
    if(!existing && actor.role==="ACCOUNTANT") throw new Error("Kế toán không được tạo hồ sơ.");
    for (const [key,v] of Object.entries(data)) {
      if (!v || writable(key,actor)) continue;
      const old = existing ? existing[key as keyof typeof existing] : null;
      const previous = old instanceof Date ? old.toISOString().slice(0,10) : typeof old === "boolean" ? (old ? "Có" : "Không") : String(old ?? "");
      if (v!==previous) throw new Error("Không có quyền sửa cột "+(columns.find(([k])=>k===key)?.[1] || key));
    }
    let reg=existing;
    if(!reg) {
      const method=data.registrationMethod || "MANUAL"; if(!["MANUAL","LATE"].includes(method)) throw new Error("Tạo mới chỉ dùng MANUAL hoặc LATE.");
      reg=await addRegistration(tx,{classId:course.id,fullName:data.fullName,dob:new Date(data.dob),phone:data.phone,
        gender:(data.gender || undefined) as "MALE"|"FEMALE"|"OTHER"|undefined,cccd:data.cccd,email:data.email,workplace:data.workplace,
        organization:data.organization,note:data.note,idPhotoUrl:data.idPhotoUrl,degreeUrl:data.degreeUrl,paymentReceiptUrl:data.paymentReceiptUrl},
        {method:method as "MANUAL"|"LATE",actorId:actor.id}) as typeof existing;
    }
    if(!reg) throw new Error("Không thể tạo hồ sơ.");
    const patch: Prisma.RegistrationUpdateInput={};
    const personalKeys=["fullName","dob","gender","phone","cccd","email","workplace","organization","note","idPhotoUrl","degreeUrl","paymentReceiptUrl"];
    const personalChanged=existing && personalKeys.some(key=>{const v=existing[key as keyof typeof existing];const text=v instanceof Date?v.toISOString().slice(0,10):String(v??"");return data[key]&&data[key]!==text;});
    if(existing && actor.role !== "ACCOUNTANT" && personalChanged) {
      const merged=registrationData({classId:course.id, fullName:data.fullName||existing.fullName,
        dob:new Date(data.dob||existing.dob),phone:data.phone||existing.phone,
        gender:(data.gender||existing.gender||undefined) as "MALE"|"FEMALE"|"OTHER"|undefined,
        cccd:data.cccd||existing.cccd||undefined,email:data.email||existing.email||undefined,
        workplace:data.workplace||existing.workplace||undefined,organization:data.organization||existing.organization||undefined,
        note:data.note||existing.note||undefined,idPhotoUrl:data.idPhotoUrl||existing.idPhotoUrl||undefined,
        degreeUrl:data.degreeUrl||existing.degreeUrl||undefined,paymentReceiptUrl:data.paymentReceiptUrl||existing.paymentReceiptUrl||undefined,
        printOrgOnCert:existing.printOrgOnCert,sessionId:existing.sessionId||undefined,source:existing.source||undefined});
      validateProgram(merged,course.courseType);await preventDuplicate(tx,merged,existing.id);
      Object.assign(patch,merged);
    }
    const status=data.status||reg.status;const paymentStatus=data.paymentStatus||reg.paymentStatus;
    if(!["PENDING","APPROVED","REJECTED"].includes(status)||!["PENDING","PAID","CANCELLED"].includes(paymentStatus)) throw new Error("Trạng thái không hợp lệ.");
    if(data.status&&actor.role!=="ACCOUNTANT") {
      if(status==="REJECTED"&&!data.rejectionReason&&!reg.rejectionReason)throw new Error("Cần lý do từ chối.");
      patch.status=status as "PENDING"|"APPROVED"|"REJECTED";
      patch.rejectionReason=status==="REJECTED"?(data.rejectionReason||reg.rejectionReason):null;
    }
    if(data.paymentStatus&&actor.role==="ADMIN")patch.paymentStatus=paymentStatus as "PENDING"|"PAID"|"CANCELLED";
    if((reg.status==="REJECTED"||reg.paymentStatus==="CANCELLED")&&status!=="REJECTED"&&paymentStatus!=="CANCELLED")await availableClass(tx,course.id,reg.id,true);
    if(data.registrationMethod&&existing&&data.registrationMethod!==existing.registrationMethod)throw new Error("Không thay đổi nguồn đăng ký qua Excel.");
    for(const key of ["invoiceCode","certificateCode","confirmationNumber"] as const) if(data[key] && writable(key,actor)) patch[key]=data[key];
    for(const key of ["certificateDeliveredDirect","certificateSentByPost"] as const) if(data[key] && writable(key,actor)) patch[key]=bool(data[key]);
    await tx.registration.update({where:{id:reg.id},data:patch});
    await tx.registrationEvent.create({data:{registrationId:reg.id,actorId:actor.id,action:"IMPORT",details:{row,mode:existing ? "UPDATE":"CREATE"}}});
    report.push({row,operation:existing?"Cập nhật":"Tạo mới",fullName:reg.fullName});
   } catch(error) {throw new Error(`Dòng ${row}: ${errorMessage(error)}`);}
  }
  if(!commit) throw previewRollback;
 });} catch(error) {if(error!==previewRollback) throw error;}
 return report;
}
