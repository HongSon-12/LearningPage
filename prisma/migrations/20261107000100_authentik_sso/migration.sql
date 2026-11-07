ALTER TABLE "User"
  ADD COLUMN "ssoIssuer" TEXT,
  ADD COLUMN "ssoSubject" TEXT,
  ADD COLUMN "ssoUserId" TEXT,
  ADD COLUMN "ssoUid" TEXT,
  ADD COLUMN "ssoActive" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "appAccessGranted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "ssoUpdatedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "User_ssoUserId_key" ON "User"("ssoUserId");
CREATE UNIQUE INDEX "User_ssoUid_key" ON "User"("ssoUid");
CREATE UNIQUE INDEX "User_ssoIssuer_ssoSubject_key" ON "User"("ssoIssuer", "ssoSubject");
ALTER TABLE "Session"
  ADD COLUMN "ssoIssuer" TEXT,
  ADD COLUMN "ssoSubject" TEXT,
  ADD COLUMN "ssoSid" TEXT,
  ADD COLUMN "ssoAuthAt" TIMESTAMP(3),
  ADD COLUMN "ssoCheckedUntil" TIMESTAMP(3),
  ADD COLUMN "ssoAccessToken" TEXT,
  ADD COLUMN "ssoIdToken" TEXT;
CREATE INDEX "Session_ssoIssuer_ssoSid_idx" ON "Session"("ssoIssuer", "ssoSid");
CREATE INDEX "Session_ssoIssuer_ssoSubject_idx" ON "Session"("ssoIssuer", "ssoSubject");
CREATE TABLE "SsoFlow" (
  "id" TEXT PRIMARY KEY, "kind" TEXT NOT NULL, "stateHash" TEXT NOT NULL,
  "verifier" TEXT, "nonce" TEXT, "expiresAt" TIMESTAMP(3) NOT NULL, "usedAt" TIMESTAMP(3)
);
CREATE INDEX "SsoFlow_expiresAt_idx" ON "SsoFlow"("expiresAt");
CREATE TABLE "SsoLogoutEvent" (
  "jti" TEXT PRIMARY KEY, "issuer" TEXT NOT NULL, "subject" TEXT, "sid" TEXT,
  "issuedAt" TIMESTAMP(3) NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "SsoLogoutEvent_issuer_sid_idx" ON "SsoLogoutEvent"("issuer", "sid");
CREATE INDEX "SsoLogoutEvent_issuer_subject_idx" ON "SsoLogoutEvent"("issuer", "subject");
CREATE INDEX "SsoLogoutEvent_expiresAt_idx" ON "SsoLogoutEvent"("expiresAt");
CREATE TABLE "SsoWebhookEvent" (
  "eventId" TEXT PRIMARY KEY, "leaseUntil" TIMESTAMP(3) NOT NULL, "processedAt" TIMESTAMP(3)
);
CREATE INDEX "SsoWebhookEvent_processedAt_idx" ON "SsoWebhookEvent"("processedAt");
