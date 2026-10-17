# Build log

Các entry chỉ phản ánh kiểm tra đã chạy; không xóa lịch sử.

## 17/10/2026 — Phase 00: baseline discovery

Date: 17/10/2026 (Asia/Bangkok)
Phase: 00
Base commit: `a6ff1a2672ee606aa5a0f6ff87f64b7f1aee46e7`
Environment: WSL Debian, repository `/home/sonnguyen/Learning`, Node 22.22.2, pnpm 11.21.0. PostgreSQL development `ttcc_db`, public schema, localhost:5432.

### Discovery

Đã đọc toàn bộ 17 hồ sơ v2, hướng dẫn Codex kit và các phase templates; xác nhận bộ hồ sơ trong kit giống bản chính. Đã kiểm tra package/lockfile, cấu hình, source routes, auth/session, schema/migration, upload, search, mailer và test hiện có.

Stack thực tế: Next 16.3.0; React/React DOM 19.2.8; Prisma/client/adapter-pg 7.9.1; pg 8.23.0; Tailwind/@tailwindcss/postcss 4.3.3; TypeScript 5.9.3; ESLint 9.39.5. Chưa có shadcn config/components hoặc dependency UI/form/table/SSO mới trong package.json.

Domain services admissions/transfers/excel đã tách khỏi UI. Có ba role ADMIN/CLASS_MANAGER/ACCOUNTANT, server-side session và scope lớp theo managerId. Chưa thực hiện audit quyền toàn bộ endpoint.

### Changes

Chỉ thêm tài liệu `harness/build/phase-00-baseline-discovery.md`, `harness/context/phase-00-baseline-context.md` và entry này. Không sửa source nghiệp vụ hoặc tài liệu lịch sử. Không tự tạo commit/tag.

### Dependencies added/removed

Không có. Prisma Client được generate lại bằng phiên bản đang cài.

### Schema/migrations

Hai migration hiện có, schema up to date. Không deploy/dev/reset migration. Test management dùng schema ngẫu nhiên riêng và tự dọn; HTTP test dùng dữ liệu development và tự dọn user test/session của lượt chạy thành công.

### Tests run

| Check | Result | Evidence |
|---|---|---|
| `pnpm exec prisma migrate status` | PASS | 2 migrations; database schema up to date |
| `pnpm exec prisma generate` | PASS | Prisma Client 7.9.1 generated |
| `pnpm exec tsc --noEmit --incremental false` | PASS | exit 0 |
| `pnpm lint` | FAIL | 427 errors, 10602 warnings; .next-build bị quét như source |
| Source-only ESLint | FAIL | 14 errors, 11 warnings; tất cả errors là no-explicit-any |
| `NEXT_BUILD_DIR=.next-build pnpm build` | PASS | compiled, TypeScript, generated pages; exit 0; DB đang hoạt động |
| `pnpm test:management` | PASS | concurrency 39/40, idempotency, transfer/scope/history, Excel preview/rollback/leading zeros/permissions, late registration |
| `TEST_BASE_URL=http://localhost:3101 pnpm test:http` | PASS | public routes, redirects, admin login, Excel, manager/accountant scope và inactive session |
| Same smoke using 127.0.0.1:3101 initially | FAIL | login 403 do Origin khác request URL nội bộ; localhost rerun đạt |
| Visual/mobile/a11y UAT | NOT RUN | chưa nghiệm thu UI |
| SMTP thật / Authentik / Docker/TLS/backup-restore | NOT RUN | chưa nghiệm thu các hệ thống ngoài |

Source-only ESLint command: `pnpm exec eslint src tests scripts next.config.ts prisma.config.ts --format json`.

Source lint errors:
- LandingSections.tsx: 1 any.
- CourseListUser.tsx: 1 any.
- hocsocapcuu/courses/page.tsx: 1 any.
- RegistrationWizard.tsx: 3 any.
- SearchClient.tsx: 1 any.
- actions/class.ts: 7 any.

### Results

Phase 00 discovery hoàn tất với blocker được phân loại. DB/build/regression hiện chạy được; toàn bộ baseline chưa xanh vì lint. Không coi PASS của các test hiện có là bằng chứng toàn bộ security, UI hoặc production readiness.

Server test production được mở riêng ở localhost:3101 và đã dừng sau kiểm thử; không thay thế dev server cổng 3001. Có cảnh báo dùng standalone server thay next start khi output=standalone; kiểm thử container/standalone cần làm riêng ở phase vận hành. Probe dev cổng 3001 timeout, không tự khởi động lại tiến trình của người dùng.

### Security notes

