# Hệ Thống Tài Liệu Dự Án (Project Documentation)

Chào mừng bạn đến với thư mục `docs/`. Đây là nơi lưu trữ tập trung toàn bộ tài liệu nghiệp vụ, kiến trúc hệ thống, quy trình thiết kế, và đặc tả giao diện của dự án Trung Tâm Cấp Cứu 115.

Để giúp bạn dễ dàng tìm kiếm và tham chiếu, các tài liệu đã được phân bổ thành 5 thư mục chính như sau:

## 1. Hệ Thống Kiến Trúc (`/architecture`)
Nơi chứa các tài liệu thiết kế hệ thống tổng thể và các quyết định công nghệ.
- [platform_architecture.md](./architecture/platform_architecture.md): Kiến trúc nền tảng (Frontend, Backend, Database).
- [implementation_plan.md](./architecture/implementation_plan.md): Bản thiết kế kế hoạch triển khai cho các đợt nâng cấp dự án.

## 2. Nghiệp Vụ & Quy Trình (`/business_logic`)
Nơi chứa các tài liệu phân tích nghiệp vụ, quy trình vận hành và đối tượng khách hàng.
- [CME_Quy_Trinh_Quan_Ly.md](./business_logic/CME_Quy_Trinh_Quan_Ly.md): Tài liệu lưu đồ quy trình quản lý và tiếp nhận 5 khóa học CME.
- [Doi_Tuong_Hoc_Vien.md](./business_logic/Doi_Tuong_Hoc_Vien.md): Phân tích chi tiết 3 nhóm đối tượng mục tiêu của các khóa học.
- [logic.jpg](./business_logic/logic.jpg): Ảnh Sơ đồ luồng nghiệp vụ do người dùng cung cấp.

## 3. Đặc Tả Tính Năng (`/features`)
Nơi phân tích sâu vào luồng xử lý kỹ thuật của từng tính năng lớn.
- [Feature_Form_Va_Upload.md](./features/Feature_Form_Va_Upload.md): Tính năng xử lý Form đăng ký động và Upload hồ sơ (CCCD, Bằng cấp).
- [Feature_Gui_Email_Tu_Dong.md](./features/Feature_Gui_Email_Tu_Dong.md): Hệ thống SMTP gửi 4 kịch bản Email (B, C, D, E).
- [Feature_Tra_Cuu.md](./features/Feature_Tra_Cuu.md): Tính năng hỗ trợ học viên tự tra cứu Hóa đơn điện tử và Số Chứng Chỉ.

## 4. Đặc Tả Giao Diện (`/ui_ux`)
Nơi lưu trữ các quy chuẩn về thiết kế và cấu trúc giao diện.
- [admin_ui_spec.md](./ui_ux/admin_ui_spec.md): Đặc tả màn hình Dashboard dành cho Admin.
- [user_ui_spec.md](./ui_ux/user_ui_spec.md): Đặc tả giao diện phía Học viên (User-facing).

## 5. Theo Dõi Tiến Độ (`/tasks`)
Nơi chứa các checklist công việc đang hoặc sắp diễn ra.
- [task.md](./tasks/task.md): Bảng To-Do List chi tiết các đầu mục công việc lập trình.

---
**Quy tắc lưu trữ:** 
- Bất cứ khi nào có yêu cầu tính năng mới, hãy tạo 1 file markdown (.md) và lưu vào thư mục `/features`.
- Thay đổi liên quan đến tổ chức dữ liệu / luồng khách hàng thì lưu vào `/business_logic`.
- Hãy giữ thư mục này luôn gọn gàng và cập nhật để thuận tiện cho việc Maintain mã nguồn sau này!
