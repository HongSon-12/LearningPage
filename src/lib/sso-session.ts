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
export async function createSsoSession(userId: string, claims: { sub: string; sid: string; auth_time: number }, accessToken: string, idToken: string, expiresIn: number, refreshToken?: string) {
  const settings = ssoConfig(), token = randomBytes(32).toString("hex");
  const authAt = new Date(claims.auth_time * 1000);
  if (!Number.isFinite(expiresIn) || expiresIn <= 0) throw Error("SSO_TOKEN_INVALID");
  const expiresAt = new Date(Date.now() + (refreshToken ? 8 * 3600 : Math.min(8 * 3600, expiresIn)) * 1000);
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
      // Callback already verified the grant, profile and app access. Avoid repeating
      // introspection + directory lookup on the first render and session poll.
      ssoCheckedUntil: new Date(Date.now() + 30000), ssoAccessToken: sealSsoToken(accessToken), ssoIdToken: sealSsoToken(idToken),
      ssoAccessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      ssoRefreshToken: refreshToken ? sealSsoToken(refreshToken) : null,
    } });
    return { token, expiresAt };
  });
}
const checks = new Map<string, Promise<boolean>>();
type LinkedSession = Session & { user: User };
const sessionAllowed = (session: LinkedSession) => session.expiresAt > new Date() && session.user.active && session.user.ssoActive && session.user.appAccessGranted && Boolean(session.ssoSubject && session.ssoSid && session.ssoIssuer === ssoConfig().issuer && session.ssoAccessToken && session.user.ssoUserId && session.user.ssoSubject === session.ssoSubject);
const refreshDue = (session: Session) => Boolean(session.ssoRefreshToken && session.ssoAccessTokenExpiresAt && session.ssoAccessTokenExpiresAt.getTime() <= Date.now() + 30000);
async function sessionAccessToken(session: Session, config: Awaited<ReturnType<typeof oidcConfiguration>>) {
  if (!refreshDue(session)) return openSsoToken(session.ssoAccessToken!);
  // Serialize rotation across processes. Logout may delete the row after this
  // transaction; neither refresh nor the final lease update can recreate it.
  return prisma.$transaction(async tx => {
    const key = `sso-refresh:${process.env.DATABASE_SCHEMA || "public"}:${session.tokenHash}`;
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${key}))`;
    const current = await tx.session.findUnique({ where: { tokenHash: session.tokenHash } });
    if (!current || current.expiresAt <= new Date() || !current.ssoAccessToken) throw Error("SSO_SESSION_REVOKED");
    if (!refreshDue(current)) return openSsoToken(current.ssoAccessToken);
    const tokens = await oidc.refreshTokenGrant(config, openSsoToken(current.ssoRefreshToken!));
    if (!tokens.access_token || !Number.isFinite(tokens.expires_in) || !tokens.expires_in || tokens.expires_in <= 0) throw Error("SSO_TOKEN_INVALID");
    const claims = tokens.claims();
    if (claims && (claims.sub !== current.ssoSubject || (claims.sid !== undefined && claims.sid !== current.ssoSid))) throw Error("SSO_SUBJECT_IDENTITY_MISMATCH");
    const updated = await tx.session.updateMany({ where: { tokenHash: current.tokenHash, expiresAt: { gt: new Date() } }, data: {
      ssoAccessToken: sealSsoToken(tokens.access_token),
      ssoAccessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      ...(tokens.refresh_token ? { ssoRefreshToken: sealSsoToken(tokens.refresh_token) } : {}),
      ...(tokens.id_token ? { ssoIdToken: sealSsoToken(tokens.id_token) } : {}),
    } });
    if (updated.count !== 1) throw Error("SSO_SESSION_REVOKED");
    return tokens.access_token;
  }, { maxWait: 5000, timeout: 12000 });
}
export async function validSsoSession(session: LinkedSession): Promise<boolean> {
  if (!sessionAllowed(session)) return false;
  if (session.ssoCheckedUntil && session.ssoCheckedUntil > new Date() && !refreshDue(session)) return true;
  let pending = checks.get(session.tokenHash);
  if (!pending) {
    pending = (async () => {
      try {
        // A request may have read the old lease just before a previous check
        // completed. Reload once so that late requests don't repeat SSO calls.
        const latest = await prisma.session.findUnique({ where: { tokenHash: session.tokenHash }, include: { user: true } });
        if (!latest || !sessionAllowed(latest)) return false;
        if (latest.ssoCheckedUntil && latest.ssoCheckedUntil > new Date() && !refreshDue(latest)) return true;
        const config = await oidcConfiguration();
        const accessToken = await sessionAccessToken(latest, config);
        const [status, source] = await Promise.all([
          oidc.tokenIntrospection(config, accessToken),
          directoryUserById(latest.user.ssoUserId!),
        ]);
        if (!status.active || status.sub !== session.ssoSubject || status.client_id !== ssoConfig().clientId) {
          await prisma.session.deleteMany({ where: { tokenHash: session.tokenHash } }); return false;
        }
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
