import {test,expect} from '@playwright/test';
async function control(request:import('@playwright/test').APIRequestContext,path:string,data:unknown={}){
 const response=await request.post(process.env.SSO_TEST_ORIGIN+'/fixture/'+path,{headers:{Authorization:'Bearer '+process.env.SSO_TEST_CONTROL_SECRET},data});expect(response.ok()).toBeTruthy();
}
async function metrics(request:import('@playwright/test').APIRequestContext){
 const response=await request.post(process.env.SSO_TEST_ORIGIN+'/fixture/metrics',{headers:{Authorization:'Bearer '+process.env.SSO_TEST_CONTROL_SECRET}});expect(response.ok()).toBeTruthy();return response.json();
}
test.beforeEach(async({request})=>{await control(request,'reset');});
test('OIDC redirects directly, shows SSO account and keeps identity read-only while edu assigns roles',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'Mở tài khoản cá nhân'})).toBeVisible();await expect(page.locator('#sso-protected-content')).not.toHaveAttribute('inert','');
 await expect(page.getByRole('button',{name:'Mở tài khoản cá nhân'}).first()).toContainText('Hồng Sơn');
 expect((await page.context().cookies()).find(cookie=>cookie.name==='ttcc_session')).toMatchObject({secure:true,httpOnly:true,sameSite:'Lax'});
 await page.goto('/users');await expect(page.getByRole('button',{name:'Thêm tài khoản'})).toHaveCount(0);await page.getByRole('button',{name:'Chọn tài khoản Nguyễn Văn Học'}).click();
 await expect(page.getByLabel('Tên đăng nhập',{exact:true})).toHaveAttribute('readonly','');await expect(page.locator('#account-password')).toHaveCount(0);await expect(page.getByLabel('Email từ SSO')).toHaveAttribute('readonly','');await expect(page.getByLabel('Tên người dùng',{exact:true})).toHaveAttribute('readonly','');await expect(page.getByLabel('Tên người dùng',{exact:true})).toHaveValue('Nguyễn Văn Học');await expect(page.getByLabel('Cấp quyền truy cập edu')).toHaveCount(0);await expect(page.getByLabel('Vai trò',{exact:true})).toContainText('Chưa phân quyền');await page.getByLabel('Vai trò',{exact:true}).click();await page.getByRole('option',{name:'Quản lý lớp',exact:true}).click();await page.getByRole('button',{name:'Lưu',exact:true}).click();await expect(page.getByText('Đã lưu tài khoản.',{exact:true})).toBeVisible();
 await page.goto('/account');await expect(page.getByRole('link',{name:'Quản lý tài khoản và mật khẩu tại SSO'})).toBeVisible();await expect(page.locator('input[type=password]')).toHaveCount(0);
 const unauthorized=await page.request.post('/api/auth/webhook/authentik',{data:{eventId:'00000000-0000-4000-8000-000000000000'}});expect(unauthorized.status()).toBe(401);
});
test('allowed account without a role waits for admin and cannot use modules',async({page,context})=>{
 await context.addCookies([{name:'fixture-user',value:'waiting',url:process.env.SSO_TEST_ORIGIN!}]);await page.goto('/');await expect(page).toHaveURL(/\/access-denied$/);await expect(page.getByRole('heading',{name:'Chưa được cấp quyền'})).toBeVisible();await page.goto('/courses');await expect(page).toHaveURL(/\/access-denied$/);await page.goto('/account');await expect(page.getByText('Chưa phân quyền',{exact:true}).first()).toBeVisible();
});
test('login reuses verification and 20 concurrent session requests share the SSO check',async({page,request})=>{
 const before=await metrics(request);await page.goto('/');await expect(page.locator('#sso-protected-content')).not.toHaveAttribute('inert','');
 const loggedIn=await metrics(request);
 expect(loggedIn.codeGrants-before.codeGrants).toBe(1);expect(loggedIn.userInfoReads-before.userInfoReads).toBe(1);expect(loggedIn.directoryReads-before.directoryReads).toBe(1);expect(loggedIn.introspections-before.introspections).toBe(0);
 await control(request,'expire-checks');const start=Date.now();const responses=await Promise.all(Array.from({length:20},()=>page.request.get('/api/auth/session')));expect(responses.every(r=>r.status()===200)).toBeTruthy();
 const checked=await metrics(request);expect(checked.introspections-loggedIn.introspections).toBe(1);expect(checked.directoryReads-loggedIn.directoryReads).toBe(1);
 console.log('SESSION_HTTP_BURST',JSON.stringify({requests:20,elapsedMs:Date.now()-start,introspectionRequests:checked.introspections-loggedIn.introspections,directoryRequests:checked.directoryReads-loggedIn.directoryReads}));
});
test('active SSO user without application access cannot create an app session',async({page,context})=>{
 // Being active in the directory does not grant access to the EDU application.
 await context.addCookies([{name:'fixture-user',value:'ungranted',url:process.env.SSO_TEST_ORIGIN!}]);
 await page.goto('/');await expect(page.locator('p[role=alert]')).toContainText('chưa được cấp quyền');expect((await page.request.get('/api/auth/session')).status()).toBe(401);await expect(page.locator('input[type=password]')).toHaveCount(0);
});
test('logout in edu ends central SSO and blocks another open tab',async({page,context})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'Mở tài khoản cá nhân'})).toBeVisible();const other=await context.newPage();await other.goto('/users');await expect(other.getByRole('heading',{name:'Tài khoản đăng nhập'})).toBeVisible();
 await page.bringToFront();await page.getByRole('button',{name:'Mở tài khoản cá nhân'}).click();await page.getByRole('menuitem',{name:'Đăng xuất',exact:true}).click();await expect(page).toHaveURL(/\/hocsocapcuu$/);
 await expect(page.getByText('Phiên làm việc đã kết thúc',{exact:true})).toHaveCount(0);
 expect((await other.request.get('/api/auth/session')).status()).toBe(401);await other.bringToFront();await other.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(other).toHaveURL(/\/hocsocapcuu$/);
});
test('back-channel logout from SSO blocks existing pages and new protected requests',async({page,request})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'Mở tài khoản cá nhân'})).toBeVisible();await control(request,'logout');expect((await page.request.get('/api/auth/session')).status()).toBe(401);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page).toHaveURL(/\/hocsocapcuu$/);
});
test('missed back-channel is caught by introspection and webhook account changes revoke immediately',async({page,request})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'Mở tài khoản cá nhân'})).toBeVisible();await control(request,'logout',{dropDelivery:true,expireChecks:true});await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page).toHaveURL(/\/hocsocapcuu$/);
 await page.goto('/api/auth/login/authentik');await expect(page.getByRole('button',{name:'Mở tài khoản cá nhân'})).toBeVisible();await control(request,'disable');expect((await page.request.get('/api/auth/session')).status()).toBe(401);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page).toHaveURL(/\/hocsocapcuu$/);
});

