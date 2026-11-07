# Phase02j — Class workspace and management UI

Date: 2026-10-17. Base commit a6ff1a2672ee606aa5a0f6ff87f64b7f1aee46e7. Previous dirty work retained. No dependency/schema/migration changes, no commit/deploy.


## Phase02j — Không gian làm việc của lớp (17/10/2026)
Thay thế cách phân công của Phase02i: bỏ màn hình phân công riêng. ADMIN chọn **Người phụ trách** ngay trong biểu mẫu tạo/sửa lớp; lưu phân công và thông tin lớp trong cùng giao dịch, kiểm tra tài khoản active/CLASS_MANAGER và giữ nguyên bảo vệ phạm vi lớp. `/courses/assignments` cũ chỉ chuyển về danh sách lớp; không còn nút hay bảng phân công riêng.

`/courses` dùng các nhóm Tất cả / Sắp học / Đang học / Đã kết thúc, dựa lịch học và trạng thái kết thúc; không tự thay đổi trạng thái nhận đăng ký. Bảng hiển thị người phụ trách và số buổi. Thao tác chính **Mở lớp**, bên cạnh Sửa/Xóa theo quyền. Người chỉ có quyền buổi học vẫn có lối vào riêng. Nút tạo, tìm/lọc và bảng không còn bị chia bởi nút phân công riêng.

`/courses/[id]` là không gian chung: tóm tắt lịch, địa điểm, phụ trách, đăng ký và số liệu gọn; điều hướng **Học viên / Buổi học / Chứng từ / Thông tin**. Mục Thông tin cho phép sửa tại chỗ; kế toán xem thông tin, không sửa lớp. Mục Chứng từ có cột thanh toán, hóa đơn, số GCN/GXN đúng loại chứng nhận, bàn giao; lọc chờ thanh toán, chưa có hóa đơn/chứng nhận, chưa bàn giao. Kế toán và quản lý lớp giữ quyền từng trường; mở Cập nhật đi thẳng phần chứng từ. Tìm học viên tiếp tục gửi nội bộ, không đưa định danh vào URL.

Buổi học dùng hàng ngang trên desktop: tên/trạng thái/lịch/địa điểm/số đã điểm danh và cụm Điểm danh/Sửa. Màn hình nhỏ xếp gọn theo chiều dọc, cụm nút giữ ngang. Nhãn sidebar và nút rút gọn nhưng giữ tên truy cập rõ nghĩa cho nút chỉ biểu tượng.

Bảng quản trị có đường kẻ cột1px nhẹ, tiêu đề căn giữa, nút sắp xếp bỏ khoảng lệch trái. Ô nhập, lịch và select dùng nền trắng; bỏ nền xám do dark media của thiết bị áp vào giao diện sáng; trạng thái disabled vẫn phân biệt. Không thay đổi cỡ chữ lớn đã chốt.

Cảnh báo Reduced Motion đến từ useReducedMotion của Motion trong môi trường phát triển, không phải lỗi chức năng. Thay bằng useSyncExternalStore đọc matchMedia có server snapshot cố định, cập nhật khi thiết bị đổi tùy chọn và không phát cảnh báo. Vẫn giữ chế độ giảm chuyển động, dừng tự đổi ảnh và không tạo hydration mismatch. Tham chiếu: https://motion.dev/troubleshooting/reduced-motion-disabled .

## Data and permissions
No actual classes or assignments edited during implementation. Browser fixtures use unique run IDs and existing constrained cleanup. Assignment logic extracted into a transaction helper with unchanged active ADMIN check; save class and assignment is atomic. Non-admin managerId injection rejected. Existing role-policy ceilings, class scopes, attendance human confirmation, private files and OTP flows remain.

## Validation
TypeScript/lint0warnings, production/private-artifact gate pass. Attendance domain and RBAC integration pass. Isolated RBAC browser1/1 pass. Full UI suite29/29 PASS1.4m before final compact-layout adjustment; final affected suites and data checks recorded below. Includes creating class with manager in form, reassignment blocking manager account demotion, lifecycle filtering, accounting/manager field protection, document save/filter, live reduced-motion preference, desktop/mobile, hover geometry and centered/divided table headers.

## Rollback
Restore only Phase02j file hunks among previous dirty work; no DB rollback needed. Restore separate assignment UI only if reverting its relocation; existing managerId data preserved.

Final affected suites16/16 PASS51.7s on final production build. Explicit dark-device test verifies name/date/select backgrounds remain white; session row desktop actions are on the right and height<130px,390px/1440px screenshots reviewed. Final views compact duplicate row actions and place document filters on one desktop row. Data verification:8registrations/8students/4privatefilehashes preserved;7legacyreviews unchanged;0unlinked/orphanprofiles and0testfixtures. Lint0warnings, TypeScript and git diff whitespace checks pass. No real assignments changed.