Release blockers còn tồn tại: public upload hồ sơ, search một định danh trả PII, thiếu file authz/audit download; email chưa durable. Login dùng origin check, cookie/session và active checks đã có. Không ghi credential/PII/token vào log này. SSO chưa được tích hợp.

### Performance notes

Chưa benchmark. RootLayout vẫn đọc DB; pool pg chưa đặt giới hạn/timeout rõ ràng. Build đạt với DB sẵn sàng, chưa kiểm thử điều kiện DB không sẵn sàng.

### Open decisions

Giữ nguyên toàn bộ DECIDE trong roadmap. Không thay business rule chuyển lớp, học phí, thời hạn giữ chỗ, email, multi-role hoặc chính sách SSO.

### Rollback

Không có thay đổi source/schema/dependency cần rollback. Có thể bỏ tài liệu harness mới; generated client/build tạo lại được.

### Next

1. Sửa phạm vi ESLint để bỏ generated output, thay any bằng kiểu phù hợp và xử lý warnings có căn cứ; chạy lại checks liên quan.
2. Phase 1: triển khai shadcn foundation/tokens/AdminShell/shared components rồi login/courses/roster; giữ regression nghiệp vụ.
3. Theo roadmap tiếp tục private storage/search, outbox, SSO staging, hiệu năng, landing và vận hành. Security blockers phải được đóng trước production.

## 17/10/2026 — Phase 00: baseline cleanup

Date: 17/10/2026 (Asia/Bangkok)
Phase: 00 cleanup, trước shadcn foundation
Base commit: `a6ff1a2672ee606aa5a0f6ff87f64b7f1aee46e7`
Environment: WSL Debian, Node 22.22.2, pnpm 11.21.0; PostgreSQL development hiện có.

### Discovery

Xác nhận lại 14 lỗi any và 11 warnings trong source. ESLint mặc định chưa bỏ .next-build. Không có thay đổi tracked khác lúc bắt đầu bước cleanup.

### Changes

- ESLint bỏ `.next-build/**`, giữ nguyên bộ rule Next/TypeScript.
- Framer Motion variants dùng `Variants` từ package đang cài.
- Page/course list dùng chung `CourseData`; wizard props dùng `Pick<Class/Setting>` từ Prisma; kết quả search suy ra từ return type Server Action.
- Class actions dùng enum types Prisma và giới tính dùng kiểu state hiện có; không đổi validation/runtime logic.
- Bỏ imports và catch bindings không dùng.
- VietQR dùng next/image `unoptimized`, giữ URL gốc, CSS kích thước 192px/256px và tải trực tiếp; thêm intrinsic width/height 256.

### Dependencies added/removed

Không có; package.json/lockfile không đổi.

### Schema/migrations

Không có thay đổi schema/migration. Management test chạy schema riêng; HTTP test tự dọn user/session test theo script hiện có.

### Tests run

| Check | Result | Evidence |
|---|---|---|
| `pnpm lint` | PASS | exit 0, không errors hoặc warnings |
| `pnpm exec tsc --noEmit --incremental false` | PASS | không diagnostics; production build typecheck cũng đạt |
| `git diff --check` | PASS | không whitespace errors |
| `NEXT_BUILD_DIR=.next-build pnpm build` | PASS | compiled, TypeScript, generated pages; exit 0 |
| `pnpm test:management` | PASS | 6 nhóm test: 39/40 concurrency, idempotency, transfer/scope/history, Excel preview/rollback/leading zeros/quyền, late registration |
| `TEST_BASE_URL=http://localhost:3101 pnpm test:http` | PASS | public/admin routes, login, Excel, role/scope, inactive-session denial |
| One-off SSR check cho next/image VietQR | PASS | URL gốc giữ nguyên, không /_next/image, intrinsic size và responsive CSS đúng |

HTTP server được tạo riêng ở localhost:3101 rồi dừng trong finally. Không thay thế dev server. Smoke test vẫn dùng next start cho bản build như baseline; chưa nghiệm thu standalone/container deployment.

### Results

Baseline lint/typecheck/build/business regression/HTTP hiện xanh. Lint blocker của entry discovery đã được giải quyết. Không mở rộng tuyên bố này sang visual UAT, security hoặc production readiness.

### Security notes

Không thay quyền, session, rule sĩ số/chuyển lớp hoặc validation runtime. Type assertion enum không thay thế validation phía server; Prisma tiếp tục validate enum như trước. Upload/search/outbox/SSO vẫn cần phase tương ứng.

### Performance notes

Lint không còn quét generated build. Không thêm dependency client. QR không đi qua Image Optimization API.

### Open decisions

