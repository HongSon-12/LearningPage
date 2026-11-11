import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
const localRequire = createRequire(resolve("package.json"));
const { build } = createRequire(localRequire.resolve("tsx/package.json"))("esbuild");
const origin = "http://request-efficiency.test";
async function main() {
  const bundle = await build({
    stdin: { contents: `import React,{useEffect} from 'react';import {createRoot} from 'react-dom/client';import LiveRosterRefresh from './src/app/(user)/components/LiveRosterRefresh';function App(){useEffect(()=>{window.fixtureReady=true},[]);return <LiveRosterRefresh initialSnapshot='[]'/>}createRoot(document.getElementById('root')).render(<App/>);`, loader: "tsx", resolveDir: process.cwd() },
    plugins: [{ name: "navigation-fixture", setup(builder: { onResolve: (options: {filter: RegExp}, callback: () => {path: string; namespace: string}) => void; onLoad: (options: {filter: RegExp; namespace: string}, callback: () => {contents: string; loader: string}) => void }) {
      builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "router", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "const router={refresh:()=>{window.fixtureRefreshes=(window.fixtureRefreshes||0)+1}};export function useRouter(){return router}", loader: "js" }));
    } }],
    bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' },
  });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const page = await browser.newPage();
    await page.clock.install();
    await page.addInitScript({content:`let fixtureVisibility='visible';Object.defineProperty(document,'visibilityState',{get:()=>fixtureVisibility});window.setVisibility=value=>{fixtureVisibility=value;document.dispatchEvent(new Event('visibilitychange'))};`});
    let version = '"a"', body = "[]", requests = 0, conditional = 0;
    await page.route(origin + "/**", async route => {
      if (new URL(route.request().url()).pathname === "/api/classes") {
        requests++;
        if (route.request().headers()["if-none-match"] === version) {
          conditional++;
          await route.fulfill({ status: 304, headers: { ETag: version }, body: "" });
        } else await route.fulfill({ status: 200, headers: { ETag: version, "Content-Type": "application/json" }, body });
      } else await route.fulfill({ contentType: "text/html", body: `<div id="root"></div><script>${bundle.outputFiles[0].text}</script>` });
    });
    await page.goto(origin);
    await page.waitForFunction(() => (window as unknown as {fixtureReady: boolean}).fixtureReady);
    assert.equal(requests, 0, "Hydration must reuse server-rendered availability");
    const refreshes = () => page.evaluate(() => (window as unknown as {fixtureRefreshes?: number}).fixtureRefreshes || 0);
    await page.clock.runFor(20010);await expect.poll(() => requests).toBe(1);
    // Drain the fetch promise so the next interval is scheduled before advancing time.
    await page.waitForTimeout(20);await page.clock.runFor(20010);await expect.poll(() => conditional).toBe(1);
    assert.equal(await refreshes(), 0, "304 must not refresh the page");
    version = '"b"';body = '[{"id":"new","capacity":40,"count":1}]';
    await page.waitForTimeout(20);await page.clock.runFor(20010);await expect.poll(refreshes).toBe(1);
    await page.evaluate(() => (window as unknown as {setVisibility: (state: string) => void}).setVisibility("hidden"));
    const beforeHidden = requests;await page.clock.runFor(60000);assert.equal(requests, beforeHidden, "Hidden pages must stop polling");
    await page.evaluate(() => (window as unknown as {setVisibility: (state: string) => void}).setVisibility("visible"));
    await expect.poll(() => requests).toBe(beforeHidden + 1);await expect.poll(() => conditional).toBe(2);
    assert.equal(await refreshes(), 1);
    console.log("PASS no hydration GET, conditional 304 without refresh, one refresh on changed data, hidden-tab pause and visible resume");
  } finally { await browser.close(); }
}
void main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
