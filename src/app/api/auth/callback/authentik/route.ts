import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { consumeSsoFlow } from "@/lib/sso-browser";
import { oidc, oidcConfiguration } from "@/lib/sso-oidc";
import { ssoConfig } from "@/lib/sso-config";
import { directoryUserByUsername, syncDirectoryUser } from "@/lib/sso-directory";
import { createSsoSession } from "@/lib/sso-session";
import { ssoEnabled } from "@/lib/auth-mode";
import { ssoNoStore } from "@/lib/sso-http";
export async function GET(request: Request) {
  if (!ssoEnabled()) return new Response(null, { status: 404 });
  const settings = ssoConfig();
  try {
    const callback = new URL(settings.callback); callback.search = new URL(request.url).search;
    const state = callback.searchParams.get("state"); if (!state) throw Error("SSO_STATE_INVALID");
    const flow = await consumeSsoFlow(state, "login");
    if (!flow.verifier || !flow.nonce) throw Error("SSO_STATE_INVALID");
    const config = await oidcConfiguration();
    const tokens = await oidc.authorizationCodeGrant(config, callback, { pkceCodeVerifier: flow.verifier, expectedState: state, expectedNonce: flow.nonce, idTokenExpected: true });
    const claims = z.object({ sub: z.string().min(1).max(255), sid: z.string().min(1).max(255), auth_time: z.number().int().positive() }).parse(tokens.claims());
    if (!tokens.id_token || !tokens.expires_in || tokens.expires_in <= 0 || claims.auth_time > Date.now()/1000 + 5) throw Error("SSO_TOKEN_INVALID");
    const profile = z.object({ preferred_username: z.string().min(1).max(150) }).parse(await oidc.fetchUserInfo(config, tokens.access_token, claims.sub));
    const source = await directoryUserByUsername(profile.preferred_username);
    if(claims.sub !== source.uid && claims.sub !== String(source.pk)) throw Error("SSO_SUBJECT_IDENTITY_MISMATCH");
    const user = await syncDirectoryUser(source);
    if (!user?.active || !user.ssoActive || !user.appAccessGranted) return NextResponse.redirect(new URL("/login?error=access-denied", settings.origin), { headers: ssoNoStore });
    const session = await createSsoSession(user.id, claims, tokens.access_token, tokens.id_token, tokens.expires_in);
    (await cookies()).set("ttcc_session", session.token, { httpOnly: true, secure: true, sameSite: "lax", expires: session.expiresAt, path: "/" });
    return NextResponse.redirect(new URL("/", settings.origin), { headers: ssoNoStore });
  } catch {
    console.error("SSO_CALLBACK_REJECTED");
    return NextResponse.redirect(new URL("/login?error=sso-failed", settings.origin), { headers: ssoNoStore });
  }
}
