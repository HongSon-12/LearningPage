# Phase 00 — Baseline cleanup

Date: 17/10/2026 (Asia/Bangkok)

## Goal
Có baseline lint/typecheck/build/regression xanh trước Phase 1.

## Current state
Lint quét .next-build; source có 14 lỗi no-explicit-any và 11 warnings. Kết quả discovery ở harness/build-log.md.

## In scope
Bỏ generated build khỏi ESLint; dùng kiểu Framer Motion, Prisma, props/return type thật; bỏ unused imports/catch bindings; giữ URL/kích thước ảnh VietQR khi dùng next/image unoptimized.

## Out of scope
UI redesign, thay rule nghiệp vụ/quyền/validation runtime, dependency hoặc schema/migration mới.

## Dependencies
Chỉ dùng package đã cài.

## Data/schema impact
Không thay schema. Test management dùng schema riêng; smoke dùng tài khoản development và dữ liệu test có cleanup.

## Security impact
Giữ nguyên authz và validation Prisma. Enum type assertions chỉ phục vụ TypeScript, không thay validation runtime. Bảo mật upload/search vẫn thuộc phase riêng.

## Performance impact
Lint bỏ generated artifacts. QR vẫn tải URL gốc trực tiếp, không proxy/cache qua Image Optimization API.

## Implementation steps
1. Sửa ignore .next-build.
2. Thay any bằng kiểu sát dữ liệu thực tế và xử lý warnings.
3. Chạy lint/typecheck, build, management và HTTP smoke trên server riêng.
4. Ghi kết quả và rollback vào build log.

## Verification
pnpm lint; pnpm exec tsc --noEmit --incremental false; NEXT_BUILD_DIR=.next-build pnpm build; pnpm test:management; production HTTP smoke.

## Acceptance criteria
Lint không errors/warnings, typecheck/build/regression đạt. Không tắt rule lint, không đổi package/lockfile/schema.

## Rollback
Revert riêng diff của bước cleanup; không reset các thay đổi khác. Không có migration cần rollback.

## Open decisions
Không chốt thêm DECIDE của kế hoạch v2.

## Status
Complete. Lint không errors/warnings; TypeScript, build, management và HTTP regression đạt. Kết quả thực tế trong harness/build-log.md.
