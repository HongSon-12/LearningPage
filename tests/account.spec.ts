import "dotenv/config";
import {test,expect,type Browser} from "@playwright/test";
import {randomUUID} from "node:crypto";
import {mkdir} from "node:fs/promises";
import {hash} from "bcryptjs";
import prisma from "../src/lib/prisma";
import {hashSecret} from "../src/lib/security";
const run=randomUUID(),password="self-ui-fixture-password",users:Record<string,{id:string;token:string;username:string}>={};let roleId="";
async function signedIn(browser:Browser,key:string){const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies([{name:"ttcc_session",value:users[key].token,url:"http://localhost:3101"}]);const page=await context.newPage();await page.route("**/*",route=>new URL(route.request().url()).hostname==="localhost"?route.continue():route.abort());return {page,context};}
test.beforeAll(async()=>{
 await mkdir(".local/ui-account",{recursive:true});
 roleId=(await prisma.customRole.create({data:{name:`Self UI ${run}`,nameKey:`self-ui-${run}`,baseRole:"CLASS_MANAGER",permissions:[]}})).id;
 for(const key of ["manager","accountant"]){const user=await prisma.user.create({data:{username:`self-ui-${key}-${run}`,passwordHash:await hash(password,12),role:key==="manager"?"CLASS_MANAGER":"ACCOUNTANT",customRoleId:key==="manager"?roleId:null,email:`${key}-${run}@example.test`}});const token=randomUUID()+randomUUID();users[key]={id:user.id,username:user.username,token};await prisma.session.create({data:{userId:user.id,tokenHash:hashSecret(token),expiresAt:new Date(Date.now()+3600000)}});}
});
test.afterAll(async()=>{const ids=Object.values(users).map(user=>user.id);await prisma.auditLog.deleteMany({where:{actorId:{in:ids}}});await prisma.loginAttempt.deleteMany({where:{key:{in:Object.values(users).map(user=>hashSecret(user.username.toLowerCase()))}}});await prisma.user.deleteMany({where:{id:{in:ids}}});if(roleId)await prisma.customRole.delete({where:{id:roleId}});await prisma.$disconnect();});
test("account menu lets a role without management permissions update only its own email",async({browser})=>{
 const {page,context}=await signedIn(browser,"manager");try{
  await page.goto("/");await page.getByRole("button",{name:"Mở tài khoản cá nhân",exact:true}).click();
  const menu=page.getByRole("menu");await expect(menu.getByRole("menuitem")).toHaveCount(3);await expect(menu.getByRole("menuitem",{name:"Tài khoản",exact:true})).toBeVisible();await expect(menu.getByRole("menuitem",{name:"Đăng xuất",exact:true})).toBeVisible();await page.screenshot({path:".local/ui-account/menu-desktop.png"});
  await menu.getByRole("menuitem",{name:"Tài khoản",exact:true}).click();await expect(page).toHaveURL("/account");await expect(page.getByRole("heading",{level:1,name:"Tài khoản của tôi",exact:true})).toBeVisible();
  const form=page.getByRole("form",{name:"Cập nhật tài khoản",exact:true});await expect(form.getByRole("combobox")).toHaveCount(0);await expect(form.getByLabel("Email khôi phục",{exact:true})).toHaveValue(`manager-${run}@example.test`);
  await expect(form.getByLabel("Mật khẩu hiện tại",{exact:true})).toHaveCount(0);
  await form.getByLabel("Email khôi phục",{exact:true}).fill(`changed-${run}@example.test`);await form.getByRole("button",{name:"Lưu",exact:true}).click();await expect(page).toHaveURL("/login");
  expect((await prisma.user.findUniqueOrThrow({where:{id:users.manager.id}})).email).toBe(`changed-${run}@example.test`);expect(await prisma.session.count({where:{userId:users.manager.id}})).toBe(0);
  await page.getByLabel("Tên đăng nhập").fill(users.manager.username);await page.getByLabel("Mật khẩu").fill(password);await page.getByRole("button",{name:"Đăng nhập hệ thống",exact:true}).click();await expect(page).toHaveURL("/");
  await page.getByRole("button",{name:"Mở tài khoản cá nhân",exact:true}).click();await expect(page.getByRole("menu")).toContainText(`changed-${run}@example.test`);await page.getByRole("menuitem",{name:"Đăng xuất",exact:true}).click();await expect(page).toHaveURL("/login");
 }finally{await context.close();}
});
test("mobile account menu changes password and revokes another open session",async({browser})=>{
 const current=await signedIn(browser,"accountant"),stale=await signedIn(browser,"accountant");try{
  const page=current.page;await page.setViewportSize({width:390,height:844});await page.goto("/");await page.getByRole("button",{name:"Mở tài khoản cá nhân",exact:true}).click();await page.screenshot({path:".local/ui-account/menu-mobile.png"});await page.getByRole("menuitem",{name:"Tài khoản",exact:true}).click();await expect(page).toHaveURL("/account");await stale.page.goto("/account");
  const form=page.getByRole("form",{name:"Cập nhật tài khoản",exact:true});await expect(form.getByLabel("Mật khẩu hiện tại",{exact:true})).toHaveCount(0);await form.getByLabel("Mật khẩu mới",{exact:true}).fill("new-self-ui-password");await form.getByLabel("Nhập lại mật khẩu mới",{exact:true}).fill("does-not-match");await form.getByRole("button",{name:"Lưu",exact:true}).click();await expect(form.getByRole("alert")).toContainText("chưa khớp");
  await form.getByLabel("Nhập lại mật khẩu mới",{exact:true}).fill("new-self-ui-password");expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:".local/ui-account/account-mobile.png",fullPage:true});await form.getByRole("button",{name:"Lưu",exact:true}).click();await expect(page).toHaveURL("/login");await stale.page.reload();await expect(stale.page).toHaveURL("/login");
  await page.getByLabel("Tên đăng nhập").fill(users.accountant.username);await page.getByLabel("Mật khẩu").fill(password);await page.getByRole("button",{name:"Đăng nhập hệ thống",exact:true}).click();await expect(page.locator("form").getByRole("alert")).toContainText("mật khẩu không đúng");await page.getByLabel("Mật khẩu").fill("new-self-ui-password");await page.getByRole("button",{name:"Đăng nhập hệ thống",exact:true}).click();await expect(page).toHaveURL("/");
 }finally{await current.context.close();await stale.context.close();}
});
