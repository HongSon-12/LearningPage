import "dotenv/config";
import assert from "node:assert/strict";
import {isolatedDatabase} from "./isolated-db";
import {RequestError,publicError} from "../src/lib/errors";
import {seedDemoData,clearDemoData,demoClassIds,demoRegistrationIds} from "../src/lib/demo-data";
async function main(){
 const original=process.env.NODE_ENV;const log=console.error;
 try{
  Reflect.set(process.env,"NODE_ENV","production");
  const secret="SYNTHETIC_SQL_PASSWORD_PATH_SENTINEL";
  assert.equal(publicError(new Error(secret)),"Không thể xử lý yêu cầu. Vui lòng thử lại.");
  assert.equal(publicError(new TypeError(secret),"Chưa thể lưu."),"Chưa thể lưu.");
  assert.equal(publicError(new RequestError("Vui lòng nhập lý do.")),"Vui lòng nhập lý do.");
  for(const code of ["P2002","P2003","P2025","P2034","P2028"])assert(!publicError(Object.assign(new Error(secret),{code})).includes(secret));
  Reflect.set(process.env,"NODE_ENV","development");console.error=()=>{};
  assert(publicError(new Error(secret)).includes(secret));
 }finally{console.error=log;if(original===undefined)Reflect.deleteProperty(process.env,"NODE_ENV");else Reflect.set(process.env,"NODE_ENV",original);}
 await isolatedDatabase("feedback",async prisma=>{
  await prisma.user.create({data:{username:"feedback-admin",role:"ADMIN",passwordHash:"unused"}});
  const real=await prisma.class.create({data:{code:"KEEP-REAL",name:"Unaffected existing class",startTime:"08:00",endTime:"12:00"}});
  await seedDemoData(prisma);await seedDemoData(prisma);
  assert.equal(await prisma.class.count(),5);assert.equal(await prisma.registration.count(),15);assert.equal(await prisma.student.count(),15);assert.equal(await prisma.classSession.count(),12);assert.equal(await prisma.attendance.count(),3);assert.equal(await prisma.emailOutbox.count(),0);
  assert.equal(await prisma.registration.count({where:{classId:demoClassIds[1]}}),2);
  const foreign=await prisma.registration.create({data:{classId:demoClassIds[0],fullName:"Keep additional test record",dob:new Date("1990-01-01"),phone:"0000000000"}});
  await assert.rejects(()=>clearDemoData(prisma),/ngoài bộ mẫu/);assert.equal(await prisma.registration.count(),16);
  await prisma.registration.delete({where:{id:foreign.id}});
  await clearDemoData(prisma);await clearDemoData(prisma);
  assert.equal(await prisma.class.count(),1);assert.equal((await prisma.class.findUniqueOrThrow({where:{id:real.id}})).code,"KEEP-REAL");assert.equal(await prisma.registration.count({where:{id:{in:demoRegistrationIds}}}),0);assert.equal(await prisma.student.count(),0);
 });
 console.log("PASS production error redaction, development diagnostics, safe business errors, local demo idempotency, no email jobs, and cleanup ownership checks");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
