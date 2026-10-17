import "dotenv/config";
import prisma from "../src/lib/prisma";
import { migrateLegacyFiles } from "../src/lib/legacy-files";
async function main() {
  try {
    const apply = process.argv.includes("--apply");
    const index = process.argv.indexOf("--backup");
    console.log(
      await migrateLegacyFiles({
        apply,
        backupFolder: index >= 0 ? process.argv[index + 1] : undefined,
      }),
    );
  } catch {
    console.error(
      "Legacy file migration stopped. No public files were deleted; inspect backup/rollback manifest and keep /uploads blocked.",
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
void main();