Không chốt thêm DECIDE.

### Rollback

Revert riêng 7 file source/config của bước cleanup nếu cần; giữ các thay đổi khác và lịch sử harness. Không có migration hoặc dữ liệu cần rollback.

### Next

Phase 1: shadcn foundation — dependency discovery/compatibility, tokens, shared UI/AdminShell, rồi login/courses/roster; giữ regression hiện tại làm gate.

## 17/10/2026 — Phase 01: shadcn foundation

Date: 17/10/2026 (Asia/Bangkok)
Phase: 01
Base commit: `a6ff1a2672ee606aa5a0f6ff87f64b7f1aee46e7`; Phase00 cleanup diff vẫn giữ, không tự commit/tag.
Environment: WSL Debian; Node22.22.2/pnpm11.21.0; PostgreSQL development; output .next-build.

### Discovery

Đọc source/login/courses/roster/auth boundaries, docs UI/dependency, Next.js bundled server/client và lazy-loading guides. Đọc docs shadcn/RHF, TanStack và React hiện hành cùng npm metadata/peer/engine/license.

### Changes

- components.json new-york/Radix, reusable primitives, tokens và cn utility; palette public cũ được giữ, admin portal scope riêng.
- Responsive AdminShell với active nav, role-aware links, mobile Sheet, skip link và Sonner. Page-level auth vẫn chạy server.
- Login RHF/Zod, labels/inline errors/loading; shared TextField/ClassForm.
- Courses: program/status/date/search filters, sortable/paged/column-toggle DataTable, class create/edit form và AlertDialog delete.
- Roster: cùng DataTable, shared statuses/cards/textarea; giữ action quản lý, review, payment, documents, history, transfer và Excel. Overlay chuyển sang Radix, focus trap/return hoạt động.
- Mobile horizontal keyboard scroll, sticky actions, label/44px controls, error/retry và table skeleton sau auth checks.
- Root lang=vi và font tokens nối Geist. Không đổi schema/domain/Server Action runtime logic.

### Dependencies added/removed

Runtime direct: @tanstack/react-table9.3.1, RHF7.90.0, Zod4.6.7, resolver5.9.1, Sonner2.0.8, Radix1.8.1, cn0.4.0, CVA0.7.1, tw-animate-css1.4.0. Dev: Playwright1.64.1. Chi tiết use-case/compat/license/rollback ở dependency plan và phase plan.

shadcn4.22.0 và Prettier3.6.2 dùng dlx, không là runtime dependency. Giữ Next16.3.0/React19.2.8/Prisma7.9.1. Lockfile được cập nhật; pnpm-workspace không có exception mới cuối phase.

### Schema/migrations

Không có. Browser test chỉ tạo dữ liệu giả và cleanup theo ID/code riêng của run. HTTP test và management test dùng cleanup sẵn có.

### Tests run

| Check | Final result |
|---|---|
| TypeScript (`tsc --noEmit --incremental false` và build typecheck) | PASS |
| pnpm lint | PASS, không errors/warnings, không tắt rule |
| NEXT_BUILD_DIR=.next-build pnpm build | PASS |
| pnpm test:management | PASS, 6 nhóm gồm39/40 và12 submits concurrent |
| TEST_BASE_URL=http://localhost:3102 pnpm test:http | PASS, public/admin/auth/Excel/role/scope/inactive session |
| pnpm test:ui | PASS,5 groups trong19.6s |
| Browser screenshot review | PASS cơ bản, login/courses/roster/dialog desktop/mobile;360/390/768/1366/1440 |
| git diff --check | PASS |

UI groups: invalid/valid login+labels/responsive; class filters/sort/page/columns/CRUD; roster tabs/payment/approve/reject guard; manager/accountant UI/scope404; mobile menu/horizontal keyboard scroll/focus trap/restore.

### Findings resolved during verification

1. V8 table adapter có compiler incompatibility warning: chuyển native9 theo docs, ADR015.
2. Focus mất sau close/cancel do table cells refresh: memoize column definitions và dùng logical trigger IDs.
3. Global loading boundary làm denied-route404 trở thành streamed200: bỏ boundary, skeleton đặt sau auth/scope check. Không nới assertion hoặc quyền.
4. Chỉnh test locators tránh marker dấu* và route announcer; login helper giữ redirect role hiện hữu (/registrations cho non-admin).

### Results

Implementation/technical regression Phase1 đạt. Không claim UAT nghiệp vụ, full screen-reader/contrast audit, performance benchmark hoặc production-ready. Các phase security/email/SSO/ops chưa được hoàn thành bởi UI change.

### Security notes

