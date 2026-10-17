CREATE TYPE "AttendanceMethod" AS ENUM ('QR', 'MANUAL');
CREATE TABLE "ClassSession" (
  "id" TEXT NOT NULL, "classId" TEXT NOT NULL, "title" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL,
  "location" TEXT NOT NULL DEFAULT '', "closed" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClassSession_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ClassSession_time_check" CHECK ("endsAt" > "startsAt")
);
CREATE UNIQUE INDEX "ClassSession_classId_startsAt_key" ON "ClassSession"("classId", "startsAt");
CREATE TABLE "Attendance" (
  "id" TEXT NOT NULL, "sessionId" TEXT NOT NULL, "registrationId" TEXT NOT NULL,
  "present" BOOLEAN NOT NULL DEFAULT true, "method" "AttendanceMethod" NOT NULL,
  "recordedById" TEXT NOT NULL, "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Attendance_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Attendance_sessionId_registrationId_key" ON "Attendance"("sessionId", "registrationId");
CREATE INDEX "Attendance_registrationId_idx" ON "Attendance"("registrationId");
