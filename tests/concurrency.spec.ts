import { chooseSelect } from './controls-helper';
import 'dotenv/config';
import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import prisma from '../src/lib/prisma';
const run = randomUUID();
let classId = '';
test.beforeAll(async () => {
    if (!/^ttcc_[a-z_]+_[a-f0-9]{32}$/.test(process.env.DATABASE_SCHEMA || ''))
        throw Error('Concurrency browser tests require an isolated schema');
    classId = (await prisma.class.create({ data: { code: 'HTTP-RACE-' + run, name: 'Synthetic HTTP race', capacity: 1, startTime: '08:00', endTime: '12:00', startDate: new Date('2099-01-01'), endDate: new Date('2099-01-01') } })).id;
});
test.afterAll(async () => { await prisma.$disconnect(); });
async function ready(page: Page, cccd: string) { await page.route('**/*', route => new URL(route.request().url()).hostname === 'localhost' ? route.continue() : route.abort()); await page.goto(`/register/${classId}`); await page.getByRole('button', { name: 'Tiếp tục điền thông tin' }).click(); await page.getByRole('textbox', { name: 'Số CCCD', exact: true }).fill(cccd); await page.getByRole('button', { name: 'Tự điền thông tin', exact: true }).click(); await page.getByPlaceholder('VD: Nguyễn Văn A').fill('Người Đăng Ký Giả'); await chooseSelect(page, page.getByRole('combobox', { name: 'Giới tính', exact: true }), 'MALE'); await page.getByRole('textbox', { name: 'Ngày sinh', exact: true }).fill('01/01/1990'); await page.getByPlaceholder('VD: 0987654321').fill('0900000000'); }
test('two real browser submissions compete for the final seat; replay remains idempotent', async ({ browser }) => {
    const a = await browser.newContext(), b = await browser.newContext();
    try {
        const one = await a.newPage(), two = await b.newPage();
        await Promise.all([ready(one, '999998000001'), ready(two, '999998000002')]);
        let captured: {
            url: string;
            body: string;
            action: string;
        } | undefined;
        one.on('request', request => {
            if (request.method() === 'POST' && request.headers()['next-action'] && request.postData()?.includes('999998000001'))
                captured = { url: request.url(), body: request.postData()!, action: request.headers()['next-action'] };
        });
        await Promise.all([one.getByRole('button', { name: 'Xác nhận và tiếp tục thanh toán' }).click(), two.getByRole('button', { name: 'Xác nhận và tiếp tục thanh toán' }).click()]);
        await expect.poll(() => prisma.registration.count({ where: { classId, status: { not: 'REJECTED' }, paymentStatus: { not: 'CANCELLED' } } })).toBe(1);
        await expect.poll(async () => Number(await one.getByRole('heading', { name: 'Hướng dẫn Thanh toán' }).isVisible()) + Number(await two.getByRole('heading', { name: 'Hướng dẫn Thanh toán' }).isVisible())).toBe(1);
        const loser = await one.getByRole('heading', { name: 'Hướng dẫn Thanh toán' }).isVisible() ? two : one;
        await expect(loser.getByRole('alert').filter({ hasText: 'Số lượng học viên đã đủ.' })).toContainText('Số lượng học viên đã đủ. Vui lòng kiểm tra lại hoặc chọn lớp khác.');
        expect(captured).toBeTruthy();
        // Replaying the actual public action request may succeed for the winner or report full for the loser, but cannot add a row.
        const replay = await a.request.post(captured!.url, { headers: { 'next-action': captured!.action, 'content-type': 'text/plain;charset=UTF-8', origin: 'http://localhost:3101' }, data: captured!.body });
        expect(replay.status()).toBe(200);
        expect(await prisma.registration.count({ where: { classId } })).toBe(1);
    }
    finally {
        await a.close();
        await b.close();
    }
});