Server guards, scopes, capacity/transfer transactions và backend validation giữ nguyên. Không có secret trong source/artifact; screenshots dùng synthetic fixtures. Upload/search PII blockers vẫn còn và thuộc Phase2. Không gọi SMTP/SSO production trong phase này.

### Performance notes

Pages giữ server data access; shared table chỉ client state. Pagination hiện không giảm dataset tải về; Phase5 cần server pagination/select và đo lường. Không tự nhận có code-splitting từ server dynamic imports vì Next guide ghi giới hạn này.

### Open decisions

Không chốt thêm business DECIDE. Technical implementation không thay courseBatch rule, fee difference, reservation expiry, manual/late/reject email hoặc SSO policy.

### Rollback

Revert riêng phase1 UI/config/dependency/test changes, giữ Phase00 cleanup và dữ liệu. Không có schema rollback. Browser screenshots/output nằm .local ngoài Git; test servers được dừng sau test.

### Next

Phase2 discovery và triển khai private storage/file access/search hardening theo plan; các quyết định UX/retention/business chưa chốt cần được giữ riêng.


## 2026-10-17 — Phase 02: private files and one-use email lookup

### Outcome and human decision
User chose a one-use lookup link by email. Implemented registration ID + matching registered email request, explicit POST redemption, 15-minute 256-bit hash-only tokens, masked/minimal results. Email remains optional for registration; no single phone/CCCD lookup fallback. Other DECIDE items remain open.

### Changes
- Added StoredFile and Registration file FKs, AuditLog, persisted RateLimit, SearchToken, minimal SEARCH_LINK EmailOutbox and additive transactional migration.
- Private runtime storage with bounded body/file checks, extension/MIME/signature validation, owner/class/kind checks and exclusive claims in roster transactions. Receipt and Excel paths enforce the same ownership rules. Downloads require an active session/current class scope; accountants get receipts only. Generic attachment names, sandbox/nosniff/no-store, download/export audits and denied legacy paths.
- Wizard displays/copies registration ID, binds staged identity/qualification/receipt files, preserves optional email and distinguishes received information from approval/payment. Protected downloads replace inline document previews.
- Origin checks, database rate limits and proxy controls. Next security headers/CSP report-only, Nginx limits/body size/legacy denial. Compose private volume/no public app port; DB host port local only. Existing containers were not reloaded or deployed.
- Leased search-email worker with retry/backoff, dedupe, safe error codes and token rotation. Only fake sender used in tests; no real email sent, no automatic worker schedule installed. Remaining business email reliability belongs to phase 3.
- Global GA/Meta/Clarity temporarily paused until route/consent isolation. Private files/backups/.env excluded from Docker and Next traces. Build post-check strips Next's generated standalone .env copies and rejects private traces. Prisma generate now uses the locked local CLI in Docker.

### Local data cutover and recovery evidence
- Pre-cutover backup: `.local/backups/security-2026-10-17T06-52-20-879Z-1366beb7/` (protected, ignored by Git).
- Original 8 registrations preserved. 6 legacy PNGs copied/hashed and retained; 4 references mapped to 4 private records/FKs; 2 unreferenced files preserved. Original upload folder quarantined after verification, rollback manifest retained.
- Backup restored into a random temporary DB: 8 records + 2 pre-upgrade migrations. Client 17/server 16 emits unsupported transaction_timeout session SET; verifier accepts exactly that one known compatibility error and no others. Temporary DB removed. Operational backups should use matching-major tools.
- Final actual-data check: 8 registrations, 4 stored-file hashes valid, 0 legacy public references, 0 synthetic classes/schemas left, 4 private disk files.

### Validation
- Lint: pass with no warnings/errors. TypeScript/build: pass without build warnings; standalone private-data gate: pass (57 MB including static assets, no private directories/environment copies).
- Management integration: 6 groups pass, including 39/40 + 12 concurrent admissions, idempotency, scoped transfers, Excel preview/update/rollback and late admissions.
- Security integration: 6 groups pass: Origin/multipart/chunks/extension/MIME/signatures/size; path/symlink/private permissions; concurrent owner count/rate limits; attachment ownership/kind/scope/transfer; uniform lookup/hash/expiry/concurrent replay/minimal result; worker claim/retry/failure and legacy migration rehearsal.
- HTTP smoke: public/admin/manager/accountant/disabled-session checks pass on owned temporary server 3102.
- Playwright: **8 passed (26.6s)** against the actual standalone artifact on owned server 3101, including prior 5 UI groups and 3 security flows. Public wizard verified identity+receipt FK binding with no email. Lookup tested fresh and same-tab fragment capture, explicit click, initials, replay, mobile 390px. Screenshot `.local/ui-phase2/lookup-result-390.png` visually inspected.
- Docker Compose configuration and isolated Nginx syntax checks pass. No existing service restarted. Test servers stopped; diff whitespace check pass.

