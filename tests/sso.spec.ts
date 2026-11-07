import {test,expect} from '@playwright/test';
async function control(request:import('@playwright/test').APIRequestContext,path:string,data:unknown={}){
 const response=await request.post(process.env.SSO_TEST_ORIGIN+'/fixture/'+path,{headers:{Authorization:'Bearer '+process.env.SSO_TEST_CONTROL_SECRET},data});expect(response.ok()).toBeTruthy();
}
test.beforeEach(async({request})=>{await control(request,'reset');});
test('OIDC redirects directly, shows SSO account and keeps identity read-only while edu assigns access',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'Mở tài khoản cá nhân'})).toBeVisible();await expect(page.locator('#sso-protected-content')).not.toHaveAttribute('inert','');
 expect((await page.context().cookies()).find(cookie=>cookie.name==='ttcc_session')).toMatchObject({secure:true,httpOnly:true,sameSite:'Lax'});
 await page.goto('/users');await expect(page.getByRole('button',{name:'Thêm tài khoản'})).toHaveCount(0);await page.getByRole('button',{name:'Chọn tài khoản waiting'}).click();
 await expect(page.getByLabel('Tên đăng nhập',{exact:true})).toHaveAttribute('readonly','');await expect(page.locator('#account-password')).toHaveCount(0);await page.getByLabel('Cấp quyền truy cập edu').check();await page.getByRole('button',{name:'Lưu',exact:true}).click();await expect(page.getByText('Đã lưu tài khoản.',{exact:true})).toBeVisible();
 await page.goto('/account');await expect(page.getByRole('link',{name:'Quản lý tài khoản và mật khẩu tại SSO'})).toBeVisible();await expect(page.locator('input[type=password]')).toHaveCount(0);
 const unauthorized=await page.request.post('/api/auth/webhook/authentik',{data:{eventId:'00000000-0000-4000-8000-000000000000'}});expect(unauthorized.status()).toBe(401);
});
test('ungranted SSO user cannot create an app session',async({page,context})=>{
 // A separate synthetic account has no edu grant, independent of the previous case.
 await context.addCookies([{name:'fixture-user',value:'ungranted',url:process.env.SSO_TEST_ORIGIN!}]);
 await page.goto('/');await expect(page.locator('p[role=alert]')).toContainText('chưa được cấp quyền');expect((await page.request.get('/api/auth/session')).status()).toBe(401);await expect(page.locator('input[type=password]')).toHaveCount(0);
});
test('logout in edu ends central SSO and blocks another open tab',async({page,context})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'Mở tài khoản cá nhân'})).toBeVisible();const other=await context.newPage();await other.goto('/users');await expect(other.getByRole('heading',{name:'Tài khoản đăng nhập'})).toBeVisible();
 await page.bringToFront();await page.getByRole('button',{name:'Mở tài khoản cá nhân'}).click();await page.getByRole('menuitem',{name:'Đăng xuất',exact:true}).click();await expect(page).toHaveURL(/\/da-dang-xuat/);
 expect((await other.request.get('/api/auth/session')).status()).toBe(401);await other.bringToFront();await other.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(other).toHaveURL(/\/da-dang-xuat/);
});
test('back-channel logout from SSO blocks existing pages and new protected requests',async({page,request})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'Mở tài khoản cá nhân'})).toBeVisible();await control(request,'logout');expect((await page.request.get('/api/auth/session')).status()).toBe(401);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page).toHaveURL(/\/da-dang-xuat/);
});
test('missed back-channel is caught by introspection and webhook account changes revoke immediately',async({page,request})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'Mở tài khoản cá nhân'})).toBeVisible();await control(request,'logout',{dropDelivery:true,expireChecks:true});await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page).toHaveURL(/\/da-dang-xuat/);
 await page.goto('/api/auth/login/authentik');await expect(page.getByRole('button',{name:'Mở tài khoản cá nhân'})).toBeVisible();await control(request,'disable');expect((await page.request.get('/api/auth/session')).status()).toBe(401);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page).toHaveURL(/\/da-dang-xuat/);
});
