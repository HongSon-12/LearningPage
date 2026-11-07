import "dotenv/config";
import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import prisma from "../src/lib/prisma";
import { codeDigest } from "../src/lib/lookup-otp";
import { compare } from "bcryptjs";
import { hashSecret } from "../src/lib/security";
import { chooseSelect } from "./controls-helper";
test.describe.configure({mode:"serial"});
const accounts: Record<string,{id:string;token:string}> = {};
let classId = "";
let registrationId = "";
async function staff(browser: Browser, role:string) {
  const context = await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addCookies([{name:"ttcc_session",value:accounts[role].token,url:"http://localhost:3101"}]);
  const page = await context.newPage();
  await page.route("**/*",route=>new URL(route.request().url()).hostname === "localhost"?route.continue():route.abort());
  return {context,page};
}
test.beforeAll(async()=>{
  if(!/^ttcc_rbac_ui_[a-f0-9]{32}$/.test(process.env.DATABASE_SCHEMA || "")) throw new Error("RBAC browser tests require an isolated schema");
  for(const role of ["ADMIN","CLASS_MANAGER","ACCOUNTANT"] as const){
    const user=await prisma.user.create({data:{username:role,passwordHash:"not-used",role}});
    const token=randomUUID()+randomUUID(); accounts[role]={id:user.id,token};
    await prisma.session.create({data:{userId:user.id,tokenHash:hashSecret(token),expiresAt:new Date(Date.now()+3600000)}});
  }
  const course=await prisma.class.create({data:{code:"RBAC-TEST",name:"Lớp kiểm thử quyền",location:"Phòng kiểm thử",startTime:"08:00",endTime:"12:00",managerId:accounts.CLASS_MANAGER.id}});
  classId=course.id;
  registrationId=(await prisma.registration.create({data:{classId,fullName:"Học viên kiểm thử",phone:"0900000000",dob:new Date("1990-01-01"),cccd:"012345678901"}})).id;
});
test.afterAll(async()=>{await prisma.$disconnect();});
test("separate administration pages, stale actions, revoked pages/menu and Excel",async({browser})=>{
  const contexts:BrowserContext[]=[];
  try {
    const admin=await staff(browser,"ADMIN"),manager=await staff(browser,"CLASS_MANAGER"),accountant=await staff(browser,"ACCOUNTANT");
    contexts.push(admin.context,manager.context,accountant.context);
    const page=admin.page;
    for(const [path,title] of [["/users","Tài khoản đăng nhập"],["/permissions","Phân quyền vai trò"]]) {
      await page.goto(path); await expect(page.getByRole("heading",{level:1,name:title,exact:true})).toBeVisible();
    }
    await manager.page.goto("/courses");
    await manager.page.getByRole("button",{name:"Sửa lớp RBAC-TEST",exact:true}).click();
    const edit=manager.page.getByRole("dialog");
    await edit.getByLabel("Tên lớp").fill("Không được ghi sau thu hồi");
    await page.goto("/permissions");
    await page.setViewportSize({width:1440,height:1000});
    const master=await page.locator('[data-slot="master-pane"]').boundingBox(),detail=await page.locator('[data-slot="detail-pane"]').boundingBox();
    expect(master!.width/(master!.width+detail!.width)).toBeCloseTo(0.3,1);
    await page.screenshot({path:".local/ui-phase1/permissions-1440.png",fullPage:true});
    await page.getByRole("checkbox",{name:"Chỉnh sửa lớp học",exact:true}).uncheck();
    await page.getByRole("button",{name:"Lưu",exact:true}).click();
    await expect(page.getByRole("status")).toContainText("Đã lưu");
    await edit.getByRole("button",{name:"Lưu",exact:true}).click();
    await expect(edit.getByRole("alert")).toContainText("không có quyền");
    expect((await prisma.class.findUniqueOrThrow({where:{id:classId}})).name).toBe("Lớp kiểm thử quyền");
    await manager.page.goto("/courses");
    await expect(manager.page.getByRole("button",{name:"Sửa lớp RBAC-TEST",exact:true})).toHaveCount(0);
    await page.getByRole("checkbox",{name:"Xem danh sách lớp",exact:true}).uncheck();
    await expect(page.getByRole("checkbox",{name:"Xem hồ sơ đăng ký",exact:true})).toBeChecked();
    for(const label of ["Xem hồ sơ đăng ký","Tra cứu hồ sơ và lịch sử học","Xem và sao chép liên kết lớp","Xuất Excel / tải mẫu","Kiểm tra / nhập Excel theo quyền từng trường"]) await page.getByRole("checkbox",{name:label,exact:true}).uncheck();
    await page.getByRole("button",{name:"Lưu",exact:true}).click();
    await expect(page.getByRole("status")).toContainText("Đã lưu");
    for(const path of ["/courses","/registrations","/students","/course-links","/permissions","/users"]){
      await manager.page.goto(path); await expect(manager.page).toHaveURL("/");
    }
    await expect(manager.page.getByRole("heading",{name:"Tổng quan hệ thống",exact:true})).toBeVisible();
    await expect(manager.page.getByText("Học viên kiểm thử",{exact:true})).toHaveCount(0);
    await expect(manager.page.getByRole("link",{name:"Tổng quan",exact:true})).toBeVisible();
    await expect(manager.page.getByRole("navigation").getByRole("link",{name:"Lớp học",exact:true})).toHaveCount(0);
    expect((await manager.context.request.get(`/api/admin/excel?classId=${classId}`)).status()).toBe(403);
    expect((await manager.context.request.post("/api/admin/excel",{headers:{Origin:"http://localhost:3101"},multipart:{mode:"preview",file:{name:"test.xlsx",mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",buffer:Buffer.from("invalid")}}})).status()).toBeGreaterThanOrEqual(400);
    await accountant.page.goto(`/courses/${classId}?tab=documents`);
    await chooseSelect(accountant.page,accountant.page.getByRole("combobox",{name:"Thanh toán Học viên kiểm thử",exact:true}),"PAID");
    await expect.poll(async()=>(await prisma.registration.findUniqueOrThrow({where:{id:registrationId}})).paymentStatus).toBe("PAID");
    await page.getByRole("button",{name:"Kế toán",exact:true}).click();
    await expect(page.getByRole("checkbox",{name:/Xem CCCD đầy đủ/})).toBeEnabled();
    await page.getByRole("checkbox",{name:"Cập nhật trạng thái thanh toán",exact:true}).uncheck();
    await page.getByRole("button",{name:"Lưu",exact:true}).click();
    await expect(page.getByRole("status")).toContainText("Đã lưu");
    await accountant.page.reload();
    await expect(accountant.page.getByRole("combobox",{name:"Thanh toán Học viên kiểm thử",exact:true})).toHaveCount(0);
    await page.getByRole("button",{name:/Quản trị/}).click();
    for(const box of await page.getByRole("checkbox").all()){await expect(box).toBeChecked();await expect(box).toBeEnabled();}
    await page.getByRole("checkbox",{name:"Tạo lớp học",exact:true}).uncheck();
    await page.getByRole("button",{name:"Lưu",exact:true}).click();await expect(page.getByRole("status")).toContainText("Đã lưu");
    await page.reload();await page.getByRole("button",{name:/Quản trị/}).click();await expect(page.getByRole("checkbox",{name:"Tạo lớp học",exact:true})).not.toBeChecked();
    await page.getByRole("checkbox",{name:"Tạo lớp học",exact:true}).check();await page.getByRole("button",{name:"Lưu",exact:true}).click();await expect(page.getByRole("status")).toContainText("Đã lưu");
    await page.screenshot({path:".local/ui-phase1/permissions-configurable.png",fullPage:true});
  } finally { await Promise.all(contexts.map(context=>context.close())); }
});

test("custom roles, account recovery email, dashboard scope and password reset form",async({browser})=>{
 const contexts:BrowserContext[]=[];
 try{
  const admin=await staff(browser,"ADMIN");contexts.push(admin.context);const page=admin.page;
  await page.goto("/permissions");await page.getByRole("button",{name:"Thêm vai trò",exact:true}).click();
  await expect(page.getByLabel("Nghiệp vụ",{exact:true})).toHaveCount(0);
  await page.getByLabel("Tên vai trò",{exact:true}).fill("Tiếp nhận thử");
  await page.getByRole("checkbox",{name:"Xem tổng quan hệ thống",exact:true}).check();
  await page.getByRole("checkbox",{name:"Xem danh sách lớp",exact:true}).check();
  await page.getByRole("checkbox",{name:"Xem hồ sơ đăng ký",exact:true}).check();
  await page.getByRole("button",{name:"Lưu",exact:true}).click();await expect(page.getByRole("status")).toContainText("Đã lưu");
  const role=await prisma.customRole.findFirstOrThrow({where:{name:"Tiếp nhận thử"}});
  await page.goto("/users");await page.getByRole("button",{name:"Chọn tài khoản CLASS_MANAGER",exact:true}).click();
  const editor=page.getByRole("region",{name:"Thông tin tài khoản",exact:true});
  await editor.getByLabel("Email khôi phục",{exact:true}).fill("RECOVERY@example.test");
  await chooseSelect(page,editor.getByRole("combobox",{name:"Vai trò",exact:true}),`custom:${role.id}`);
  await editor.getByRole("button",{name:"Lưu",exact:true}).click();
  await expect.poll(async()=>(await prisma.user.findUniqueOrThrow({where:{id:accounts.CLASS_MANAGER.id}})).email).toBe("recovery@example.test");
  expect((await prisma.user.findUniqueOrThrow({where:{id:accounts.CLASS_MANAGER.id}})).customRoleId).toBe(role.id);
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:`.local/ui-phase1/account-email-${width}.png`,fullPage:true});}
  await prisma.session.create({data:{userId:accounts.CLASS_MANAGER.id,tokenHash:hashSecret(accounts.CLASS_MANAGER.token),expiresAt:new Date(Date.now()+3600000)}});
  const outside=await prisma.class.create({data:{code:"OUTSIDE-DASH",name:"Lớp ngoài phân công",startTime:"08:00",endTime:"12:00"}});
  await prisma.registration.create({data:{classId:outside.id,fullName:"Ngoài phạm vi không hiển thị",phone:"0900000000",dob:new Date("1990-01-01")}});
  const manager=await staff(browser,"CLASS_MANAGER");contexts.push(manager.context);await manager.page.goto("/");
  await expect(manager.page.getByRole("heading",{name:"Tổng quan hệ thống",exact:true})).toBeVisible();
  await expect(manager.page.getByText("Học viên kiểm thử",{exact:true})).toBeVisible();await expect(manager.page.getByText("Ngoài phạm vi không hiển thị",{exact:true})).toHaveCount(0);
  await expect(manager.page.getByRole("heading",{name:"Thống kê truy cập & đăng ký",exact:true})).toHaveCount(0);
  await page.goto("/permissions");await page.getByRole("button",{name:"Tiếp nhận thử",exact:true}).click();
  await page.getByRole("checkbox",{name:"Xem danh sách lớp",exact:true}).uncheck();await page.getByRole("checkbox",{name:"Xem hồ sơ đăng ký",exact:true}).uncheck();await page.getByRole("button",{name:"Lưu",exact:true}).click();await expect(page.getByRole("status")).toContainText("Đã lưu");
  await manager.page.reload();await expect(manager.page.getByText("Học viên kiểm thử",{exact:true})).toHaveCount(0);await expect(manager.page.getByRole("heading",{name:"Tổng quan hệ thống",exact:true})).toBeVisible();
  await manager.page.goto("/login");await manager.page.getByRole("link",{name:"Quên mật khẩu?",exact:true}).click();
  await manager.page.getByLabel("Email khôi phục",{exact:true}).fill("recovery@example.test");await manager.page.getByRole("button",{name:"Nhận mã",exact:true}).click();await expect(manager.page.getByRole("status")).toContainText("Nếu email khớp");
  const challenge=await prisma.passwordResetChallenge.findFirstOrThrow({where:{userId:accounts.CLASS_MANAGER.id},orderBy:{createdAt:"desc"}});
  await expect.poll(async()=>(await prisma.emailOutbox.findUniqueOrThrow({where:{passwordResetId:challenge.id}})).status).not.toBe("SENDING");
  // Simulate delivery only for this isolated fixture. No real mailbox is used.
  await prisma.passwordResetChallenge.update({where:{id:challenge.id},data:{codeHash:codeDigest(`staff-reset:${challenge.id}`,"123456"),expiresAt:new Date(Date.now()+600000)}});
  await manager.page.getByLabel("Mã xác thực",{exact:true}).fill("123456");await manager.page.getByLabel("Mật khẩu mới",{exact:true}).fill("new-password-fixture");await manager.page.getByLabel("Nhập lại mật khẩu",{exact:true}).fill("new-password-fixture");
  await manager.page.setViewportSize({width:390,height:844});expect(await manager.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await manager.page.screenshot({path:".local/ui-phase1/password-reset-mobile.png",fullPage:true});
  await manager.page.getByRole("button",{name:"Đổi mật khẩu",exact:true}).click();await expect(manager.page.getByRole("status")).toContainText("Đã đổi mật khẩu");
  expect(await compare("new-password-fixture",(await prisma.user.findUniqueOrThrow({where:{id:accounts.CLASS_MANAGER.id}})).passwordHash)).toBe(true);
  expect(await prisma.session.count({where:{userId:accounts.CLASS_MANAGER.id}})).toBe(0);
 }finally{await Promise.all(contexts.map(context=>context.close()));}
});


test("custom roles can receive every grant without a business selector or protected checkboxes",async({browser})=>{
 const admin=await staff(browser,"ADMIN");let delegated:Awaited<ReturnType<typeof staff>>|undefined;
 try{
  const page=admin.page;await page.goto("/permissions");await page.getByRole("button",{name:"Thêm vai trò",exact:true}).click();
  await expect(page.getByLabel("Nghiệp vụ",{exact:true})).toHaveCount(0);
  await page.getByLabel("Tên vai trò",{exact:true}).fill("Điều phối toàn quyền thử");
  for(const box of await page.getByRole("checkbox").all())await expect(box).toBeEnabled();
  await page.getByRole("button",{name:"Chọn tất cả",exact:true}).click();
  for(const box of await page.getByRole("checkbox").all())await expect(box).toBeChecked();
  await page.getByRole("button",{name:"Bỏ chọn tất cả",exact:true}).click();
  for(const box of await page.getByRole("checkbox").all())await expect(box).not.toBeChecked();
  await page.getByRole("checkbox",{name:"Cập nhật trạng thái thanh toán",exact:true}).check();
  await expect(page.getByRole("checkbox",{name:"Xem hồ sơ đăng ký",exact:true})).not.toBeChecked();
  await page.getByRole("button",{name:"Chọn tất cả",exact:true}).click();
  await page.getByRole("button",{name:"Lưu",exact:true}).click();await expect(page.getByRole("status")).toContainText("Đã lưu");
  const role=await prisma.customRole.findUniqueOrThrow({where:{nameKey:"điều phối toàn quyền thử"}});
  for(const key of ["roles.manage","users.manage","settings.manage","classes.create","classes.all","students.identity"])expect(role.permissions).toContain(key);
  await page.goto("/users");await page.getByRole("button",{name:"Chọn tài khoản ACCOUNTANT",exact:true}).click();
  const editor=page.getByRole("region",{name:"Thông tin tài khoản",exact:true});
  await chooseSelect(page,editor.getByRole("combobox",{name:"Vai trò",exact:true}),`custom:${role.id}`);
  await editor.getByRole("button",{name:"Lưu",exact:true}).click();
  await expect.poll(async()=>(await prisma.user.findUniqueOrThrow({where:{id:accounts.ACCOUNTANT.id}})).customRoleId).toBe(role.id);
  await prisma.session.create({data:{userId:accounts.ACCOUNTANT.id,tokenHash:hashSecret(accounts.ACCOUNTANT.token),expiresAt:new Date(Date.now()+3600000)}});
  delegated=await staff(browser,"ACCOUNTANT");
  for(const path of ["/permissions","/users","/settings","/courses"]){await delegated.page.goto(path);await expect(delegated.page).toHaveURL(path);}
  await expect(delegated.page.getByRole("navigation").getByRole("link",{name:"Phân quyền",exact:true})).toBeVisible();
 }finally{await admin.context.close();await delegated?.context.close();}
});
