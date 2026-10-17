BEGIN;

-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('ID_PHOTO', 'DEGREE', 'RECEIPT');

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "degreeFileId" TEXT,
ADD COLUMN     "idPhotoFileId" TEXT,
ADD COLUMN     "paymentReceiptFileId" TEXT;

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "kind" "FileKind" NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "scanStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "classId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "ownerTokenHash" TEXT,
    "registrationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "resourceId" TEXT,
    "result" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SearchToken" (
    "tokenHash" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "SearchToken_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "EmailOutbox" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SEARCH_LINK',
    "registrationId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseId" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoredFile_storageKey_key" ON "StoredFile"("storageKey");

-- CreateIndex
CREATE INDEX "StoredFile_registrationId_idx" ON "StoredFile"("registrationId");

-- CreateIndex
CREATE INDEX "StoredFile_ownerTokenHash_createdAt_idx" ON "StoredFile"("ownerTokenHash", "createdAt");

-- CreateIndex
CREATE INDEX "StoredFile_uploadedById_createdAt_idx" ON "StoredFile"("uploadedById", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SearchToken_jobId_key" ON "SearchToken"("jobId");

-- CreateIndex
CREATE INDEX "SearchToken_expiresAt_idx" ON "SearchToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailOutbox_idempotencyKey_key" ON "EmailOutbox"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EmailOutbox_status_nextAttemptAt_idx" ON "EmailOutbox"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_idPhotoFileId_key" ON "Registration"("idPhotoFileId");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_degreeFileId_key" ON "Registration"("degreeFileId");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_paymentReceiptFileId_key" ON "Registration"("paymentReceiptFileId");

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_idPhotoFileId_fkey" FOREIGN KEY ("idPhotoFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_degreeFileId_fkey" FOREIGN KEY ("degreeFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_paymentReceiptFileId_fkey" FOREIGN KEY ("paymentReceiptFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchToken" ADD CONSTRAINT "SearchToken_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailOutbox" ADD CONSTRAINT "EmailOutbox_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
