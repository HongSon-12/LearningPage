import {test,expect,type Locator,type Page} from "@playwright/test";
import {randomUUID} from "node:crypto";
async function openOtp(page:Page){
 await page.route("**/*",route=>new URL(route.request().url()).hostname==="localhost"?route.continue():route.abort());
 await page.goto("/forgot-password");await page.getByLabel("Email khôi phục",{exact:true}).fill(`otp-ui-${randomUUID()}@example.test`);await page.getByRole("button",{name:"Nhận mã",exact:true}).click();
 const input=page.getByLabel("Mã xác thực",{exact:true});await expect(input).toBeVisible();return input;
}
async function paste(input:Locator,text:string){await input.evaluate((el,text)=>{const data=new DataTransfer();data.setData("text/plain",text);el.dispatchEvent(new ClipboardEvent("paste",{bubbles:true,cancelable:true,clipboardData:data}));},text);}
test("OTP has six slots, keeps leading zeroes and supports typing, paste and editing",async({page})=>{
 const input=await openOtp(page);const cells=page.locator('[data-slot="otp-cell"]');const submit=page.getByRole("button",{name:"Đổi mật khẩu",exact:true});let posts=0;page.on("request",request=>{if(request.method()==="POST")posts++;});
 await expect(cells).toHaveCount(6);await expect(submit).toBeDisabled();await expect(page.getByText("Đã nhập 0/6 chữ số.",{exact:true})).toBeVisible();
 await input.pressSequentially("ab012345678");await expect(input).toHaveValue("012345");await expect(cells).toHaveText(["0","1","2","3","4","5"]);await expect(submit).toBeEnabled();
 await paste(input,"0 1 2-3 4 5 6 7");await expect(input).toHaveValue("012345");
 const box=await input.boundingBox();await input.click({position:{x:box!.width*2.5/6,y:box!.height/2}});await input.press("9");await expect(input).toHaveValue("019345");await expect(cells.nth(2)).toHaveText("9");
 await input.press("Backspace");await expect(input).toHaveValue("01345");await expect(submit).toBeDisabled();await expect(page.getByText("Đã nhập 5/6 chữ số.",{exact:true})).toBeVisible();
 await input.press("Home");await input.press("Delete");await expect(input).toHaveValue("1345");
 await paste(input,"0a1-2b");await expect(input).toHaveValue("012");await expect(submit).toBeDisabled();expect(posts).toBe(0);
});
test("OTP fits small screens, supports autofill and clears after a new code is requested",async({page})=>{
 await page.setViewportSize({width:320,height:812});const input=await openOtp(page);await expect(input).toHaveAttribute("autocomplete","one-time-code");await expect(input).toHaveAttribute("inputmode","numeric");await expect(input).toHaveAttribute("maxlength","6");await expect(input).toHaveAttribute("name","code");
 await input.fill("001234");await expect(page.locator('[data-slot="otp-cell"]')).toHaveText(["0","0","1","2","3","4"]);
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.setViewportSize({width:390,height:844});await input.focus();await page.screenshot({path:".local/otp-mobile.png",fullPage:true});
 await page.getByRole("button",{name:"Gửi lại mã",exact:true}).click();await expect(input).toHaveValue("");await expect(page.locator('[data-slot="otp-cell"]')).toHaveText(["","","","","",""]);await expect(page.getByRole("button",{name:"Đổi mật khẩu",exact:true})).toBeDisabled();
});
