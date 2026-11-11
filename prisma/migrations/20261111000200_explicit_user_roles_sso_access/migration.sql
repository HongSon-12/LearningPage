-- Separate SSO identity, application admission and EDU module permissions.
ALTER TABLE "User" ALTER COLUMN "role" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ADD COLUMN "ssoAccessCheckedAt" TIMESTAMP(3);

-- Preserve the four explicitly assigned accounts; every other account awaits an admin.
UPDATE "User" SET "role" = NULL, "customRoleId" = NULL
WHERE "username" NOT IN ('nlhson', 'long.truongq', 'ngan.buit', 'loc.tranhv');

-- Old flags were set from is_active, not the application policy. Recheck them from SSO.
UPDATE "User" SET "appAccessGranted" = false, "active" = false
WHERE "ssoUserId" IS NOT NULL;
DELETE FROM "Session" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "role" IS NULL);
