import "dotenv/config";
import {test,expect,type Route} from "@playwright/test";
import {randomUUID} from "node:crypto";
import prisma from "../src/lib/prisma";
import {hashSecret} from "../src/lib/security";
import {version} from "../package.json";
const run=randomUUID(),token=randomUUID();let actorId="",classId="";
test.beforeAll(async()=>{
 actorId=(await prisma.user.create({data:{username:`feedback-${run}`,role:"ADMIN",passwordHash:"unused"}})).id;
 await prisma.session.create({data:{userId:actorId,tokenHash:hashSecret(token),expiresAt:new Date(Date.now()+3600000)}});
 const course=await prisma.class.create({data:{code:`FB-${run}`,name:"Feedback class",startTime:"08:00",endTime:"12:00",capacity:40}});classId=course.id;
 await prisma.registration.createMany({data:Array.from({length:12},(_,i)=>({classId,fullName:`Feedback learner ${i}`,dob:new Date("1990-01-01"),phone:"0000000000"}))});
 await prisma.classSession.create({data:{classId,title:"Feedback session",startsAt:new Date("2026-11-01T01:00:00Z"),endsAt:new Date("2026-11-01T05:00:00Z"),createdById:actorId}});
});
test.beforeEach(async({page})=>{
 await page.context().addCookies([{name:"ttcc_session",value:token,url:"http://localhost:3101"}]);
 await page.route("**/*",async route=>{
  const url=new URL(route.request().url());if(url.hostname!=="localhost")return route.abort();
  if(route.request().headers().rsc && url.pathname===`/courses/${classId}` && ["sessions","documents"].includes(url.searchParams.get("tab")||""))await new Promise(resolve=>setTimeout(resolve,700));
  return route.continue();
 });
});
test.afterAll(async()=>{await prisma.registration.deleteMany({where:{classId}});await prisma.classSession.deleteMany({where:{classId}});await prisma.class.deleteMany({where:{id:classId}});await prisma.user.deleteMany({where:{id:actorId}});await prisma.$disconnect();});
test("class tabs keep overview stable, show skeleton and prevent competing navigation",async({page})=>{
 await page.goto(`/courses/${classId}?tab=students`);await expect(page.locator("tbody tr")).toHaveCount(10);
 const overview=page.locator('[data-slot="class-overview"]'),before=await overview.boundingBox();
 const nav=page.getByRole("navigation",{name:"Công việc của lớp"});
 const sessions=nav.getByRole("link",{name:"Buổi học",exact:true}),documents=nav.getByRole("link",{name:"Chứng từ",exact:true});
 await sessions.click();await expect(page.getByRole("status",{name:"Đang tải nội dung",exact:true})).toBeVisible();await expect(overview).toBeVisible();await expect(documents).toHaveAttribute("aria-disabled","true");
 await documents.click({force:true});await expect(page).toHaveURL(`/courses/${classId}?tab=sessions`);await expect(page.getByRole("button",{name:"Tạo buổi học",exact:true})).toBeVisible();
 await expect(page.getByRole("status",{name:"Đang tải nội dung",exact:true})).toHaveCount(0);
 const after=await overview.boundingBox();for(const key of ["x","y","width","height"] as const)expect(Math.abs(before![key]-after![key])).toBeLessThanOrEqual(1);
 await documents.click();await expect(page.getByRole("status",{name:"Đang tải nội dung",exact:true})).toBeVisible();await expect(page.getByRole("columnheader",{name:"Hóa đơn",exact:true})).toBeVisible();await expect(page).toHaveURL(`/courses/${classId}?tab=documents`);
 const last=await overview.boundingBox();for(const key of ["x","y","width","height"] as const)expect(Math.abs(before![key]-last![key])).toBeLessThanOrEqual(1);
 await page.goto(`/courses/${classId}/sessions`);await expect(page).toHaveURL(`/courses/${classId}?tab=sessions`);
});
test("version and account support open the guide on desktop and mobile",async({page})=>{
 await page.goto("/");const topbar=page.locator('[data-slot="admin-topbar"]');await topbar.getByRole("link",{name:`Phiên bản ${version}`,exact:true}).click();await expect(page).toHaveURL("/help#versions");await expect(page.getByRole("heading",{name:"Lịch sử phiên bản",exact:true})).toBeVisible();await expect.poll(async()=>{const box=await page.locator("#versions").boundingBox();return box!.y;}).toBeGreaterThanOrEqual(80);await expect.poll(async()=>{const box=await page.locator("#versions").boundingBox();return box!.y;}).toBeLessThan(page.viewportSize()!.height-60);
 await page.screenshot({path:".local/ux-help-desktop.png",fullPage:true});await page.setViewportSize({width:390,height:844});await topbar.getByRole("button",{name:"Mở tài khoản cá nhân",exact:true}).click();await page.getByRole("menuitem",{name:"Hỗ trợ",exact:true}).click();await expect(page).toHaveURL("/help");await expect(page.getByRole("heading",{name:"Hỗ trợ và hướng dẫn",exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:".local/ux-help-mobile.png",fullPage:true});
});
test("saving a session shows a spinner and locks its dialog until the server responds",async({page})=>{
 await page.goto(`/courses/${classId}?tab=sessions`);await page.getByRole("button",{name:"Tạo buổi học",exact:true}).click();const dialog=page.getByRole("dialog");await dialog.getByLabel("Tên buổi học").fill("Pending test session");
 await dialog.getByRole("textbox",{name:"Bắt đầu",exact:true}).fill("02/11/2026 08:00");await dialog.getByRole("textbox",{name:"Kết thúc",exact:true}).fill("02/11/2026 12:00");
 let writes=0;await page.route("**/*",async route=>{if(new URL(route.request().url()).hostname!=="localhost")return route.abort();if(route.request().method()==="POST"){writes++;await new Promise(resolve=>setTimeout(resolve,700));}return route.continue();});
 await dialog.getByRole("button",{name:"Lưu",exact:true}).click();await expect(dialog).toHaveAttribute("aria-busy","true");await expect(dialog.getByRole("button",{name:"Đang lưu…",exact:true})).toBeDisabled();await page.keyboard.press("Escape");await expect(dialog).toBeVisible();await expect(dialog).toHaveCount(0);expect(writes).toBe(1);await expect(page.getByRole("heading",{name:"Pending test session",exact:true})).toBeVisible();
});

test("production error boundary hides database details and retry recovers",async({page})=>{
 const schema=process.env.DATABASE_SCHEMA!;expect(schema).toMatch(/^ttcc_ui_[a-f0-9]{32}$/);
 let restored=false;
 await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}"."Class" RENAME TO "FeedbackTemporarilyUnavailable"`);
 try{
  await page.goto(`/courses/${classId}?tab=students`);
  await expect(page.getByRole("heading",{name:"Chưa thể tải nội dung",exact:true})).toBeVisible();
  await expect(page.locator("body")).not.toContainText(schema);
  await expect(page.locator("body")).not.toContainText("FeedbackTemporarilyUnavailable");
  await expect(page.locator("body")).not.toContainText("Chi tiết lỗi trong môi trường dev");
  await page.screenshot({path:".local/ux-safe-error.png",fullPage:true});
  await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}"."FeedbackTemporarilyUnavailable" RENAME TO "Class"`);restored=true;
  await page.getByRole("button",{name:"Thử lại",exact:true}).click();
  await expect(page.getByRole("textbox",{name:"Tra cứu học viên",exact:true})).toBeVisible();
 }finally{if(!restored)await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}"."FeedbackTemporarilyUnavailable" RENAME TO "Class"`);}
});

test("logout announces a network failure, releases the lock and allows a retry",async({page})=>{
 await page.goto("/help");
 const fail=async(route:Route)=>{if(route.request().method()==="POST"){await new Promise(resolve=>setTimeout(resolve,700));await route.abort("failed");}else await route.fallback();};
 await page.route("**/*",fail);
 const account=page.getByRole("button",{name:"Mở tài khoản cá nhân",exact:true});await account.click();await page.getByRole("menuitem",{name:"Đăng xuất",exact:true}).click();await expect(account).toBeDisabled();
 await expect(page.getByText("Chưa đăng xuất được. Vui lòng thử lại.",{exact:true})).toBeVisible();await expect(account).toBeEnabled();await expect(page).toHaveURL("/help");
 await page.unroute("**/*",fail);await account.click();await page.getByRole("menuitem",{name:"Đăng xuất",exact:true}).click();await expect(page).toHaveURL("/login");
});
