import { jwtVerify, type JWTVerifyGetKey } from "jose";
import prisma from "./prisma";
import { ssoConfig } from "./sso-config";
import { lockSsoIdentity } from "./sso-session";
import { ssoVerificationKeys } from "./sso-oidc";
const logoutEvent = "http://schemas.openid.net/event/backchannel-logout";
export async function receiveBackchannelLogout(token: string, verificationKey?: JWTVerifyGetKey) {
  const settings = ssoConfig();
  const { payload, protectedHeader } = await jwtVerify(token, verificationKey || await ssoVerificationKeys(), {
    issuer: settings.issuer, audience: settings.clientId, algorithms: ["RS256"], requiredClaims: ["iat", "jti"], maxTokenAge: "5 minutes", clockTolerance: 5,
  });
  if (protectedHeader.typ && !["JWT", "logout+jwt"].includes(protectedHeader.typ)) throw Error("SSO_LOGOUT_INVALID");
  const events = payload.events;
  if (!events || typeof events !== "object" || Array.isArray(events) || !(logoutEvent in events) || typeof (events as Record<string, unknown>)[logoutEvent] !== "object" || (events as Record<string, unknown>)[logoutEvent] === null || "nonce" in payload) throw Error("SSO_LOGOUT_INVALID");
  const detail = (events as Record<string, unknown>)[logoutEvent];
  if (Array.isArray(detail) || Object.keys(detail as object).length !== 0) throw Error("SSO_LOGOUT_INVALID");
  for(const claim of ["sub","sid"] as const) if(claim in payload && (typeof payload[claim] !== "string" || !payload[claim] || payload[claim]!.length > 255)) throw Error("SSO_LOGOUT_INVALID");
  const sub = typeof payload.sub === "string" && payload.sub.length > 0 && payload.sub.length <= 255 ? payload.sub : null;
  const sid = typeof payload.sid === "string" && payload.sid.length > 0 && payload.sid.length <= 255 ? payload.sid : null;
  if ((!sub && !sid) || typeof payload.jti !== "string" || !payload.jti || payload.jti.length > 255) throw Error("SSO_LOGOUT_INVALID");
  const issuedAt = new Date(payload.iat! * 1000);
  // Subject is normally supplied by Authentik. Sid-only tokens share the same issuer lock with callback below.
  return prisma.$transaction(async tx => {
    if (sid) await lockSsoIdentity(tx, `sid:${sid}`);
    const linked = sid ? await tx.session.findFirst({ where: { ssoIssuer: settings.issuer, ssoSid: sid }, select: { ssoSubject: true } }) : null;
    await lockSsoIdentity(tx, sub || linked?.ssoSubject || `sid:${sid}`);
    if (await tx.ssoLogoutEvent.findUnique({ where: { jti: payload.jti! } })) return;
    await tx.ssoLogoutEvent.create({ data: { jti: payload.jti!, issuer: settings.issuer, subject: sub, sid, issuedAt, expiresAt: new Date(Date.now() + 24 * 3600000) } });
    await tx.session.deleteMany({ where: {
      ssoIssuer: settings.issuer, ...(sid ? { ssoSid: sid } : { ssoSubject: sub! }), ...(sid && sub ? { ssoSubject: sub } : {}),
      ...(!sid ? { ssoAuthAt: { lte: new Date(issuedAt.getTime() + 5000) } } : {}),
    } });
  });
}
