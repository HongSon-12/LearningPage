import * as oidc from "openid-client";
import { createRemoteJWKSet } from "jose";
import { ssoConfig } from "./sso-config";
let cached: { key: string; value: Promise<oidc.Configuration> } | undefined;
export async function oidcConfiguration() {
  const settings = ssoConfig(), key = `${settings.issuer}:${settings.clientId}:${settings.clientSecret}`;
  if (!cached || cached.key !== key) {
    const value = oidc.discovery(new URL(settings.issuer), settings.clientId, settings.clientSecret, oidc.ClientSecretPost(settings.clientSecret), { timeout: 5, execute: [oidc.enableNonRepudiationChecks] });
    cached = { key, value };
    value.catch(() => { if (cached?.value === value) cached = undefined; });
  }
  const config = await cached.value, metadata = config.serverMetadata();
  for (const endpoint of [metadata.authorization_endpoint, metadata.token_endpoint, metadata.userinfo_endpoint, metadata.end_session_endpoint, metadata.introspection_endpoint, metadata.jwks_uri]) {
    if (!endpoint || new URL(endpoint).origin !== new URL(settings.issuer).origin) throw Error("SSO_METADATA_INVALID");
  }
  return config;
}
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
export async function ssoVerificationKeys() {
  const config = await oidcConfiguration();
  return jwks ??= createRemoteJWKSet(new URL(config.serverMetadata().jwks_uri!), { timeoutDuration: 5000 });
}
export { oidc };
