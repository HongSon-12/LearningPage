import { cookies } from "next/headers";
import { randomBytes, timingSafeEqual } from "node:crypto";
import prisma from "./prisma";
import { ssoHash, openSsoToken } from "./sso-crypto";
import { oidc, oidcConfiguration } from "./sso-oidc";
import { ssoConfig } from "./sso-config";
const flowCookie = "edu_sso_flow";
const options = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 600 };
export async function beginSsoLogin() {
  const config = await oidcConfiguration(), settings = ssoConfig();
  const browser = randomBytes(32).toString("hex"), state = oidc.randomState(), nonce = oidc.randomNonce(), verifier = oidc.randomPKCECodeVerifier();
  await prisma.ssoFlow.create({ data: { id: ssoHash(browser), kind: "login", stateHash: ssoHash(state), nonce, verifier, expiresAt: new Date(Date.now() + 600000) } });
  (await cookies()).set(flowCookie, browser, options);
  return oidc.buildAuthorizationUrl(config, { redirect_uri: settings.callback, scope: "openid profile email offline_access", response_type: "code", code_challenge: await oidc.calculatePKCECodeChallenge(verifier), code_challenge_method: "S256", state, nonce });
}
export async function consumeSsoFlow(state: string, kind: "login" | "logout") {
  if (state.length > 256) throw Error("SSO_STATE_INVALID");
  const jar = await cookies(), browser = jar.get(flowCookie)?.value;
  jar.delete(flowCookie);
  if (!browser || !/^[a-f0-9]{64}$/.test(browser)) throw Error("SSO_STATE_INVALID");
  const id = ssoHash(browser), flow = await prisma.ssoFlow.findUnique({ where: { id } });
  if (!flow || flow.kind !== kind || flow.usedAt || flow.expiresAt <= new Date() || !timingSafeEqual(Buffer.from(flow.stateHash), Buffer.from(ssoHash(state)))) throw Error("SSO_STATE_INVALID");
  const used = await prisma.ssoFlow.updateMany({ where: { id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
  if (used.count !== 1) throw Error("SSO_STATE_INVALID");
  return flow;
}
export async function beginSsoLogout(sessionHash: string) {
  const jar = await cookies(), settings = ssoConfig(), config = await oidcConfiguration();
  const session = await prisma.session.findUnique({ where: { tokenHash: sessionHash } });
  const state = oidc.randomState(), browser = randomBytes(32).toString("hex");
  const hint = session?.ssoIdToken ? openSsoToken(session.ssoIdToken) : undefined;
  await prisma.$transaction(async tx => {
    if (session) await tx.session.deleteMany({ where: { userId: session.userId } });
    await tx.ssoFlow.create({ data: { id: ssoHash(browser), kind: "logout", stateHash: ssoHash(state), expiresAt: new Date(Date.now() + 600000) } });
  });
  jar.set(flowCookie, browser, options);
  jar.delete("ttcc_session");
  return oidc.buildEndSessionUrl(config, { client_id: settings.clientId, post_logout_redirect_uri: settings.logoutCallback, state, ...(hint ? { id_token_hint: hint } : {}) });
}
