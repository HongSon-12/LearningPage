# Phase 01 — shadcn foundation

## Goal
Chuẩn hóa UI quản trị, login, danh sách lớp và roster; giữ nguyên nghiệp vụ/quyền.

## Current state
Baseline xanh sau cleanup. Tailwind 4.3.3/Next 16.3/React 19.2.8; chưa có shadcn. Có AdminUI/AdminDialog riêng, bảng/form tự viết, browser alert/confirm.

## In scope
components.json; component Radix shadcn theo nhu cầu; theme; AdminShell responsive; shared form/table/filter/status/empty states; login; courses; roster; Sonner; loading/error; desktop/mobile/keyboard regression.

## Out of scope
Schema, auth flow/SSO, quyền nghiệp vụ, domain/transactions, upload/search/email, deployment.

## Dependencies
- shadcn CLI 4.22.0 chỉ làm generator, Node >=20.18.1 phù hợp Node 22.
- Radix-based new-york cho mọi overlay; không trộn Base UI.
- @tanstack/react-table 9.3.1: API useTable/tableFeatures mới, React >=18, tương thích React Compiler. Discovery ban đầu cân nhắc v8 theo mẫu shadcn nhưng lint xác nhận interior-mutability warning; chuyển sang v9 native API trước khi chốt để giữ baseline sạch và tránh deprecated legacy adapter. Chỉ bật sorting/pagination/columnVisibility.
- react-hook-form 7.90.0, zod 4.6.7, @hookform/resolvers 5.9.1: tương thích React 19 và Zod4; dùng client form, server giữ validation hiện có.
- sonner 2.0.8: React18/19, notifications.
- cn 0.4.0/class-variance-authority/tw-animate-css và Radix do component generator yêu cầu: shared class variants, accessibility, animation. Không thêm service/framework khác.
- License: metadata registry MIT cho các thư viện trên trừ class-variance-authority Apache-2.0; kiểm tra lại license dependencies thực tế khi cài.
- Runtime: UI imports theo component, không đưa Prisma/auth server vào client; CLI dùng dlx, không là dependency runtime. Rollback: restore package/lockfile cùng diff UI của phase, không đụng cleanup trước đó.

Sources checked: https://ui.shadcn.com/docs/installation/next, https://ui.shadcn.com/docs/installation/manual, https://ui.shadcn.com/docs/forms/react-hook-form, https://tanstack.com/table/v8/docs/guide/tables; npm registry metadata qua pnpm view ngày 17/10/2026.

## Data/schema impact
Không migration. Bảng dùng dữ liệu có sẵn; không mở rộng scope/PII được tải. Server pagination theo dữ liệu lớn vẫn thuộc phase hiệu năng, ghi rõ limitation hiện tại.

## Security impact
Layout vẫn gọi pageUser trên server, actions giữ requireUser và classScope. UI chỉ hiển thị quyền đã có. Không đổi nguồn auth, không tự chốt DECIDE.

## Performance impact
Chỉ client hóa shell tương tác, form/table; pages truy vấn DB giữ server. Không tải thêm API/data ngoài phạm vi hiện có. Không init đè CSS cũ; giữ palette public.

## Implementation steps
1. Config thủ công để bảo toàn theme cũ, thêm đúng component bằng CLI.
2. Thêm token, shell, shared components và RHF/Zod forms.
3. Áp dụng login, course list/CRUD dialog, roster/table/details.
4. Loading/error/empty; tests; visual/keyboard; cập nhật context/log.

## Verification
Lint/typecheck/build/management/HTTP; browser tests cho login, filtering/sort/page/columns, dialogs, role UI và menu mobile; viewport 360/390/768/1366/1440.

## Acceptance criteria
Baseline xanh; không thay domain/schema; menu mobile/keyboard/focus hoạt động; các thao tác hiện có còn nguyên; dependency và limitations có bằng chứng.

## Rollback
Revert riêng các file phase1 và dependency changes; giữ baseline cleanup và dữ liệu. Không có schema rollback.

## Open decisions
Giữ nguyên DECIDE v2. Không chuyển login sang SSO khi chưa có phase staging.

## Status
Complete for implementation and technical regression. Lint/TypeScript/build/management/HTTP/5 Playwright groups pass. Business UAT, full screen-reader audit and production readiness remain release gates.

Technical decision: dùng native TanStack9 sau khi đọc https://tanstack.com/table/latest/docs/framework/react/guide/migrating và https://react.dev/reference/eslint-plugin-react-hooks/lints/incompatible-library; không nới lint rule hoặc bật compiler exemption. Giữ Next/React/Prisma nguyên phiên bản.

Testing dependency: @playwright/test 1.64.1, dev-only, Apache-2.0, Node >=20 phù hợp Node22. Cần kiểm thử hồi quy các tương tác bảng/form/role/mobile/focus mới; không có browser test framework trong baseline. Không thêm vào client bundle. Rollback cùng test config/spec/script nếu bỏ UI phase.

Verification finding: global admin loading boundary bắt đầu stream trước class-scope notFound, đổi HTTP404 thành200. Đã bỏ boundary này; skeleton đặt ở client-table lazy boundary sau khi page đã kiểm tra scope/dữ liệu. Giữ nguyên tiêu chí denied-route404 trong test.
