export function ssoConfig() {
  const issuer = process.env.SSO_ISSUER || "https://sso.115.org.vn/application/o/edu/";
  const origin = process.env.APP_ORIGIN || "https://edu.115.org.vn";
  const clientId = process.env.SSO_CLIENT_ID || "y2FhSDe4EM0VbaSKtfCrniWkhHjJNuZECUxSa2XO";
  const clientSecret = process.env.SSO_CLIENT_SECRET;
  const encryptionKey = process.env.SSO_TOKEN_ENCRYPTION_KEY;
  const url = new URL(issuer), app = new URL(origin);
  if (url.protocol !== "https:" || app.protocol !== "https:" || app.origin !== origin || !clientSecret || !encryptionKey || !/^[a-f0-9]{64}$/i.test(encryptionKey)) throw Error("SSO_CONFIGURATION_REQUIRED");
  return { issuer, origin, clientId, clientSecret, encryptionKey, callback: `${origin}/api/auth/callback/authentik`, logoutCallback: `${origin}/da-dang-xuat` };
}
