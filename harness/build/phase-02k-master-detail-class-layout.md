# Phase02k — Master/detail management and persistent class overview

Date: 2026-10-17. Base a6ff1a2672ee606aa5a0f6ff87f64b7f1aee46e7. Previous dirty work retained; no migrations/dependencies/commit/deploy.


## Phase02k — Bố cục 3/7 và giữ nguyên tổng quan lớp (17/10/2026)
- `/users` chuyển từ bảng và hộp thoại sang bố cục3/7: tìm/lọc/chọn tài khoản bên trái, tạo/sửa trực tiếp bên phải. Trên điện thoại xếp dọc. Giữ nguyên kiểm tra vai trò, tự khóa/hạ quyền, quản trị cuối cùng, phân công lớp và thu hồi phiên. Lưu xong xóa mật khẩu khỏi biểu mẫu; khóa lựa chọn khi đang lưu.
- `/permissions` chọn vai trò bên trái30%, thiết lập quyền bên phải70%; giữ draft theo vai trò, phụ thuộc quyền, giới hạn hai vai trò và ADMIN bảo vệ như cũ.
- Thay quyết định căn giữa tất cả tiêu đề ở phase trước: tiêu đề và nội dung cùng trục theo từng cột. Chữ/liên hệ/lịch căn trái, trạng thái/số lượng căn giữa, thao tác căn phải. Bỏ khoảng đệm icon của nút sắp xếp; không có đường kẻ dọc.
- Bộ lọc `/courses` dùng grid theo chiều rộng container thật: một hàng khi đủ chỗ, ba/hai cột ở vùng hẹp, một cột trên điện thoại; tìm kiếm không ép tất cả ô xuống dòng. Ô ngày190px trong hàng rộng để hiển thị đủ định dạng, giới hạn từ/đến tương ứng.
- Tổng quan lớp và bốn nút thuộc layout dùng chung. Chọn Học viên/Buổi học/Chứng từ/Thông tin chỉ đổi panel bên dưới; URL và Back/Forward giữ hoạt động. Giữ vị trí cuộn khi chuyển giữa các mục cùng lớp. Trang điểm danh chi tiết vẫn có khung tập trung riêng.
- Từng trang con vẫn kiểm tra quyền mới từ máy chủ, không dùng layout được cache thay cho kiểm tra quyền. Layout chỉ lấy số liệu tổng hợp tối thiểu trong phạm vi lớp, không đưa định danh lên phần chung. Khi không có quyền xem đăng ký, ẩn số liệu và các mục tương ứng.
- Bảng Học viên tập trung hồ sơ/liên hệ/trạng thái; thanh toán chuyển sang bảng Chứng từ cùng hóa đơn/GCN-GXN/bàn giao. Chứng từ không có nút xóa đăng ký, mở Cập nhật vào đúng phần chứng từ.
- Chỉ chạy các kiểm tra liên quan đến thay đổi theo yêu cầu người dùng; không chạy toàn bộ bộ kiểm thử.

## Validation
Production build/private-artifact gate and targeted lint pass. Regenerated route types after adding the nested layout (old .next/types disagreed with .next/dev/types). Isolated RBAC browser1/1PASS6.8s. Targeted7UIcases:5passed initially; remaining2passed12.4s after fixing test readiness on client route transitions and comparing innerText consistently. Tests confirm30/70pane ratio, inline account CRUD and role-assignment safeguards, exact same overview DOM node/text/geometry across all4sections, document field rights, date filters, sorting/pagination, hover/button bounds and matching header/body alignment. Final3affected checks after icon padding/date-width/short-option refinements pass (2/2filter+table13.3s run, account1/1PASS7.2s after waiting for the inline form save confirmation instead of a dialog closing). No application defect remained. No full suite run.

## Rollback
Revert only phase02k component/layout/test hunks; no data rollback. Child page authorization must remain when changing the shared layout. Restore prior account dialog only if reverting its relocation, without changing backend account policy.

Final preservation check:8registrations/8studentprofiles/4privatefilehashes intact;7legacyreviews unchanged;0unlinked/orphanprofiles and no fixture classes/users/students left. Targeted lint0warnings and git diff --check pass. Screenshots of both30/70pages, final date filters, aligned tables and shared class views reviewed.
