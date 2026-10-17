import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
function secret() {
  const value = process.env.LOOKUP_OTP_SECRET;
  if (!value || !/^[a-f0-9]{64}$/i.test(value))
    throw new Error("LOOKUP_OTP_SECRET_REQUIRED");
  return Buffer.from(value, "hex");
}
export const OTP_LIFETIME_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export function otpDigest(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}
export function codeDigest(challengeId: string, code: string) {
  return otpDigest(`code:${challengeId}:${code}`);
}
export function newLookupCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}
export function matchesCode(challengeId: string, code: string, stored: string) {
  return (
    /^[0-9]{6}$/.test(code) &&
    /^[a-f0-9]{64}$/.test(stored) &&
    timingSafeEqual(
      Buffer.from(codeDigest(challengeId, code), "hex"),
      Buffer.from(stored, "hex"),
    )
  );
}
export function profileLookupReady(student: {
  cccd: string | null;
  email: string | null;
  needsReview: boolean;
}) {
  return (
    !student.needsReview &&
    Boolean(
      student.cccd &&
        /^[0-9]{12}$/.test(student.cccd) &&
        student.email &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email),
    )
  );
}