### Findings fixed during verification
1. Native dynamic import in Playwright bypassed alias resolution; used static test import and isolated selected fake-email job.
2. Same-document fragment navigation did not remount the search page; added hashchange capture and StrictMode-safe pending handling.
3. Runtime filesystem paths caused broad output tracing, including local data. Removed the generated artifact, fixed runtime-only tracing annotations, added exclusions and a failing output gate; rebuilt to 55 MB clean artifact. Next's independent .env copy also explicitly stripped. No affected artifact was deployed.

### Remaining gates / next phase
SMTP receipt verification, automatic worker execution/monitoring, all other business email outbox triggers, malware scanning, retention, TLS/HSTS/CSP enforcement/review, UAT and deployment remain. Current Docker containers still run the old image/mounts; do not treat source/local DB cutover as deployment. Old document files existed in Git/images: current removal does not erase history/other copies. Phase 3 continues email reliability; rollback must keep old public URLs blocked and preserve private volume + protected backup.


## 2026-10-17 — Student dossiers + CCCD/email verification code (Phase 02b)

### User decision and result
User replaced email-link lookup with CCCD → code sent by email → learning history, then proposed a single student dossier to resolve duplicated identity/contact information. Implemented Student as the canonical identity/contact, Registration as the linked intake/class/payment/certificate snapshot. Added `/students` and scoped detail pages with admin confirmation/editing. ADR-019 supersedes ADR-016; other business decisions remain open.

### Implementation
- Additive transactional migration `20261017000100_cccd_email_otp`: Student, Registration.studentId/profileReviewRequired, LookupChallenge, student-linked SEARCH_OTP jobs and indexes. Existing valid CCCDs normalize/group; invalid IDs remain separate. Inconsistent/missing email or name/DOB groups are marked for staff review. Every old registration retained and linked; old link tokens/jobs revoked.
- Signup/manual/Excel create/link Student without overwriting existing canonical contact. Excel cannot change an established CCCD; admin dossier confirmation is the explicit identity correction path. Duplicate seat checks also match studentId, protecting against legacy snapshot mismatches. Transfers, seat rules and file ownership stay intact. New public signup validates12-digit CCCD; email remains optional.
- Public lookup accepts CCCD alone for a generic request, then requires6-digit email OTP. HMAC-SHA256 +32-byte runtime secret,10-minute expiry, 5 failed guesses, atomic one-use/attempt cap, cooldown/rate, retry rotation and recipient/identity binding. No raw code in DB/outbox/log/URL. Secret generated only in ignored 0600 local .env; not included in build. No new dependency.
- Verified history returns initials and course/status/document allowlist only, up to 100 recent verified registrations. Review-needed registrations are suppressed from results AND totals; missing or alternate signup email cannot claim another history. Admin confirmation explicitly covers identity,email and linked records, audits metadata only, revokes codes/cancels queued sends.
- Student list paginated 20. Manager sees only assigned-class history and cannot edit global profile; accountant CCCD masked. Direct manager/accountant replay of the admin mutation is denied by server authorization, not just hidden UI.

### Data/recovery
Pre-change backup `.local/backups/security-2026-10-17T07-28-11-339Z-f20d483b/` restored in temporary DB: 8 registrations and 3 prior migrations (same documented pg17/server16 session-setting compatibility exception, no other restore errors). Migration applied locally. Final inventory:8 registrations,8 Student profiles,7 needing identity/email review,0 unlinked/orphan/test profiles/classes/schemas,4 stored-file checksums verified. Prior file backups/quarantine retained. No records/files removed or contact values invented.

### Verification
- Lint, TypeScript, production build and private-artifact gate pass without warnings.
- Populated migration rehearsal passes: consistent/format-variant/leading-zero IDs group, conflicting/missing emails remain gated, invalid IDs stay separate, old links revoked.
- Security integration passes: prior file/body/role/scope controls plus profile linking, unchanged canonical destination, alternate/missing email suppression, student-based duplicate guard, blocked identity edits through Excel, HMAC code persistence, one-use race, expiry, 5 concurrent wrong attempts, recipient change, fake SMTP retries/failure.
- Domain integration 6 groups pass including 39/40 + 12 concurrent admissions, transfers, Excel preview/update/rollback and late registration.
- Playwright full 9 groups passed (24.8s). Focused 4 security/profile flows rerun after final changes passed (8.8s), including direct role-forged action calls and optional-email wizard. Dossier visual/permission test rerun passed (2.9s), desktop 1440/mobile 390 screenshots captured and width checked.
- HTTP smoke passes public/admin/student routes, role scope and disabled-session revocation on owned temporary server 3102. Test servers stopped after runs; fixtures cleaned. Screenshot visual review passed for mobile OTP history and desktop dossier.

