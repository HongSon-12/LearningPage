# 11. Checklist phát hành production

Cập nhật tham chiếu 07/11/2026: [báo cáo tiến độ hiện tại](../../BAO_CAO_TIEN_DO_DU_AN.md) đã ghi các kiểm tra local/SSO và cách tách Compose. Các ô bên dưới là gate phát hành trên môi trường đích; không tự đánh dấu chỉ từ kết quả local. Production dùng PostgreSQL/Nginx có sẵn với `PG_HOST=cap-cuu-115-db`, `PG_PORT=5432`, `DB_NETWORK=PROXY_NETWORK=cap-cuu-115_private`, upstream `edu-app:3000`.

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
