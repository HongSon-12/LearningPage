ALTER TABLE "User" ADD COLUMN "name" TEXT;

-- SSO application policy controls admission; no second local approval.
UPDATE "User" SET "appAccessGranted" = true, "active" = "ssoActive" WHERE "ssoUserId" IS NOT NULL;
