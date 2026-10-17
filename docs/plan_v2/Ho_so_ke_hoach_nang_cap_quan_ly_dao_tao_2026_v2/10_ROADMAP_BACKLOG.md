# 10. Roadmap và backlog ưu tiên

## Quy tắc

- Làm tuần tự theo phase.
- Mỗi phase discovery -> implementation -> test -> build log.
- Package mới được phép theo `12_KE_HOACH_DEPENDENCIES.md`.
- Không tự chốt `DECIDE`.
- UI refactor không được đổi quyền, sĩ số, transaction.

## Phase 0 - Baseline

- [x] Khôi phục PostgreSQL đúng môi trường.
- [x] Kiểm tra migration.
- [x] Inventory package/UI/auth.
- [x] TypeScript/lint/build/test.
- [x] Smoke routes.
- [x] Xác định baseline commit/tag.
- [x] Ghi build log.

**Exit:** baseline xanh hoặc blocker được phân loại.

## Phase 1 - shadcn foundation

- [x] Kiểm tra Tailwind/PostCSS/components config.
- [x] Init/đồng bộ shadcn.
- [x] Thêm `@tanstack/react-table`, `react-hook-form`, `zod`, `@hookform/resolvers` nếu thiếu.
- [x] Sonner.
- [x] Design tokens.
- [x] AdminShell/Sidebar/Header.
- [x] StatusBadge/FilterBar/DataTable.
- [x] Shared forms.
- [x] Refactor `/login`, `/courses`, `/courses/[classId]`.
- [x] Desktop/mobile/keyboard cơ bản: 5 viewport, focus và screenshot; UAT nghiệp vụ/screen reader đầy đủ còn ở release.
- [x] Ghi dependency mới.

**Không đổi business logic.**

## Phase 2 - Security hardening

- [x] Private storage.
- [x] File authz.
- [x] Extension/MIME/magic bytes/size.
- [x] Migrate file references nếu cần.
- [x] Search chống enumeration.
- [x] Audit export/download.
- [x] Rate limit.
- [x] CSP/security headers (CSP report-only; HTTPS/HSTS ở phase vận hành).

Hoàn thành triển khai và cutover local ngày 17/10/2026. Container đang chạy chưa được deploy lại; SMTP thật, retention, scan và production release còn là gate riêng. Xem `harness/context/phase-02-security-files-search-context.md`.

## Phase 3 - Email reliability

- [ ] EmailOutbox đầy đủ cho email nghiệp vụ (đã có tối thiểu cho SEARCH_OTP ở phase 2).
- [ ] Templates.
- [ ] Worker/cron.
- [ ] Retry/idempotency.
- [ ] SMTP thật.
- [ ] Quan sát lỗi email.

## Phase 4 - SSO staging

- [ ] Auth facade.
- [ ] Authentik client test.
- [ ] `openid-client`.
- [ ] `jose`.
- [ ] `SsoIdentity`.
- [ ] OIDC start/callback.
- [ ] AppSession.
- [ ] Back-channel logout.
- [ ] Revoke/lock tests.
- [ ] MFA admin.
- [ ] Cutover/rollback staging.

## Phase 5 - Performance/DB

- [ ] Build không phụ thuộc DB không cần thiết.
- [ ] Query select/include.
- [ ] Pagination.
- [ ] Index review.
- [ ] pg pool.
- [ ] next/image/font.
- [ ] bundle review.
- [ ] public cache.
- [ ] benchmark trước/sau.

Không thêm cache/package chỉ vì cảm tính.

## Phase 6 - Landing pages

- [ ] 5 chương trình chính.
- [ ] Shared blocks/content model.
- [ ] Ảnh tối ưu.
- [ ] CTA/classes/related.
- [ ] SEO/OG.
- [ ] Mobile/a11y.

## Phase 7 - Production readiness

- [ ] Docker.
- [ ] Nginx/HTTPS.
- [ ] Backup/restore.
- [ ] Monitoring/logging.
- [ ] UAT.
- [ ] Security review.
- [ ] Dependency audit.
- [ ] Release checklist.
- [ ] Rollback drill.

## LATER

- WebSocket/realtime;
- CMS kéo-thả;
- JIT SSO;
- SAML app khác;
- object storage cluster;
- event bus;
- BI nâng cao;
- theo dõi bưu gửi GCN.

## DECIDE

- [ ] “cùng khóa học” = `courseType` hay `courseBatch`;
- [ ] thời hạn giữ chỗ;
- [ ] chuyển lớp chênh học phí;
- [ ] email reject/manual/late;
- [ ] GCN logistics;
- [ ] multi-role;
- [x] public search UX: CCCD -> mã xác thực email -> lịch sử học từ hồ sơ Student (ADR-019, 17/10/2026);
- [ ] SSO revoke SLA;
- [ ] break-glass account.


### Điều chỉnh theo người dùng — hồ sơ học viên/OTP
Đã thêm Student và liên kết nhiều lần Registration; admin đối chiếu hồ sơ trong `/students`, quản lý xem theo lớp. Tra cứu hiện dùng CCCD/mã email, không còn yêu cầu mã đăng ký/email để nhận link. OTP và lịch sử chỉ mở sau xác thực; hồ sơ/lần đăng ký mâu thuẫn được giữ để đối chiếu. Xem ADR-019 và context phase02b. SMTP thật, lịch worker, dữ liệu cần đối chiếu và rollout vẫn cần xử lý.