test('courses defer manager reads until the form opens; saves return updated UI without a second RSC GET',async({page,request})=>{
 await page.goto('/');await expect(page.locator('#sso-protected-content')).not.toHaveAttribute('inert','');
 const before=await metrics(request);let pickerGets=0,rscGets=0;
 page.on('request',req=>{const url=new URL(req.url());if(req.method()==='GET'&&url.pathname==='/api/admin/managers')pickerGets++;if(req.method()==='GET'&&url.pathname==='/courses'&&url.searchParams.has('_rsc'))rscGets++;});
 const started=Date.now();await page.goto('/courses');await expect(page.getByRole('button',{name:'Tạo lớp',exact:true})).toBeVisible();
 const listed=await metrics(request);expect(pickerGets).toBe(0);expect(listed.directoryReads-before.directoryReads).toBe(0);expect(listed.applicationReads-before.applicationReads).toBe(0);
 console.log('COURSES_INITIAL_LOAD',JSON.stringify({elapsedMs:Date.now()-started,managerGets:pickerGets,ssoDirectoryReads:listed.directoryReads-before.directoryReads,ssoPolicyReads:listed.applicationReads-before.applicationReads}));
 await page.getByRole('button',{name:'Tạo lớp',exact:true}).click();const dialog=page.getByRole('dialog');
 await expect(dialog.getByRole('combobox',{name:'Người phụ trách',exact:true})).toBeVisible();expect(pickerGets).toBe(1);
 const options=await page.request.get('/api/admin/managers');expect(options.status()).toBe(200);expect(options.headers()['cache-control']).toContain('no-store');
 for(const user of await options.json())expect(Object.keys(user).sort()).toEqual(['id','name','username']);
 await dialog.getByRole('textbox',{name:'Học phí (VNĐ)',exact:true}).fill('100000000');await expect(dialog.getByRole('textbox',{name:'Học phí (VNĐ)',exact:true})).toHaveValue('100.000.000');
 await dialog.getByRole('textbox',{name:'Mã lớp',exact:true}).fill('OPTIMIZED-FIXTURE');await dialog.getByRole('textbox',{name:'Tên lớp',exact:true}).fill('Optimized fixture class');
 await dialog.getByRole('textbox',{name:'Ngày bắt đầu',exact:true}).fill('01/02/2099');await dialog.getByRole('textbox',{name:'Ngày kết thúc',exact:true}).fill('01/02/2099');
 await dialog.getByRole('textbox',{name:'Giờ bắt đầu',exact:true}).fill('08:00');await dialog.getByRole('textbox',{name:'Giờ kết thúc',exact:true}).fill('12:00');
 await dialog.getByRole('checkbox',{name:'Bác sĩ',exact:true}).check();
 const availabilityBefore=await page.request.get('/api/classes');const availabilityTag=availabilityBefore.headers()['etag'];expect(availabilityTag).toBeTruthy();
 const getsBeforeSave=rscGets;await dialog.getByRole('button',{name:'Tạo lớp',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.getByText('OPTIMIZED-FIXTURE',{exact:true})).toBeVisible();
 expect(rscGets-getsBeforeSave).toBe(0);
 const availabilityAfter=await page.request.get('/api/classes',{headers:{'If-None-Match':availabilityTag}});expect(availabilityAfter.status()).toBe(200);const availability=await availabilityAfter.json();expect(availability).toHaveLength(1);expect(Object.keys(availability[0]).sort()).toEqual(['capacity','count','id']);
 expect((await page.request.get('/api/classes',{headers:{'If-None-Match':availabilityAfter.headers()['etag']}})).status()).toBe(304);
 await page.getByRole('button',{name:'Sửa lớp OPTIMIZED-FIXTURE',exact:true}).click();const edit=page.getByRole('dialog');await expect(edit.getByRole('combobox',{name:'Người phụ trách',exact:true})).toBeVisible();
 await expect(edit.getByRole('textbox',{name:'Học phí (VNĐ)',exact:true})).toHaveValue('100.000.000');
 await edit.getByRole('textbox',{name:'Tên lớp',exact:true}).fill('Updated fixture class');await edit.getByRole('button',{name:'Lưu',exact:true}).click();await expect(edit).toHaveCount(0);await expect(page.getByText('Updated fixture class',{exact:true})).toBeVisible();
 console.log('COURSES_MUTATION',JSON.stringify({followupRscGets:rscGets-getsBeforeSave}));
});
test('manager GET rejects unsigned and unassigned requests',async({page,context})=>{
 expect((await page.request.get('/api/admin/managers')).status()).toBe(401);
 await context.addCookies([{name:'fixture-user',value:'waiting',url:process.env.SSO_TEST_ORIGIN!}]);await page.goto('/');await expect(page).toHaveURL(/\/access-denied$/);
 expect((await page.request.get('/api/admin/managers')).status()).toBe(403);
});