### Findings resolved
1. Existing link UX and email duplicated per Registration were replaced by one canonical Student destination rather than choosing the latest email.
2. A public registration must not overwrite a profile's email or expose unmatched histories. Unconfirmed snapshots are filtered, and both result query and count use one shared filter; tests caught and fixed an initially unfiltered count.
3. Raw migration fixture needed explicit Class.updatedAt (ORM normally supplies it); rehearsal corrected without relaxing schema.
4. Old link instructions in public UI were replaced with CCCD/code instructions; tests use valid synthetic 12-digit IDs and never send real email.

### Remaining gates
7 actual legacy profiles need human identity/email reconciliation through the dossier. Broad merge/split of misassigned historical identities is not automated. Actual SMTP delivery, worker scheduling/monitoring, remaining business email outbox work, UAT and container rollout remain. No real message sent, no existing container rebuilt/reloaded, no Git history rewrite. Global analytics remain paused and private file controls unchanged.


## 2026-10-17 — Phase02c: accounts and class-session attendance
Date: 2026-10-17
Phase: 02c, user-requested extension
Base commit: a6ff1a2672ee606aa5a0f6ff87f64b7f1aee46e7
Discovery: /users already supported basic account create/edit/role/lock but had legacy UI and non-atomic account/session mutations. No session/attendance model. Global camera=() blocked camera. Existing private ID docs include PDF; public/optimizing them would violate phase02 rules. Installed Next guides read; primary jsQR/getUserMedia/Permissions-Policy documentation reviewed.
Changes: /users moved to shadcn/TanStack/RHF/Zod/Sonner,3 role explanations and assignments. Transactional admin account checks, active-admin protection, assignment safety, session revocation,72-byte bcrypt input limit and audit. Class sessions create/edit/close/reopen; scoped attendance QR or manual lookup, registered ID raster preview, explicit human compare/confirm/cancel, undo/audit, idempotence and preserved transfer history. Camera only permitted on attendance page, local decoding, all track cleanup cases. New front-ID upload wording. Shared dialogs retain existing destructive defaults and support explicit attendance labels + initial review focus.
Dependencies: jsqr1.4.0 Apache-2.0 pinned,0 runtime dependencies, lazy camera-only chunk129,980bytes /46,212gzip. qrcode1.5.4 MIT used via dlx once for a synthetic test PNG, not retained as app dependency. Framework versions unchanged. Details in phase02c plan and ADR020.
Migrations: additive20261017000200_class_attendance rehearsed isolated then deployed local after protected backup. Restrictive FKs retain history; no reset/drop real DB. Backup security-2026-10-17T08-02-31-494Z-6050a2f5 restored into temporary DB (8 records/4 prior migrations), same documented pg17/16 setting exception only;5 migrations now current.
Tests: tsc,lint(no warnings),production build/private-trace gate,management/security/students/attendance integration,HTTP smoke all PASS. Final standalone Playwright15/15 PASS37.2s. Actual jsQR decoder with synthetic MediaStream; role/class raw action replay; private preview; QR not auto-presence; manual confirm/undo/close; camera denial/late permission cleanup;390px visual and focus review.
Results: original8 registrations/8 student profiles/4 private file hashes preserved;7 old profiles still require review,0 unlinked/orphan profiles.0 test schemas/users/classes/attendance rows remain. Temporary3101/3102 stopped. Diff whitespace check PASS.
Security: no new public ID files, no image optimizer, no QR personal payload or frames transmitted; no passwords/PII in audit. Server rechecks fresh active roles/class scope and roster in shared transaction. Private image-only endpoint verifies binding/signature/hash and no-store/nosniff/CSP; PDF stays attachment.
Performance: camera decoder lazy; dimensions/rate bounded960px/200ms. Search limited20 manual or2 for QR ambiguity, indexed scoped query; no external decoder service.
Open decisions: user keeps3 roles now; future customization of CLASS_MANAGER/ACCOUNTANT only, ADMIN protected. Not implemented as permission editor. Unknown QR formats fall back to manual; no government/NFC/card-authenticity integration.
Rollback: preserve additive tables/history/private restrictions; revert only this phase code carefully among earlier uncommitted work. No restoration over new attendance without a data-recovery plan.
Next: actual Android Chrome/iOS Safari/card acceptance over HTTPS, then container rollout following the release procedure; earlier SMTP/operations gates remain.


