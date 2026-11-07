import { test, expect, type Locator } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  page.on("console", message => {
    if ((message.type() === "error" && /hydrat/i.test(message.text())) || /You have Reduced Motion enabled/i.test(message.text())) throw new Error(message.text());
  });
  // Read-only landing review: suppress optional tracking actions and external requests.
  await page.route("**/*", route => {
    const request = route.request();
    if (new URL(request.url()).hostname !== "localhost" ||
        (request.method() === "POST" && request.headers()["next-action"]))
      return route.abort();
    return route.continue();
  });
  await mkdir('.local/ui-landing', { recursive: true });
});

test('landing sections follow naturally and next-content anchors clear the navbar', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 938 });
    await page.goto('/hocsocapcuu');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('[data-slot="community-hero"] > div').first()).toHaveCSS('opacity', '1');
    await page.screenshot({ path: `.local/ui-landing/hero-${width}.png` });
    const gap = await page.evaluate(() => {
      const hero = document.querySelector('[data-slot="community-hero"]')!.getBoundingClientRect();
      const problem = document.getElementById('tinh-huong')!;
      return problem.getBoundingClientRect().top + parseFloat(getComputedStyle(problem).paddingTop) - hero.bottom;
    });
    expect(gap).toBeLessThanOrEqual(width < 768 ? 64 : 88);
    const next = page.getByRole('link', { name: 'Xem tiếp: Những tình huống thường gặp' });
    await next.click();
    await expect.poll(() => page.locator('#tinh-huong').evaluate(node => Math.round(node.getBoundingClientRect().top))).toBe(96);
    await expect(page.locator('#tinh-huong-title')).toBeInViewport();
    const navbar = await page.locator('header').first().boundingBox();
    const title = await page.locator('#tinh-huong-title').boundingBox();
    expect(title!.y).toBeGreaterThan(navbar!.y + navbar!.height);
    await page.screenshot({ path: `.local/ui-landing/transition-${width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Wheel input retains its native delta instead of being replaced by section jumps.
    await page.mouse.move(width / 2, 400);
    const before = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 180);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 100);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(before + 260);
    await page.goto('/hocsocapcuu#chuong-trinh');
    await expect.poll(() => page.locator('#chuong-trinh').evaluate(node => Math.round(node.getBoundingClientRect().top))).toBe(96);
    await page.screenshot({ path: `.local/ui-landing/modules-${width}.png` });
    await page.goto('/hocsocapcuu#hoc-phi');
    await expect.poll(() => page.locator('#hoc-phi').evaluate(node => Math.round(node.getBoundingClientRect().top))).toBe(96);
    await page.screenshot({ path: `.local/ui-landing/pricing-${width}.png` });
    await expect(page.getByRole('link', { name: 'CHỌN LỚP KHAI GIẢNG', exact: true })).toHaveAttribute('href', '/hocsocapcuu/courses');
  }
});

test('landing keeps content and anchors accessible with device reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/hocsocapcuu');
  expect(await page.locator('html').evaluate(node => getComputedStyle(node).scrollBehavior)).toBe('auto');
  const next = page.getByRole('link', { name: 'Xem tiếp: Những tình huống thường gặp' });
  await next.focus();
  await next.press('Enter');
  await expect.poll(() => page.locator('#tinh-huong').evaluate(node => Math.round(node.getBoundingClientRect().top))).toBe(96);
  await expect(page.locator('#tinh-huong-title')).toHaveCSS('opacity', '1');
});


test("motion stays enabled when device preference changes", async({page})=>{
  await page.emulateMedia({reducedMotion:"no-preference"});
  await page.goto("/hocsocapcuu");
  await expect(page.locator('[data-slot="community-hero"] > div').first()).toHaveCSS("opacity","1");
  await page.emulateMedia({reducedMotion:"reduce"});
  await expect(page.locator("#tinh-huong-title")).toHaveCSS("opacity","1");
  await page.emulateMedia({reducedMotion:"no-preference"});
  await page.getByRole("link",{name:"Xem tiếp: Những tình huống thường gặp"}).click();
  await expect(page.locator("#tinh-huong-title")).toBeInViewport();
});

for(const reducedMotion of ["no-preference","reduce"] as const) {
  test(`scroll reveal replays down and up with ${reducedMotion}`,async({page})=>{
    await page.emulateMedia({reducedMotion});
    for(const width of [390,1440]) {
      await page.setViewportSize({width,height:938});await page.goto("/hocsocapcuu");
      await expect(page.locator('[data-slot="community-hero"] > div').first()).toHaveCSS("opacity","1");
      const heading=page.locator('#chuong-trinh > [data-slot="scroll-reveal"]').first();
      // Read the animated wrapper, not its static h2 child.
      await heading.evaluate(node=>{
        document.documentElement.style.scrollBehavior="auto";
        window.scrollTo(0,node.getBoundingClientRect().top+scrollY-innerHeight-100);
      });
      const hiddenOpacity=0;
      await expect.poll(()=>heading.evaluate(node=>Number(getComputedStyle(node).opacity))).toBeCloseTo(hiddenOpacity,2);
      async function enter(delta:number) {
        await page.mouse.move(width/2,400);
        const [frames]=await Promise.all([
          heading.evaluate(node=>new Promise<{opacity:number;y:number}[]>(resolve=>{
            const frames:{opacity:number;y:number}[]=[];const start=performance.now();
            function sample(){const style=getComputedStyle(node);frames.push({opacity:Number(style.opacity),y:style.transform==="none"?0:new DOMMatrixReadOnly(style.transform).m42});if(performance.now()-start<800)requestAnimationFrame(sample);else resolve(frames);}requestAnimationFrame(sample);
          })),
          page.mouse.wheel(0,delta),
        ]);
        expect(frames.some(frame=>frame.opacity>hiddenOpacity+0.01&&frame.opacity<0.99),JSON.stringify({width,reducedMotion,delta,first:frames[0],last:frames.at(-1),bounds:await heading.boundingBox(),scroll:await page.evaluate(()=>scrollY)})).toBe(true);
        expect(frames.some(frame=>Math.abs(frame.y)>1&&Math.abs(frame.y)<29)).toBe(true);
        await expect(heading).toHaveCSS("opacity","1");
      }
      await enter(350);
      await heading.evaluate(node=>window.scrollTo(0,node.getBoundingClientRect().bottom+scrollY+160));
      await expect.poll(()=>heading.evaluate(node=>Number(getComputedStyle(node).opacity))).toBeCloseTo(hiddenOpacity,2);
      await enter(-400);
      await page.screenshot({path:`.local/ui-landing/scroll-replay-${reducedMotion}-${width}.png`});
    }
  });
}

async function settledScrollY(locator:Locator){
 let previous=NaN,stable=0;
 await expect.poll(async()=>{const current=await locator.evaluate(node=>new DOMMatrixReadOnly(getComputedStyle(node).transform).m42);stable=Math.abs(current-previous)<0.05?stable+1:0;previous=current;return stable;},{intervals:[80],timeout:6000}).toBeGreaterThanOrEqual(4);
 return previous;
}
test("desktop scroll stays enabled without a toggle or saved preference",async({page})=>{
 await page.emulateMedia({reducedMotion:"no-preference"});await page.setViewportSize({width:1440,height:1100});await page.goto("/hocsocapcuu");
 const reveal=page.locator('#chuong-trinh > [data-slot="scroll-reveal"]').first();
 await reveal.evaluate(node=>{document.documentElement.style.scrollBehavior="auto";scrollTo(0,node.getBoundingClientRect().top+scrollY-400);});
 await expect(reveal).toHaveCSS("opacity","1");
 const before=await settledScrollY(reveal);
 await page.mouse.move(1000,500);await page.mouse.wheel(0,160);
 await expect.poll(()=>reveal.evaluate(node=>Math.abs(new DOMMatrixReadOnly(getComputedStyle(node).transform).m42))).toBeGreaterThan(Math.abs(before)+1);
 const down=await settledScrollY(reveal);
 await page.mouse.wheel(0,-160);await expect.poll(()=>reveal.evaluate(node=>new DOMMatrixReadOnly(getComputedStyle(node).transform).m42)).toBeGreaterThan(down+1);
 await expect(reveal).toHaveCSS("opacity","1");
 await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/hocsocapcuu");
 await page.evaluate(()=>localStorage.setItem("ttcc-landing-motion","reduced"));
 await page.reload();
 await expect(page.getByRole("button",{name:"Hiệu ứng cuộn",exact:true})).toHaveCount(0);
 await expect(page.getByText("Giảm hiệu ứng",{exact:true})).toHaveCount(0);
 await reveal.evaluate(node=>{document.documentElement.style.scrollBehavior="auto";scrollTo(0,node.getBoundingClientRect().top+scrollY-400);});
 await expect(reveal).toHaveCSS("opacity","1");
 const enabledY=await settledScrollY(reveal);
 await page.mouse.move(1000,500);await page.mouse.wheel(0,160);
 await expect.poll(()=>reveal.evaluate(node=>Math.abs(new DOMMatrixReadOnly(getComputedStyle(node).transform).m42))).toBeGreaterThan(Math.abs(enabledY)+1);
});
