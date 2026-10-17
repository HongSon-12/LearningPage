-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CourseType" AS ENUM ('COMMUNITY_FIRST_AID', 'CME_ABCDE', 'AMBULANCE_DRIVER', 'CPR_ADVANCED', 'CPR_BASIC');

-- CreateEnum
CREATE TYPE "TargetAudience" AS ENUM ('DOCTOR', 'NURSE', 'PHYSICIAN', 'DRIVER', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('CERTIFICATE', 'CONFIRMATION');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('OPEN', 'FULL', 'DONE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "transferSyntax" TEXT NOT NULL,
    "googleAnalyticsId" TEXT,
    "facebookPixelId" TEXT,
    "microsoftClarityId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "courseType" "CourseType" NOT NULL DEFAULT 'COMMUNITY_FIRST_AID',
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "courseBatch" TEXT,
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "location" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "registrationDeadline" TIMESTAMP(3),
    "totalLessons" INTEGER NOT NULL DEFAULT 0,
    "targetAudiences" "TargetAudience"[],
    "certificateType" "CertificateType" NOT NULL DEFAULT 'CERTIFICATE',
    "capacity" INTEGER NOT NULL DEFAULT 40,
    "status" "ClassStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "gender" "Gender",
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "organization" TEXT,
    "printOrgOnCert" BOOLEAN NOT NULL DEFAULT false,
    "cccd" TEXT,
    "workplace" TEXT,
    "idPhotoUrl" TEXT,
    "degreeUrl" TEXT,
    "paymentReceiptUrl" TEXT,
    "note" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "invoiceCode" TEXT,
    "certificateCode" TEXT,
    "source" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "source" TEXT,
    "eventName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Class_code_key" ON "Class"("code");

-- CreateIndex
CREATE INDEX "TrackingEvent_sessionId_idx" ON "TrackingEvent"("sessionId");

-- CreateIndex
CREATE INDEX "TrackingEvent_eventName_idx" ON "TrackingEvent"("eventName");

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

