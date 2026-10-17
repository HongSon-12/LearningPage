# AGENTS.md - Hệ thống Quản lý đào tạo TTCC 115

## Goal

Phát triển tiếp hệ thống hiện có theo hướng incremental:
- shadcn UI;
- bảo mật dữ liệu;
- email reliability;
- SSO Authentik;
- performance;
- production readiness.

Không viết lại project từ đầu.

## Read first

Tìm và đọc:
- `docs/Ho_so_ke_hoach_nang_cap_quan_ly_dao_tao_2026/00_README.md`
- `01_HIEN_TRANG_GAP_ANALYSIS.md`
- `10_ROADMAP_BACKLOG.md`
- phase tương ứng trong `harness/build/`.

Nếu path docs khác, tìm thư mục theo tên hồ sơ.

## Rules

- Read-only discovery trước khi sửa subsystem mới.
- Giữ business behavior trừ mục CHANGE.
- Không tự chốt DECIDE.
- Không reset/drop DB thật.
- Không xóa migration lịch sử.
- Không commit secret.
- Không public PII upload.
- Không log PII/token.
- Server phải enforce authorization.
- Không major-upgrade Next/React/Prisma trong UI/SSO phase.
- Change nhỏ, reversible, testable.

## UI stack

Default:
- shadcn/ui;
- Tailwind;
- `@tanstack/react-table`;
- `react-hook-form`;
- `zod`;
- `@hookform/resolvers`;
- Sonner;
- existing Lucide/Framer Motion/Recharts.

Inventory trước `shadcn init`.

## Dependency policy

Dependency list là baseline mở.

Bạn được phép đề xuất/thêm package khi có lợi ích rõ về maintainability, accessibility, security, performance, observability hoặc giảm code tự viết.

Trước khi thêm:
1. nêu vấn đề;
2. kiểm tra package hiện có;
3. đọc docs hiện hành;
4. tránh overlap;
5. xem bundle/runtime;
6. license/maintenance;
7. giữ pnpm lockfile;
8. typecheck/lint/build/test;
9. log lý do;
10. ADR nếu thay đổi kiến trúc.

Không mặc định thêm Redux, Axios, React Query, Redis, queue system, UI framework thứ hai hoặc form/schema framework thứ hai.

## Auth/SSO

Training app hiện dùng server-side session riêng. Không cài NextAuth v4 chỉ để làm SSO.

Target:
- Authentik;
- OIDC Authorization Code + PKCE;
- internal auth facade;
- `openid-client`;
- `jose`;
- SsoIdentity;
- revocable AppSession;
- app giữ role/scope nghiệp vụ.

## Sensitive data

CCCD, DOB, phone, email, degree/license, receipt, registration history là dữ liệu nhạy cảm.

- không URL/log;
- private storage;
- authz download;
- upload allowlist/size/signature;
- public search chống enumeration;
- export/download có audit.

## Database

PostgreSQL + Prisma 7 + pg adapter.
- transactions cho seat allocation;
- migration test trước production;
- backup/rollback;
- index phải có use case.

## Testing

Sau nhóm thay đổi:
- actual scripts from package.json;
- typecheck;
- lint;
- build;
- relevant integration/smoke/e2e.

Không ghi PASS nếu test chưa chạy.

Giữ test concurrency 39/40 chỉ nhận thêm 1 học viên.

## Phases

Dùng `PLANS.md` + `harness/build/phase-*.md`.

Sau mỗi phase:
- update build log;
- update material context;
- update docs;
- ghi test thực tế;
- ghi rollback.

Không claim production-ready trước release checklist.
