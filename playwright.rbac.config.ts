import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({...base, testMatch:["rbac.spec.ts"],outputDir:".local/playwright-rbac-results"});
