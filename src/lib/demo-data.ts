import {createHash} from "node:crypto";
import type {PrismaClient} from "@prisma/client";
const id=(key:string)=>{const h=createHash("sha256").update("ttcc-local-demo-v1:"+key).digest("hex");return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
export const demoClassIds=["OPEN","LAST","FULL","DONE"].map(key=>id("class-"+key));
export const demoStudentIds=Array.from({length:15},(_,i)=>id("student-"+i));
export const demoRegistrationIds=Array.from({length:15},(_,i)=>id("registration-"+i));
const demoSessionIds=Array.from({length:12},(_,i)=>id("session-"+i));
export async function seedDemoData(prisma:PrismaClient){
 const operator=await prisma.user.findFirst({where:{active:true,role:"ADMIN"},select:{id:true}});
 if(!operator)throw Error("Cần có tài khoản quản trị đang hoạt động trước khi tạo dữ liệu mẫu.");
 const manager=await prisma.user.findFirst({where:{active:true,role:"CLASS_MANAGER"},select:{id:true}});
 await prisma.$transaction(async tx=>{
  const now=Date.now(),day=86400000;const keys=["OPEN","LAST","FULL","DONE"];
  for(let i=0;i<4;i++){
   const previous=await tx.class.findUnique({where:{id:demoClassIds[i]}});
   if(previous){if(previous.code!==`DEMO-${keys[i]}`)throw Error("Mã dữ liệu mẫu đã được sử dụng; dừng để tránh ghi đè.");continue;}
   const offset=i===3?-14:i===0?7:1;
   await tx.class.create({data:{id:demoClassIds[i],code:`DEMO-${keys[i]}`,name:`[MẪU] ${["Lớp mở đăng ký","Còn một chỗ cuối","Lớp đã đủ chỗ","Lớp đã hoàn tất"][i]}`,courseBatch:"Dữ liệu mẫu local",capacity:i===1||i===2?3:12,status:i===3?"DONE":i===2?"FULL":"OPEN",fee:250000,location:"Phòng thực hành mẫu",managerId:manager?.id,startDate:new Date(now+offset*day),endDate:new Date(now+(offset+2)*day),registrationDeadline:new Date(now+(i===3?-15:i===0?6:0.5)*day),startTime:"08:00",endTime:"12:00",totalLessons:3}});
  }
  for(let i=0;i<15;i++){
   const group=i<6?0:i<8?1:i<11?2:3;
   await tx.student.upsert({where:{id:demoStudentIds[i]},update:{},create:{id:demoStudentIds[i],fullName:`[MẪU] Học viên ${String(i+1).padStart(2,"0")}`,cccd:`99000000${String(i+1).padStart(4,"0")}`,dob:new Date("1995-01-01"),phone:"0000000000",needsReview:i%3===0}});
   await tx.registration.upsert({where:{id:demoRegistrationIds[i]},update:{},create:{id:demoRegistrationIds[i],studentId:demoStudentIds[i],classId:demoClassIds[group],fullName:`[MẪU] Học viên ${String(i+1).padStart(2,"0")}`,cccd:`99000000${String(i+1).padStart(4,"0")}`,dob:new Date("1995-01-01"),phone:"0000000000",status:i===4?"REJECTED":i%3===0?"PENDING":"APPROVED",paymentStatus:i===5?"CANCELLED":i%2?"PAID":"PENDING",invoiceCode:i%2?`DEMO-INV-${i+1}`:null,certificateCode:group===3?`DEMO-CERT-${i+1}`:null,registrationMethod:"MANUAL",organization:"Dữ liệu giả lập local",createdById:operator.id}});
  }
  for(let i=0;i<12;i++){
   const group=Math.floor(i/3),course=await tx.class.findUniqueOrThrow({where:{id:demoClassIds[group]}}),startsAt=new Date(course.startDate);startsAt.setUTCHours(1,0,0,0);startsAt.setUTCDate(startsAt.getUTCDate()+i%3);
   await tx.classSession.upsert({where:{id:demoSessionIds[i]},update:{},create:{id:demoSessionIds[i],classId:course.id,title:`[MẪU] Buổi ${i%3+1}: ${["Lý thuyết","Thực hành","Đánh giá"][i%3]}`,startsAt,endsAt:new Date(startsAt.getTime()+4*3600000),location:course.location,closed:group===3,createdById:operator.id}});
  }
  for(let i=0;i<3;i++)await tx.attendance.upsert({where:{sessionId_registrationId:{sessionId:demoSessionIds[0],registrationId:demoRegistrationIds[i]}},update:{},create:{sessionId:demoSessionIds[0],registrationId:demoRegistrationIds[i],present:true,method:"MANUAL",recordedById:operator.id}});
 },{timeout:15000});
 return {classes:4,students:15,registrations:15,sessions:12,classIds:demoClassIds};
}
export async function clearDemoData(prisma:PrismaClient){
 await prisma.$transaction(async tx=>{
  const foreign=await tx.registration.count({where:{classId:{in:demoClassIds},id:{notIn:demoRegistrationIds}}});
  const foreignSessions=await tx.classSession.count({where:{classId:{in:demoClassIds},id:{notIn:demoSessionIds}}});
  const moved=await tx.registration.count({where:{id:{in:demoRegistrationIds},classId:{notIn:demoClassIds}}});
  if(foreign||foreignSessions||moved)throw Error("Có dữ liệu ngoài bộ mẫu trong các lớp mẫu; dừng để tránh xóa nhầm.");
  await tx.attendance.deleteMany({where:{OR:[{sessionId:{in:demoSessionIds}},{registrationId:{in:demoRegistrationIds}}]}});
  await tx.registration.deleteMany({where:{id:{in:demoRegistrationIds}}});
  await tx.classSession.deleteMany({where:{id:{in:demoSessionIds}}});
  await tx.class.deleteMany({where:{id:{in:demoClassIds},code:{startsWith:"DEMO-"}}});
  await tx.student.deleteMany({where:{id:{in:demoStudentIds},registrations:{none:{}},fullName:{startsWith:"[MẪU]"}}});
 });
}
