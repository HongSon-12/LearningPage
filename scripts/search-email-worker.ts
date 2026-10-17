import "dotenv/config";
import prisma from "../src/lib/prisma";
import { runSearchEmailBatch } from "../src/lib/search-email-worker";
async function main() {
  try {
    console.log("Search email batch", await runSearchEmailBatch());
  } catch {
    console.error(
      "Search email worker failed. Check LOOKUP_OTP_SECRET/SMTP configuration and outbox status.",
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
void main();
