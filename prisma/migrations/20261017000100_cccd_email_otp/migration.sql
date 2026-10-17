BEGIN;
-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "profileReviewRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "studentId" TEXT;

-- AlterTable
ALTER TABLE "EmailOutbox" ADD COLUMN     "challengeId" TEXT,
ADD COLUMN     "studentId" TEXT,
ALTER COLUMN "type" SET DEFAULT 'SEARCH_OTP',
ALTER COLUMN "registrationId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "LookupChallenge" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "identityHash" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "codeHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LookupChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "cccd" TEXT,
    "fullName" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "needsReview" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LookupChallenge_identityHash_createdAt_idx" ON "LookupChallenge"("identityHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Student_cccd_key" ON "Student"("cccd");

-- CreateIndex
CREATE INDEX "Student_fullName_id_idx" ON "Student"("fullName", "id");

-- CreateIndex
CREATE INDEX "Registration_cccd_createdAt_idx" ON "Registration"("cccd", "createdAt");

-- CreateIndex
CREATE INDEX "Registration_studentId_createdAt_idx" ON "Registration"("studentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailOutbox_challengeId_key" ON "EmailOutbox"("challengeId");

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailOutbox" ADD CONSTRAINT "EmailOutbox_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "LookupChallenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailOutbox" ADD CONSTRAINT "EmailOutbox_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LookupChallenge" ADD CONSTRAINT "LookupChallenge_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Keep registration snapshots, link them to one canonical student per valid CCCD.
-- Invalid/legacy identifiers stay separate for explicit staff correction.
CREATE TEMP TABLE "_StudentBackfill" ON COMMIT DROP AS
SELECT "groupKey", gen_random_uuid()::text AS "studentId" FROM (
  SELECT DISTINCT CASE
    WHEN regexp_replace(COALESCE("cccd", ''), '[[:space:].-]', '', 'g') ~ '^[0-9]{12}$'
    THEN 'cccd:' || regexp_replace("cccd", '[[:space:].-]', '', 'g')
    ELSE 'registration:' || "id" END AS "groupKey"
  FROM "Registration"
) groups;

INSERT INTO "Student" ("id", "cccd", "fullName", "dob", "phone", "email", "needsReview", "createdAt", "updatedAt")
SELECT map."studentId",
  CASE WHEN map."groupKey" LIKE 'cccd:%' THEN substring(map."groupKey" from 6) ELSE NULL END,
  (array_agg(reg."fullName" ORDER BY reg."createdAt", reg."id"))[1],
  (array_agg(reg."dob" ORDER BY reg."createdAt", reg."id"))[1],
  (array_agg(reg."phone" ORDER BY reg."createdAt", reg."id"))[1],
  CASE WHEN count(NULLIF(trim(reg."email"), '')) = count(*)
    AND count(DISTINCT lower(NULLIF(trim(reg."email"), ''))) = 1
    THEN min(lower(trim(reg."email"))) ELSE NULL END,
  map."groupKey" NOT LIKE 'cccd:%' OR count(NULLIF(trim(reg."email"), '')) <> count(*)
    OR count(DISTINCT lower(NULLIF(trim(reg."email"), ''))) <> 1
    OR count(DISTINCT lower(trim(reg."fullName"))) <> 1 OR count(DISTINCT reg."dob") <> 1,
  min(reg."createdAt"), now()
FROM "Registration" reg JOIN "_StudentBackfill" map ON map."groupKey" = CASE
  WHEN regexp_replace(COALESCE(reg."cccd", ''), '[[:space:].-]', '', 'g') ~ '^[0-9]{12}$'
  THEN 'cccd:' || regexp_replace(reg."cccd", '[[:space:].-]', '', 'g') ELSE 'registration:' || reg."id" END
GROUP BY map."studentId", map."groupKey";

UPDATE "Registration" reg SET
  "studentId" = map."studentId",
  "profileReviewRequired" = student."needsReview",
  "cccd" = CASE WHEN map."groupKey" LIKE 'cccd:%' THEN substring(map."groupKey" from 6) ELSE reg."cccd" END
FROM "_StudentBackfill" map JOIN "Student" student ON student."id" = map."studentId"
WHERE map."groupKey" = CASE
  WHEN regexp_replace(COALESCE(reg."cccd", ''), '[[:space:].-]', '', 'g') ~ '^[0-9]{12}$'
  THEN 'cccd:' || regexp_replace(reg."cccd", '[[:space:].-]', '', 'g') ELSE 'registration:' || reg."id" END;

-- The old email-link UX is superseded; preserve records while revoking credentials/jobs.
UPDATE "SearchToken" SET "usedAt" = COALESCE("usedAt", now());
UPDATE "EmailOutbox" SET "status" = 'CANCELLED', "leaseId" = NULL, "leaseUntil" = NULL
WHERE "type" = 'SEARCH_LINK' AND "status" IN ('PENDING', 'SENDING');

COMMIT;
