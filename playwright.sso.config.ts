import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'sso.spec.ts',workers:1,fullyParallel:false,timeout:45000,expect:{timeout:15000},reporter:'line',outputDir:'.local/sso-ui-results',use:{baseURL:process.env.SSO_TEST_APP_ORIGIN,ignoreHTTPSErrors:true,browserName:'chromium',trace:'retain-on-failure',screenshot:'only-on-failure'}});
