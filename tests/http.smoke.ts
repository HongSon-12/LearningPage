import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import { hash } from "bcryptjs";
import prisma from "../src/lib/prisma";
const base=process.env.TEST_BASE_URL||"http://localhost:3001";
async function main(){
 const publicPaths=["/hocsocapcuu","/hocsocapcuu/courses","/search","/dao-tao/cme-abcde","/dao-tao/lai-xe-cap-cuu","/dao-tao/hoi-sinh-tim-phoi-co-ban","/dao-tao/hoi-sinh-tim-phoi-nang-cao"];
 for(const path of publicPaths){const response=await fetch(base+path);assert.equal(response.status,200,path);}
 const legacy=await fetch(base+"/admin/courses",{redirect:"manual"});assert.equal(legacy.status,307);assert(new URL(legacy.headers.get("location")!,base).pathname==="/courses");
 const anonymous=await fetch(base+"/",{redirect:"manual"});assert.equal(anonymous.status,307);assert(anonymous.headers.get("location")?.endsWith("/login"));
 assert.equal((await fetch(base+"/api/admin/excel")).status,403);
 async function authenticate(username:string,password:string){const form=new FormData();form.set("username",username);form.set("password",password);const response=await fetch(base+"/api/auth/login",{method:"POST",headers:{Origin:base},body:form});assert.equal(response.status,200);assert(response.headers.get("set-cookie")?.includes("HttpOnly"));return response.headers.get("set-cookie")!.split(";")[0];}
 const access=await readFile(".local/admin-access.txt","utf8");const password=access.match(/Mật khẩu: (.+)/)?.[1];assert(password);
 const adminCookie=await authenticate("admin",password);
 for(const path of ["/","/courses","/registrations","/users","/settings","/course-links"]){const response=await fetch(base+path,{headers:{Cookie:adminCookie}});assert.equal(response.status,200,path);const html=await response.text();assert(!html.includes('data-next-error-message'));}
 const reviewHtml=await (await fetch(base+"/registrations",{headers:{Cookie:adminCookie}})).text();assert(reviewHtml.includes("Kiểm tra thông tin đăng ký"));assert(!reviewHtml.includes("Thêm học viên / Đăng ký vét"));assert(!reviewHtml.includes("Nhập Excel"));
 const existingClass=await prisma.class.findFirst();if(existingClass){const detail=await fetch(base+`/courses/${existingClass.id}`,{headers:{Cookie:adminCookie}});assert.equal(detail.status,200);const detailHtml=await detail.text();assert(detailHtml.includes("Thêm học viên / Đăng ký vét"));assert(detailHtml.includes("Nhập Excel"));}
 const template=await fetch(base+"/api/admin/excel?template=1",{headers:{Cookie:adminCookie}});assert.equal(template.status,200);assert(template.headers.get("content-type")?.includes("spreadsheetml"));
 console.log("PASS public pages, protected admin access, real admin login and Excel download");
 const prefix="http-test-"+randomUUID();const userIds:string[]=[];
 try{
  for(const role of ["CLASS_MANAGER","ACCOUNTANT"] as const){const username=prefix+role;const password=randomUUID()+"!";const user=await prisma.user.create({data:{username,passwordHash:await hash(password,12),role}});userIds.push(user.id);const cookie=await authenticate(username,password);
   const users=await fetch(base+"/users",{headers:{Cookie:cookie},redirect:"manual"});assert.equal(users.status,307);
   const settings=await fetch(base+"/settings",{headers:{Cookie:cookie},redirect:"manual"});assert.equal(settings.status,307);
   const roster=await fetch(base+"/registrations",{headers:{Cookie:cookie}});assert.equal(roster.status,200);const html=await roster.text();
   if(role==="CLASS_MANAGER"){if(existingClass){const denied=await fetch(base+`/courses/${existingClass.id}`,{headers:{Cookie:cookie}});assert.equal(denied.status,404);}const exported=await fetch(base+"/api/admin/excel",{headers:{Cookie:cookie}});const book=new ExcelJS.Workbook();await book.xlsx.load(Buffer.from(await exported.arrayBuffer()) as unknown as Parameters<typeof book.xlsx.load>[0]);assert.equal(book.getWorksheet("Học viên")!.rowCount,1);}else assert(!html.includes("Thêm học viên / Đăng ký vét"));
   await prisma.user.update({where:{id:user.id},data:{active:false}});assert.equal((await fetch(base+"/api/admin/excel",{headers:{Cookie:cookie}})).status,403);
  }
  console.log("PASS manager/accountant page permissions, assigned scope and disabled-account session revocation");
 }finally{await prisma.user.deleteMany({where:{id:{in:userIds},username:{startsWith:prefix}}});}
 await prisma.session.deleteMany({where:{tokenHash:(await import("node:crypto")).createHash("sha256").update(adminCookie.split("=")[1]).digest("hex")}});
}
main().then(async()=>{await prisma.$disconnect();process.exit(0);}).catch(error=>{console.error(error);process.exit(1);});
