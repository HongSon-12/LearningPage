ALTER TABLE "User" ADD COLUMN "email" TEXT, ADD COLUMN "customRoleId" TEXT;
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "CustomRole" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "nameKey" TEXT NOT NULL,
  "baseRole" "UserRole" NOT NULL, "permissions" TEXT[] NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomRole_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomRole_base_role_check" CHECK ("baseRole" IN ('CLASS_MANAGER','ACCOUNTANT'))
);
CREATE UNIQUE INDEX "CustomRole_nameKey_key" ON "CustomRole"("nameKey");
ALTER TABLE "User" ADD CONSTRAINT "User_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "CustomRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_admin_custom_role_check" CHECK ("role" <> 'ADMIN' OR "customRoleId" IS NULL);
CREATE TABLE "PasswordResetChallenge" (
  "id" TEXT NOT NULL, "userId" TEXT, "emailHash" TEXT NOT NULL,
  "accountUpdatedAt" TIMESTAMP(3), "codeHash" TEXT, "expiresAt" TIMESTAMP(3),
  "failedAttempts" INTEGER NOT NULL DEFAULT 0, "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetChallenge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PasswordResetChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PasswordResetChallenge_userId_createdAt_idx" ON "PasswordResetChallenge"("userId", "createdAt");
CREATE INDEX "PasswordResetChallenge_emailHash_createdAt_idx" ON "PasswordResetChallenge"("emailHash", "createdAt");
ALTER TABLE "EmailOutbox" ADD COLUMN "passwordResetId" TEXT;
CREATE UNIQUE INDEX "EmailOutbox_passwordResetId_key" ON "EmailOutbox"("passwordResetId");
ALTER TABLE "EmailOutbox" ADD CONSTRAINT "EmailOutbox_passwordResetId_fkey" FOREIGN KEY ("passwordResetId") REFERENCES "PasswordResetChallenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
INSERT INTO "RolePermission" ("role", "permission") VALUES ('CLASS_MANAGER','dashboard.view'),('ACCOUNTANT','dashboard.view') ON CONFLICT DO NOTHING;
