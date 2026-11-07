# Phase02i — RBAC and layout refinements

Date: 2026-10-17. Base commit: a6ff1a2672ee606aa5a0f6ff87f64b7f1aee46e7. Previous dirty work retained; no commit, branch or deployment.



## Phase02i — Tách tài khoản, phân quyền và phân công lớp (17/10/2026)
- `/users`: tài khoản đăng nhập, tạo/sửa tài khoản, chọn một trong ba vai trò, đổi mật khẩu, khóa tài khoản; bảo vệ quản trị cuối cùng và tài khoản đang phụ trách lớp giữ nguyên.
- `/permissions`: thiết lập quyền theo nhóm bằng checkbox. ADMIN luôn toàn quyền, không thể sửa. CLASS_MANAGER và ACCOUNTANT bật/tắt trong phạm vi nghiệp vụ cũ; chưa mở cấp chéo vai trò hoặc tạo vai trò mới. Quyền phụ thuộc tự bật/tắt theo thao tác. Lưu có phiên bản để tránh ghi đè cấu hình từ tab khác.
- `/courses/assignments`: phân công quản lý lớp, truy cập từ Lớp học. Phạm vi lớp vẫn gắn managerId; phân quyền vai trò không tự mở rộng phạm vi dữ liệu.
- Cấu trúc RBAC: User → Role → Permission; RolePolicy/RolePermission lưu trong DB. Kiểm tra người dùng đang hoạt động và quyền hiện tại phía máy chủ; menu và nút chỉ hiển thị quyền được cấp. Thu hồi quyền có hiệu lực từ yêu cầu tiếp theo, bao gồm trang cũ còn mở, tài liệu định danh, điểm danh và Excel. Trường hợp không còn quyền có trang hướng dẫn riêng, không vòng lặp chuyển hướng.
- Thanh đầu quản trị80px để đủ chỗ cho tiêu đề và liên kết quay lại. Bỏ bốn thẻ điều hướng trùng sidebar trong Tổng quan; giữ thẻ thống kê.
- Bỏ cấu hình cú pháp chuyển khoản trên Settings. Cố định `{CLASS_CODE} {NAME}`; tên viết hoa, bỏ dấu. Bản ghi cũ giữ lại để tương thích, giao diện thanh toán dùng hàm cố định.
- Trang cộng đồng nới vùng nội dung tối đa1440px, giữ lề trên màn hình lớn để dễ đọc. Sửa hydration do reduced-motion khác giữa server/client; hiệu ứng xuất hiện lặp lại khi cuộn lên/xuống, tôn trọng tùy chọn giảm chuyển động.
- Tham chiếu mô hình RBAC: https://csrc.nist.gov/Projects/role-based-access-control/faqs . Không tuyên bố chứng nhận tuân thủ NIST; phiên bản hiện tại dùng ba vai trò cố định và phạm vi lớp độc lập.

## Data and migration
Backup .local/backups/security-2026-10-17T13-02-49-933Z-966a466d validated and restored in isolation before local deploy. Migration20261017000300 creates only RolePolicy and RolePermission; seeds exact legacy grants (15 manager,9 accountant), protects ADMIN with SQL check. Six migrations applied locally, no reset. Prisma client regenerated. Existing profiles, registrations and private files preserved. Restore rehearsal skipped only known pg17→16 transaction_timeout configuration, no other failures.

## Approval history
Automatic review rejected broad auth edits initially, then rejected multi-page gates. Implementation narrowed to additive denials preserving legacy role ceilings and class scope. User explicitly approved page/menu gates in call_f493750bc17044cfab62d79cafeefae1. Narrow changes then accepted. No cross-role grant expansion.

## Verification
TypeScript, lint and production/private-artifact gate pass. Six isolated domain suites pass. RBAC integration covers legacy defaults, forgery denial, protected ADMIN, input/dependencies, empty/missing policy, stale/concurrent writes, inactive account, assigned scope and stale file/session/Excel reads. Isolated browser suite covers page separation, permission checkbox save, stale class mutation denial, direct-route/menu denial, Excel rejection, accountant payment control revocation and protected ADMIN. Final full UI suite27/27 PASS1.3m; separate isolated RBAC browser test1/1 PASS8.3s. Production build generated with NEXT_BUILD_DIR=.next-build for the standalone test server. Earlier test harness mismatches fixed: account/assignment route and search labels, required synthetic location, streaming/font readiness before geometry measurement. Final lint0warnings and TypeScript pass. Browser runner uses a random guarded schema and removes it in finally; no actual role policies modified by tests.

## Operational limits
SMTP delivery and physical phone camera QA remain external operational gates from earlier phases. No emails sent by this phase. No container rollout. Existing role ceilings intentionally remain; administrator can reduce/restore each role’s existing capabilities. Current request does not add arbitrary new roles or cross-role grants.

## Rollback
Restore only Phase02i code hunks among prior dirty work; do not reset checkout or DB. New tables can remain unused if reverting app code; preserve backup and role policy data. Do not drop tables as part of routine rollback.

Final preservation check:8registrations/8students/4privatefilehashes preserved;7legacyprofiles still need human review;0unlinked/orphanprofiles. Existing verification scripts confirm no test class/user/student fixtures left. No real role policy changed by tests.