## 2026-10-17 — Phase02d: consistent selects and date/time controls
Date: 2026-10-17
Phase: 02d, user-requested UI consistency
Base commit: a6ff1a2672ee606aa5a0f6ff87f64b7f1aee46e7
Discovery: screenshots showed native browser dropdown/date UI. Inventory found native/generated selects across class/user/roster/payment/transfer/manual/public forms and dates/times in filters/class/session/profile/signup. Existing radix-ui covered Select/Popover, no calendar dependency. Relevant installed Next guide and current primary DayPicker/shadcn/Radix docs read.
Changes: shared shadcn-style Select/Popover/Calendar plus SelectField/SelectOption/DateTimePicker and RHF controlled bindings. All visible native controls migrated. White menus, blue selection/check, long labels wrap, bounded scroll, consistent44px inputs, clear focus/keyboard/Escape. Vietnamese calendar with month/year, today/clear; dd/mm/yyyy including mobile8digit entry,24h time, compact Ngày/Giờ combined popup. Canonical hidden FormData and RHF values preserved; invalid date drafts rejected and filter-reset clears them. Portal accent scoped via ui-overlay/ui-control, public brand unchanged.
Dependencies: direct @daypicker/react10.0.2 MIT, wraps react-day-picker10.0.2 + date-fns/@date-fns/tz;4new packages. No existing major upgrades/UI framework added. Calendar-related client chunk~155KB/~48KBgzip. Native scaffold component retained but unused.
Migrations: none. Domain/API/authorization unchanged; earlier phase work preserved.
Tests: test:date-time PASS, including TZ Asia/Bangkok and Pacific/Kiritimati; tsc/lint(no warnings)/production build/private-artifact gate PASS. Final full Playwright20/20 PASS53.0s:5control groups +15existing. HTTP smoke PASS. Screenshots360/390/1440 and nested date/time popup visually reviewed in .local/ui-controls. Tests click visible Radix options; canonical dates/times verified in actual DB after form saves.
Results:8 original registrations/8students/4privatefilehashes preserved,7review,0unlinked/orphan.0control/attendance fixture users/classes/schemas.1existing non-fixture class session preserved. Temporary3101/3102 stopped. No container rollout.
Security: no new data exposure, API bypass, analytics, external service or schema change. Only synthetic fixtures; cleanup guarded to created IDs/profiles from this run.
Performance: calendar locale vi only; no new state/form framework. Popup content mounts when used; calendar code belongs to relevant client controls.
Open decisions: none required for this UI correction; physical browser/device QA and earlier operational/SMTP/deployment gates remain as before.
Rollback: revert only phase02d UI/dependency hunks without discarding earlier dirty work; no data rollback needed.
Next: review the updated local UI, continue remaining v2 phases separately.


## 2026-10-17 — Phase02e: admin width, page titles and student usability
Date: 2026-10-17
Phase: 02e, user-requested layout correction
Base commit: a6ff1a2672ee606aa5a0f6ff87f64b7f1aee46e7
Discovery: shared1600px cap plus page1280/1152/1024px centered caps,32px padding and duplicate80px banner/big breadcrumb-title blocks caused empty margins and vertical waste. Student directory had no search/filter; detail was a narrow vertical stack. Installed Next layout guide read; prior server/client serialization guidance preserved.
Changes: fluid shared body with16/20px padding,64px aligned brand/topbar; one page H1 at top with path-keyed dynamic metadata/parent links, compact descriptions/actions, route scroll reset. Remove only page outer caps, preserve intended sidebar/dialog/text dimensions. Student directory server action/search/filter/pagination with scoped counts and20rows, compact table/mobile cards; profile/editor/history columns with mobile quick anchors/container sizing. Fix select/date hidden-control space-y margin causing row misalignment; calendar width layout preserved.
Dependencies: none added; existing shadcn/Radix/Prisma stack.
Migrations: none; no reset/delete real data. Only own synthetic fixtures created/cleaned in tests.
Tests: tsc/lint(0warnings),production build/private artifact gate PASS; test:student-directory and test:date-time PASS; HTTP smoke PASS. Final full Playwright23/23 PASS59.1s. Added3 groups for all7root page headings/available width,360/390/1440/1866/2560 screenshots, field alignment, dynamic profile navigation,21-record search/pagination/review, raw action scope and accountant mask. Existing20account/attendance/security/form/table cases also pass. Visual review .local/ui-layout.
Results:8original registrations/8students/4private file hashes preserved,7review,0unlinked/orphan.0layout test users/classes/students and0directory schemas; temporary3101/3102 stopped. Existing actual sessions/history not touched. No container deploy.
Security: server session/role/class scope checked on search; class filters/counts/snapshot review share scope. No full CCCD serialized/searchable for accountants, no PII query URLs/logs. Canonical edit remains admin-only and revokes pending OTPs as before. No private file rules changed.
Performance: bounded query input and20-row server pagination; consistent count/page/read transaction; no all-students client dataset. No new package or external service.
Open decisions: none needed for requested layout; prior operational/SSO/SMTP/physical camera gates unchanged.
Rollback: revert only phase02e UI/query/action hunks among earlier dirty work; no data/schema rollback.
Next: user review of updated local layout; continue remaining v2 phases separately.


