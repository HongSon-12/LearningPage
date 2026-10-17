BEGIN;
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CLASS_MANAGER', 'ACCOUNTANT');

-- CreateEnum
CREATE TYPE "RegistrationMethod" AS ENUM ('ONLINE', 'MANUAL', 'LATE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'ADMIN';

-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "managerId" TEXT;

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "certificateDeliveredDirect" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "certificateSentByPost" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "confirmationNumber" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "receiptTokenHash" TEXT,
ADD COLUMN     "registrationMethod" "RegistrationMethod" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "requestKey" TEXT;

-- CreateTable
CREATE TABLE "Session" (
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "key" TEXT NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "blockedUntil" TIMESTAMP(3),

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "RegistrationEvent" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "RegistrationEvent_registrationId_idx" ON "RegistrationEvent"("registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_requestKey_key" ON "Registration"("requestKey");

-- CreateIndex
CREATE INDEX "Registration_classId_status_paymentStatus_idx" ON "Registration"("classId", "status", "paymentStatus");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationEvent" ADD CONSTRAINT "RegistrationEvent_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


COMMIT;
