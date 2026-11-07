import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { ssoConfig } from "./sso-config";
export const ssoHash = (value: string) => createHash("sha256").update(value).digest("hex");
export function sealSsoToken(value: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", Buffer.from(ssoConfig().encryptionKey, "hex"), iv);
  cipher.setAAD(Buffer.from("learning-sso-v1"));
  return Buffer.concat([iv, cipher.update(value, "utf8"), cipher.final(), cipher.getAuthTag()]).toString("base64url");
}
export function openSsoToken(value: string) {
  const data = Buffer.from(value, "base64url");
  if (data.length < 29) throw Error("SSO_TOKEN_INVALID");
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(ssoConfig().encryptionKey, "hex"), data.subarray(0, 12));
  decipher.setAAD(Buffer.from("learning-sso-v1"));
  decipher.setAuthTag(data.subarray(-16));
  return Buffer.concat([decipher.update(data.subarray(12, -16)), decipher.final()]).toString("utf8");
}
