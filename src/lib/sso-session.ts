import type { Session, User, Prisma } from "@prisma/client";
import prisma from "./prisma";
import { ssoConfig } from "./sso-config";
import { ssoHash, sealSsoToken, openSsoToken } from "./sso-crypto";
import { directoryUserById, syncDirectoryUser, SsoNotFound } from "./sso-directory";
import { oidc, oidcConfiguration } from "./sso-oidc";
import { randomBytes } from "node:crypto";
export async function lockSsoIdentity(tx: Prisma.TransactionClient, subject: string) {
  const key = `sso:${process.env.DATABASE_SCHEMA || "public"}:${ssoConfig().issuer}:${subject}`;
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${key}))`;
}
export async function createSsoSession(userId: string, claims: { sub: string; sid: string; auth_time: number }, accessToken: string, idToken: string, expiresIn: number) {
  const settings = ssoConfig(), token = randomBytes(32).toString("hex");
  const authAt = new Date(claims.auth_time * 1000);
  const expiresAt = new Date(Date.now() + Math.min(8 * 3600, expiresIn) * 1000);
  return prisma.$transaction(async tx => {
    await lockSsoIdentity(tx, `sid:${claims.sid}`);
    await lockSsoIdentity(tx, claims.sub);
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user?.ssoActive || (claims.sub !== user.ssoUid && claims.sub !== user.ssoUserId) || !user.appAccessGranted || !user.active || user.ssoIssuer !== settings.issuer || (user.ssoSubject && user.ssoSubject !== claims.sub)) throw Error("SSO_ACCESS_DENIED");
    const logout = await tx.ssoLogoutEvent.findFirst({ where: { issuer: settings.issuer, expiresAt: { gt: new Date() }, OR: [{ sid: claims.sid }, { sid: null, subject: claims.sub, issuedAt: { gte: authAt } }] } });
    if (logout) throw Error("SSO_SESSION_REVOKED");
    await tx.user.update({ where: { id: user.id }, data: { ssoSubject: claims.sub } });
    await tx.session.create({ data: {
      tokenHash: ssoHash(token), userId: user.id, expiresAt, ssoIssuer: settings.issuer, ssoSubject: claims.sub, ssoSid: claims.sid, ssoAuthAt: authAt,
      ssoCheckedUntil: new Date(0), ssoAccessToken: sealSsoToken(accessToken), ssoIdToken: sealSsoToken(idToken),
    } });
    return { token, expiresAt };
  });
}
const checks = new Map<string, Promise<boolean>>();
export async function validSsoSession(session: Session & { user: User }): Promise<boolean> {
  if (!session.user.active || !session.user.ssoActive || !session.user.appAccessGranted || !session.ssoSubject || !session.ssoSid || session.ssoIssuer !== ssoConfig().issuer || !session.ssoAccessToken || !session.user.ssoUserId || session.user.ssoSubject !== session.ssoSubject) return false;
  if (session.ssoCheckedUntil && session.ssoCheckedUntil > new Date()) return true;
  let pending = checks.get(session.tokenHash);
  if (!pending) {
    pending = (async () => {
      try {
        const config = await oidcConfiguration();
        const status = await oidc.tokenIntrospection(config, openSsoToken(session.ssoAccessToken!));
        if (!status.active || status.sub !== session.ssoSubject || status.client_id !== ssoConfig().clientId) {
          await prisma.session.deleteMany({ where: { tokenHash: session.tokenHash } }); return false;
        }
        const source = await directoryUserById(session.user.ssoUserId!);
        const user = await syncDirectoryUser(source);
        if (!user?.active || !user.appAccessGranted || !user.ssoActive) return false;
        // updateMany cannot resurrect a session deleted by logout/webhook while this check was in flight.
        const updated = await prisma.session.updateMany({ where: { tokenHash: session.tokenHash, expiresAt: { gt: new Date() } }, data: { ssoCheckedUntil: new Date(Date.now() + 30000) } });
        return updated.count === 1;
      } catch (error) {
        if (error instanceof SsoNotFound) {
          await prisma.user.updateMany({ where: { id: session.userId }, data: { ssoActive: false, active: false } });
          await prisma.session.deleteMany({ where: { userId: session.userId } });
        }
        // No stale-while-error window: deny protected work when verification is unavailable.
        return false;
      }
    })();
    checks.set(session.tokenHash, pending);
    pending.finally(() => { checks.delete(session.tokenHash); }).catch(() => undefined);
  }
  return pending;
}
