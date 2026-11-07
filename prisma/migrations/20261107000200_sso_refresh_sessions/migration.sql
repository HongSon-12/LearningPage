-- Keep token lifetime separate from the bounded application session lifetime.
-- Existing sessions keep their original expiry and cannot be resurrected.
ALTER TABLE "Session"
  ADD COLUMN "ssoAccessTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "ssoRefreshToken" TEXT;
