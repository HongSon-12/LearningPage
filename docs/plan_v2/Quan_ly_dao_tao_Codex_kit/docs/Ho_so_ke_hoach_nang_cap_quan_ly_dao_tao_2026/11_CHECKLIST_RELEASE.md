# 11. Checklist phát hành production

## A. Source/Build
- [ ] Git sạch, release tag rõ.
- [ ] Lockfile commit.
- [ ] `tsc` đạt.
- [ ] lint đạt.
- [ ] build production đạt.
- [ ] không dùng package beta ngoài quyết định đã ghi ADR.

## B. Database
- [ ] Backup trước migration.
- [ ] Migration review SQL.
- [ ] Staging migrate đạt.
- [ ] Production `migrate deploy` đạt.
- [ ] Index chính có.
- [ ] Pool cấu hình rõ.
- [ ] Restore test đã thực hiện.

## C. Business regression
- [ ] 39/40 concurrency đạt.
- [ ] Retry không trùng.
- [ ] Transfer đạt.
- [ ] Manual/Late đạt.
- [ ] Reject reason đạt.
- [ ] Payment permission đạt.
- [ ] Excel rollback/leading zero đạt.
- [ ] Certificate/GXN/invoice đạt.

## D. UI
- [ ] Admin desktop/mobile.
- [ ] Landing desktop/mobile.
- [ ] Wizard mobile.
- [ ] table overflow.
- [ ] dialog/drawer.
- [ ] keyboard/focus.
- [ ] loading/error/empty.

## E. Security
- [ ] HTTPS.
- [ ] HSTS sau khi xác nhận.
- [ ] CSP/security headers.
- [ ] cookie flags.
- [ ] server-side authz all sensitive routes.
- [ ] upload private.
- [ ] file magic bytes/size/type.
- [ ] search anti-enumeration.
- [ ] rate limit.
- [ ] no secret in repo/image/log.
- [ ] export/download audit.

## F. SSO nếu cutover trong release
- [ ] test/prod client tách riêng.
- [ ] PKCE/state/nonce.
- [ ] issuer/sub link.
- [ ] app session revoke.
- [ ] local/global logout được mô tả đúng.
- [ ] back-channel validation.
- [ ] IdP user disable test.
- [ ] MFA admin.
- [ ] rollback login plan.

## G. Email
- [ ] SMTP production.
- [ ] TLS verify.
- [ ] outbox worker.
- [ ] retry/idempotency.
- [ ] template test.
- [ ] không rollback business vì SMTP fail.

## H. Deployment
- [ ] Docker chạy non-root.
- [ ] Nginx proxy đúng.
- [ ] health endpoint.
- [ ] upload volume persistent.
- [ ] disk capacity/alert.
- [ ] certificate expiration monitoring.

## I. Observability
- [ ] request/correlation ID.
- [ ] 5xx alert.
- [ ] DB alert.
- [ ] disk alert.
- [ ] outbox failed alert.
- [ ] SSO error alert.
- [ ] backup result alert.

## J. Rollback
- [ ] image/tag cũ còn sẵn.
- [ ] DB migration rollback strategy.
- [ ] backup id ghi nhận.
- [ ] người chịu trách nhiệm cutover.
- [ ] smoke test sau rollback.
