import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import prisma from "../src/lib/prisma";
import { runSearchEmailBatch } from "../src/lib/search-email-worker";
import { runPasswordResetEmailBatch } from "../src/lib/password-reset-worker";

async function main() {
  const loop = process.argv.includes("--loop");
  const shutdown = new AbortController();
  const stop = () => shutdown.abort();
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  let lastCleanup = 0;
  try {
    do {
      try {
        // Short bounded batches keep shutdown within the outbox lease window.
        if(loop && Date.now()-lastCleanup > 600000) {
          const now=new Date();
          await prisma.ssoFlow.deleteMany({where:{expiresAt:{lt:now}}});
          await prisma.ssoLogoutEvent.deleteMany({where:{expiresAt:{lt:now}}});
          await prisma.ssoWebhookEvent.deleteMany({where:{processedAt:{lt:new Date(Date.now()-7*86400000)}}});
          lastCleanup=Date.now();
        }
        const search = await runSearchEmailBatch(undefined, loop ? 2 : 10);
        const recovery = await runPasswordResetEmailBatch(undefined, loop ? 2 : 10);
        if (!loop || search.sent || search.failed || recovery.sent || recovery.failed) {
          console.log("Email batch", { search, recovery });
        }
        if (loop) await writeFile("/tmp/learning-email-worker.heartbeat", String(Date.now()), { mode: 0o600 });
      } catch {
        console.error("Email worker batch failed; check OTP/SMTP configuration and database privately.");
        if (!loop) process.exitCode = 1;
      }
      if (!loop || shutdown.signal.aborted) break;
      await delay(30000, undefined, { signal: shutdown.signal }).catch(error => {
        if (!shutdown.signal.aborted) throw error;
      });
    } while (!shutdown.signal.aborted);
  } finally {
    process.off("SIGTERM", stop);
    process.off("SIGINT", stop);
    await prisma.$disconnect();
  }
}
void main().catch(() => { console.error("Email worker stopped unexpectedly."); process.exitCode = 1; });
