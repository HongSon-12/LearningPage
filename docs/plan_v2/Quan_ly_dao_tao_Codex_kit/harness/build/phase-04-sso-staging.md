# Phase 04 - SSO staging

## Goal
Authentik OIDC hoạt động trên staging, rollback được.

## Dependencies
`openid-client`, `jose`.

Không thêm NextAuth v4 vào training app.

## Tasks
- auth facade;
- SsoIdentity;
- AppSession;
- code+PKCE/state/nonce;
- local/global logout;
- back-channel;
- lock/revoke tests;
- MFA admin.

## Done
Token không lộ, forged claims bị reject, revoke hoạt động, app role vẫn ở DB app.
