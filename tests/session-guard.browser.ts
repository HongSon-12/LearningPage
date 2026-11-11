import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { chromium, expect, type Page } from "@playwright/test";

// A real-browser fixture for the guard only: no app server, database or SSO secrets.
const localRequire = createRequire(resolve("package.json"));
const { build } = createRequire(localRequire.resolve("tsx/package.json"))("esbuild");
const origin = "http://session-guard.test";
type VisibilityFixture = { setGuardVisibility: (state: DocumentVisibilityState) => void };

async function visibility(page: Page, state: DocumentVisibilityState) {
  await page.evaluate(value => {
    (window as unknown as VisibilityFixture).setGuardVisibility(value);
  }, state);
}

async function main() {
  const bundle = await build({
    stdin: {
      contents: `import React from 'react';
        import {createRoot} from 'react-dom/client';
        import {SsoSessionGuard} from './src/components/admin/sso-session-guard';
        createRoot(document.getElementById('root')).render(
          <SsoSessionGuard><button id="protected-action">Protected action</button></SsoSessionGuard>
        );`,
      loader: "tsx",
      resolveDir: process.cwd(),
    },
    alias: { "@": resolve("src") },
    bundle: true,
    write: false,
    platform: "browser",
    format: "iife",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  const html = `<html><head><style>
    [hidden]{display:none!important}#sso-session-shield{position:fixed;inset:0;background:white}
    </style></head><body><div id="root"></div><script>${bundle.outputFiles[0].text}</script></body></html>`;
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const cases: Array<[string, (page: Page, answer: { status: number; delay: number }, calls: () => number) => Promise<void>]> = [
    ["initial check blocks content until authenticated", async page => {
      await expect(page.locator("#sso-session-shield")).toBeVisible();
      await expect.poll(() => page.locator("#sso-protected-content").evaluate(el => (el as HTMLElement).inert)).toBe(true);
      await expect(page.locator("#sso-session-shield")).toBeHidden();
      await expect(page.locator("#protected-action")).toBeEnabled();
    }],
    ["visible focus checks once without flashing the full-page shield", async (page, answer, calls) => {
      await expect(page.locator("#sso-session-shield")).toBeHidden();
      answer.delay = 400;
      const before = calls();
      await page.evaluate(() => {
        for (let i = 0; i < 20; i++) window.dispatchEvent(new Event("focus"));
      });
      await expect.poll(calls).toBe(before + 1);
      assert.equal(await page.locator("#sso-session-shield").evaluate(el => (el as HTMLElement).hidden), true,
        "A visible-window focus must not flash the full-page session shield while the request is pending");
      await expect.poll(() => page.locator("#sso-protected-content").evaluate(el => (el as HTMLElement).inert)).toBe(false);
      await expect.poll(calls).toBe(before + 1);
    }],
    ["tab return stays covered until checked and coalesces resume events", async (page, answer, calls) => {
      await expect(page.locator("#sso-session-shield")).toBeHidden();
      answer.delay = 400;
      await visibility(page, "hidden");
      await expect(page.locator("#sso-session-shield")).toBeVisible();
      await expect.poll(() => page.locator("#sso-protected-content").evaluate(el => (el as HTMLElement).inert)).toBe(true);
      const before = calls();
      await visibility(page, "visible");
      await page.evaluate(() => {
        window.dispatchEvent(new Event("focus"));
        window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
      });
      await expect.poll(calls).toBe(before + 1);
      await expect(page.locator("#sso-session-shield")).toBeVisible();
      await expect(page.locator("#sso-session-shield")).toBeHidden();
      assert.equal(calls(), before + 1);
    }],
    ["ordinary pageshow does not duplicate initial verification", async (page, _answer, calls) => {
      await expect(page.locator("#sso-session-shield")).toBeHidden();
      const before=calls();
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", {persisted:false})));
      await page.waitForTimeout(100);
      assert.equal(calls(),before);
    }],
    ["return during an old in-flight check requires a fresh visible check", async (page, answer, calls) => {
      await expect(page.locator("#sso-session-shield")).toBeHidden();answer.delay=500;
      const before=calls();await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expect.poll(calls).toBe(before+1);
      await visibility(page,"hidden");await visibility(page,"visible");
      await expect(page.locator("#sso-session-shield")).toBeVisible();
      await expect.poll(calls).toBe(before+2);
      await expect(page.locator("#sso-session-shield")).toBeHidden();
    }],
    ["a delayed JSON body from before tab hide cannot uncover the restored page", async (page, answer, calls) => {
      await expect(page.locator("#sso-session-shield")).toBeHidden();answer.delay=10;
      await page.evaluate(() => { (window as unknown as {fixtureJsonDelay:number}).fixtureJsonDelay=500; });
      const before=calls();
      const bodies=await page.evaluate(() => (window as unknown as {fixtureJsonBodies:number}).fixtureJsonBodies);
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await page.waitForFunction(value => (window as unknown as {fixtureJsonBodies:number}).fixtureJsonBodies > value,bodies);
      await visibility(page,"hidden");await visibility(page,"visible");
      await expect.poll(calls).toBe(before+2);
      await expect(page.locator("#sso-session-shield")).toBeVisible();
      await expect(page.locator("#sso-session-shield")).toBeHidden();
    }],
    ["BFCache restoration checks before revealing protected content", async (page, answer, calls) => {
      await expect(page.locator("#sso-session-shield")).toBeHidden();
      answer.delay = 400;
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true })));
      await expect(page.locator("#sso-session-shield")).toBeVisible();
      const before = calls();
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
      await expect.poll(calls).toBe(before + 1);
      await expect(page.locator("#sso-session-shield")).toBeVisible();
      await expect(page.locator("#sso-session-shield")).toBeHidden();
    }],
    ["expired session redirects on focus", async (page, answer) => {
      await expect(page.locator("#sso-session-shield")).toBeHidden();
      answer.status = 401;
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expect(page).toHaveURL(origin + "/da-dang-xuat");
    }],
    ["verification outage blocks content and retry recovers", async (page, answer) => {
      await expect(page.locator("#sso-session-shield")).toBeHidden();
      answer.status = 503;
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expect(page.getByText("Chưa kiểm tra được phiên đăng nhập. Vui lòng thử lại.")).toBeVisible();
      await expect.poll(() => page.locator("#sso-protected-content").evaluate(el => (el as HTMLElement).inert)).toBe(true);
      answer.status = 200;
      await page.getByRole("button", { name: "Thử lại" }).click();
      await expect(page.locator("#sso-session-shield")).toBeHidden();
      await expect.poll(() => page.locator("#sso-protected-content").evaluate(el => (el as HTMLElement).inert)).toBe(false);
    }],
    ["cross-tab logout covers content and redirects", async page => {
      await expect(page.locator("#sso-session-shield")).toBeHidden();
      await page.evaluate(() => {
        const channel = new BroadcastChannel("edu-session");
        channel.postMessage("signed-out");
        channel.close();
      });
      await expect(page).toHaveURL(origin + "/da-dang-xuat");
    }],
    ["periodic session checks run without a full-page flash", async (page, answer, calls) => {
      await expect(page.locator("#sso-session-shield")).toBeHidden();
      const before = calls();
      answer.delay = 400;
      await page.clock.fastForward(20_000);
      await expect.poll(calls).toBe(before + 1);
      assert.equal(await page.locator("#sso-session-shield").evaluate(el => (el as HTMLElement).hidden), true);
    }],
    ["five idle minutes do not lock an authenticated page", async page => {
      await expect(page.locator("#sso-session-shield")).toBeHidden();
      await page.clock.fastForward(5 * 60_000);
      await expect(page.locator("#sso-session-shield")).toBeHidden();
      await expect.poll(() => page.locator("#sso-protected-content").evaluate(el => (el as HTMLElement).inert)).toBe(false);
      await expect(page).toHaveURL(origin + "/");
    }],
  ];
  let failures = 0;
  try {
    for (const [name, work] of cases) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const answer = { status: 200, delay: 400 };
      let calls = 0;
      await page.clock.install();
      await page.addInitScript({ content: `
        window.fixtureJsonBodies=0;window.fixtureJsonDelay=0;
        const originalFetch=window.fetch.bind(window);
        window.fetch=async (...args)=>{const response=await originalFetch(...args);const json=response.json.bind(response);response.json=async()=>{window.fixtureJsonBodies++;const delay=window.fixtureJsonDelay;if(delay)await new Promise(resolve=>setTimeout(resolve,delay));return json();};return response;};
        let guardVisibility = 'visible';
        Object.defineProperty(document, 'visibilityState', { get: () => guardVisibility });
        window.setGuardVisibility = value => {
          guardVisibility = value;
          document.dispatchEvent(new Event('visibilitychange'));
        };
      ` });
      await page.route(origin + "/**", async route => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/api/auth/session") {
          calls++;
          const status = answer.status;
          await new Promise(resolve => setTimeout(resolve, answer.delay));
          await route.fulfill({ status, json: { authenticated: status === 200 } }).catch(() => undefined);
        } else {
          await route.fulfill({ contentType: "text/html", body: path === "/da-dang-xuat" ? "Signed out" : html });
        }
      });
      try {
        await page.goto(origin);
        await work(page, answer, () => calls);
        console.log("PASS " + name);
      } catch (error) {
        failures++;
        console.error("FAIL " + name + ": " + (error instanceof Error ? error.message : "unknown error"));
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  assert.equal(failures, 0, `${failures} session guard browser regression(s)`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Session guard browser test failed");
  process.exitCode = 1;
});
