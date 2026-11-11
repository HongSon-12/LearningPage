import "dotenv/config";
import prisma from "../src/lib/prisma";
import { syncAllSsoUsers } from "../src/lib/sso-directory";
async function main() {
  const result = await syncAllSsoUsers(process.argv.includes("--apply"));
  console.log("SSO directory sync", result);
  if (!result.applied) console.log("Dry run only. Use --apply to sync SSO identity and application access. Existing roles are preserved; new users wait for admin assignment.");
  if (result.conflicts) { console.error("SSO_SYNC_CONFLICTS: check identity/email collisions privately; no accounts are automatically merged."); process.exitCode = 1; }
}
void main().catch(() => { console.error("SSO_SYNC_FAILED: check configuration, API permissions and connectivity privately."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
