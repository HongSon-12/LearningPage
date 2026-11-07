// Production defaults to SSO; local password auth must be explicitly selected for fixtures.
export function ssoEnabled() {
  return process.env.AUTH_MODE === "sso" || (process.env.NODE_ENV === "production" && process.env.AUTH_MODE !== "local");
}
