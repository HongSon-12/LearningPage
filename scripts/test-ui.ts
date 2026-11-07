import 'dotenv/config';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { isolatedDatabase } from '../tests/isolated-db';
async function main() {
    await isolatedDatabase('ui', async () => {
        const child = spawn('pnpm', ['exec', 'playwright', 'test', ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, NEXT_BUILD_DIR: process.env.NEXT_BUILD_DIR || '.next-build', PRIVATE_UPLOAD_DIR: resolve('.local', process.env.DATABASE_SCHEMA!), LOOKUP_OTP_SECRET: randomBytes(32).toString('hex'), SMTP_USER: '', SMTP_PASS: '' } });
        process.on('SIGTERM', () => child.kill('SIGTERM'));
        process.on('SIGINT', () => child.kill('SIGINT'));
        const code = await new Promise<number>((r, j) => { child.on('error', j); child.on('exit', code => r(code ?? 1)); });
        if (code)
            process.exitCode = code;
    });
}
main().catch(error => { console.error(error); process.exitCode = 1; });
