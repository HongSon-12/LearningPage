# 10. Roadmap và backlog ưu tiên

## Quy tắc

- Làm tuần tự theo phase.
- Mỗi phase discovery -> implementation -> test -> build log.
- Package mới được phép theo `12_KE_HOACH_DEPENDENCIES.md`.
- Không tự chốt `DECIDE`.
- UI refactor không được đổi quyền, sĩ số, transaction.

## Phase 0 - Baseline

- [ ] Khôi phục PostgreSQL đúng môi trường.
- [ ] Kiểm tra migration.
- [ ] Inventory package/UI/auth.
- [ ] TypeScript/lint/build/test.
- [ ] Smoke routes.
- [ ] Xác định baseline commit/tag.
- [ ] Ghi build log.

**Exit:** baseline xanh hoặc blocker được phân loại.

## Phase 1 - shadcn foundation

- [ ] Kiểm tra Tailwind/PostCSS/components config.
- [ ] Init/đồng bộ shadcn.
- [ ] Thêm `@tanstack/react-table`, `react-hook-form`, `zod`, `@hookform/resolvers` nếu thiếu.
- [ ] Sonner.
- [ ] Design tokens.
- [ ] AdminShell/Sidebar/Header.
- [ ] StatusBadge/FilterBar/DataTable.
- [ ] Shared forms.
- [ ] Refactor `/login`, `/courses`, `/courses/[classId]`.
- [ ] Desktop/mobile/a11y.
- [ ] Ghi dependency mới.

**Không đổi business logic.**

## Phase 2 - Security hardening

- [ ] Private storage.
- [ ] File authz.
- [ ] Extension/MIME/magic bytes/size.
- [ ] Migrate file references nếu cần.
- [ ] Search chống enumeration.
- [ ] Audit export/download.
- [ ] Rate limit.
- [ ] CSP/security headers.

## Phase 3 - Email reliability

- [ ] EmailOutbox.
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
- [ ] public search UX;
- [ ] SSO revoke SLA;
- [ ] break-glass account.