## 2026-10-17 — Phase02f: consistent UI and returning registration
Base commit: a6ff1a2672ee606aa5a0f6ff87f64b7f1aee46e7
User requested UI/UX/font/number consistency and CCCD first with previous information for returning students.
Changes: shared table headings/padding/middle alignment, right-aligned compact actions and consistent button surfaces;14px main,13px supporting/badges,28px stats/tabular numbers; public input/select/date44px with16px mobile/14px desktop. Explicit font utilities avoid cn treating custom text tokens as colors. RegistrationIdentity CCCD gate, manual fallback, shared generic email OTP request and single-use transaction verification bound to expected CCCD; minimal DTO canonical details plus only resolved/matching optional snapshots. Editable new registration retains canonical email and review rules; no files/notes/internal data returned. Compact welcome, pending OTP survives back, identity reset clears data, upload/save locks changes, step scroll and mobile support link replace obstructing floating call.
Dependencies/migrations: none. No deployment/branch/commit, prior dirty work retained.
Validation: production build/private artifact trace gate,tsc,lint0warnings PASS. Security integration isolated schema PASS with prefill wrong ID/code, concurrent one-use/replay/expiry/minimal DTO/canonical+resolved data. Final full Playwright24/24 PASS1.1m. Existing accounts/QR/attendance/roles/private files/controls/layout and both public registrations pass. Runtime fonts/sizes checked and desktop/mobile screenshots visually reviewed.
Results:8original registrations/8student profiles/4privatefilehashes preserved,7review,0unlinked/orphan.0test fixture classes/schemas/layout users/students; temporary browser server stopped automatically. Existing user session/history retained.
Limits: real SMTP remains unconfigured; no real messages sent, fake sender used only for synthetic OTP tests. Worker/SMTP delivery and container rollout are prior operational gates.7legacy profiles still require human reconciliation before OTP reuse. No automatic disclosure of prior profile existence.
Rollback: revert only phase02f UI/action/DAL hunks among previous dirty work; no data rollback. Details in harness/build/phase-02f-ui-consistency-returning-registration.md.


## 2026-10-17 — Phase02g: continuous hover, clear buttons and larger management typography
Base commit: a6ff1a2672ee606aa5a0f6ff87f64b7f1aee46e7
User: hover highlighting appears displaced; buttons/icons lack affordance; management text/numbers too small.
Root cause: sticky action cells had independent white backgrounds while row hover painted only the row. Changed TableCell to inherit row background, removed action-specific fills, made headers uniformly opaque; row hover/focus only for data rows. No row color transition mismatch or geometry changes.
Changes: scoped admin font tokens main16/support14/title20/stat32, including portalled calendars/menus; length caption variable with public13px fallback. New action and danger-outline Button variants,blue/rose surfaces,borders/hover/active states; icon title from aria-label,40pxdesktop/44pxtouch. Admin actions/reset/refresh/open-profile/buttons updated; dashboard tiny arrows now labeled Xem lớp. Intrinsic width wrapper reserves whole action group and prevents capacity-column overlap; student actions176px and status filter192px. No dependency/schema/domain/permission change.
Validation: build/type/private-artifact trace gate and lint0warnings PASS. Full Playwright25/25 PASS1.2m (24prior plus hover/type regression). Final production build and4layout cases PASS12.2s after intrinsic width adjustment. Actual per-cell/header background comparison, row geometry, button bounds/border/size,title/red delete,desktop/mobile sticky behavior and typography assertions; screenshots reviewed .local/ui-layout/hover-*.png.
Data preservation and fixture cleanup verified by existing read-only scripts; no real user session/history modified. No branch/commit/container deployment. Previous dirty work retained. SMTP and other earlier operational gates unchanged.
Rollback only phase02g CSS/component/display hunks, no data rollback needed.
