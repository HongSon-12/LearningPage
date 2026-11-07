# Kế hoạch chi tiết: Giao diện Quản trị (Admin Dashboard)

Tài liệu này mô tả chi tiết chức năng và thiết kế giao diện dành riêng cho Người quản trị (Admin) để vận hành hệ thống.

## 1. Nguyên tắc Thiết kế (Design Principles)
- **Tập trung vào Dữ liệu:** Giao diện tối giản, sử dụng các gam màu lạnh (Navy, Trắng, Xám) để làm nổi bật bảng dữ liệu và biểu đồ.
- **Tốc độ:** Tận dụng Single Page Application (SPA) của Next.js để chuyển trang không độ trễ.
- **Bảo mật:** Giao diện tự động khóa và chuyển về trang đăng nhập nếu token hết hạn.

## 2. Cấu trúc Giao diện (Layout)
Layout chuẩn của Admin gồm 2 phần:
- **Sidebar (Trái):** Thanh điều hướng cố định chứa Logo, Thông tin Admin, và các Menu: Dashboard, Lớp học, Đăng ký, Cấu hình.
- **Main Content (Phải):** Khu vực hiển thị nội dung chi tiết theo từng tính năng, có thanh Header trên cùng để chứa nút Đăng xuất và Breadcrumb.

## 3. Danh sách Tính năng chi tiết

### 3.1 Màn hình Đăng nhập (Login)
- **Giao diện:** Card nhỏ gọn ở giữa màn hình.
- **Chức năng:** Nhập Username / Password. Nếu sai hiển thị thông báo lỗi (màu đỏ). Nếu đúng, lưu HttpOnly Cookie và chuyển hướng vào Dashboard.

### 3.2 Màn hình Tổng quan (Dashboard)
- Hiển thị các khối thống kê (Stats Cards):
  - Tổng số lớp học đang mở.
  - Tổng số lượt đăng ký.
  - Số lượng chưa thanh toán / Đã thanh toán.
- Biểu đồ (Tùy chọn): Lượng đăng ký theo tháng.

### 3.3 Màn hình Quản lý Lớp học (Classes)
- **Danh sách:** Bảng (Table) hiển thị Mã lớp, Tên lớp, Ngày khai giảng, Giờ, Trạng thái (Open/Full/Done).
- **Thao tác:**
  - Nút `+ Tạo lớp mới`: Mở Modal chứa form điền thông tin lớp học.
  - Nút `Sửa`: Thay đổi trạng thái lớp (ví dụ từ Open sang Full).
  - Nút `Xóa`: Cảnh báo trước khi xóa (Chỉ được xóa nếu chưa có người đăng ký).

### 3.4 Màn hình Quản lý Đăng ký (Registrations)
Đây là màn hình quan trọng nhất.
- **Danh sách:** Bảng chi tiết toàn bộ học viên. Cột bao gồm: ID, Tên, SĐT, Mã lớp, Trạng thái thanh toán (Badge màu xanh/cam).
- **Bộ lọc (Filters):** Lọc theo Lớp học (Dropdown), Lọc theo Trạng thái thanh toán, Ô tìm kiếm theo Tên/SĐT.
- **Thao tác:**
  - Nút `Xuất Excel (CSV)`: Tải toàn bộ danh sách hiện hành xuống máy để báo cáo.
  - Nút `Duyệt thanh toán`: Đổi trạng thái từ "Chờ thanh toán" sang "Đã thanh toán" chỉ bằng 1 click.

### 3.5 Màn hình Cấu hình (Settings)
- Form nhập liệu cho phép Admin tự động thay đổi:
  - **Tên Ngân hàng** (Ví dụ: VietinBank - CN 10)
  - **Số tài khoản**
  - **Tên chủ tài khoản**
- Cú pháp chuyển khoản cố định `{CLASS_CODE} {NAME}` (tên viết hoa, bỏ dấu), không có trường sửa trên Settings từ Phase02i.
- Khi Admin lưu thành công, thông tin này sẽ lập tức được thay đổi hiển thị trên trang Đăng ký của Người dùng (Frontend) mà không cần can thiệp vào code.


## 4. Cập nhật quản trị học viên

Màn hình học viên có bộ lọc chương trình/khóa/lớp, đăng ký thủ công/vét, chuyển lớp, lý do từ chối, theo dõi gửi GCN và Số GXN, Import/Export Excel. Tài khoản Quản lý lớp thao tác lớp được giao; Kế toán đối soát và cập nhật hóa đơn. Xem [đặc tả và quy tắc đã triển khai](../features/Feature_Cap_Nhat_Quan_Ly_Hoc_Vien_Va_Landing_Page.md#12-thiết-lập-đã-triển-khai-06102026).


## 5. Tài khoản, phân quyền và phân công lớp (17/10/2026)
`/users` quản lý tài khoản đăng nhập; `/permissions` cấu hình quyền cho ba vai trò hiện có (ADMIN bảo vệ, hai vai trò còn lại giới hạn trong nghiệp vụ hiện tại); `/courses/assignments` phân công người phụ trách lớp. Quyền kiểm tra ở trang, menu và máy chủ. Xem Phase02i trong kế hoạch v2 để biết chi tiết.


## 6. Cập nhật Phase02j (17/10/2026)
Phân công nằm ngay trong thông tin lớp, không còn trang riêng. Trang lớp là không gian Học viên / Buổi học / Chứng từ / Thông tin, dùng chung điều hướng và quyền nghiệp vụ hiện có. Danh sách lớp có lọc theo lịch học; tiến trình và trạng thái nhận đăng ký là hai thông tin riêng. Bảng có kẻ cột mảnh, tiêu đề giữa; nhãn nút/sidebar ngắn; ô nhập nền trắng.


## Phase02l — Email tài khoản, vai trò mới và Tổng quan (17/10/2026)
- Bỏ nút Làm mới ở Hồ sơ học viên; giữ nguyên tìm kiếm và bộ lọc.
- Tài khoản có email khôi phục riêng, chuẩn hóa chữ thường và chống trùng. Giữ bố cục3/7, chọn được các vai trò mới. Các chốt tự khóa/hạ quyền, quản trị cuối cùng, lớp đang phân công và thu hồi phiên vẫn giữ nguyên.
- Thêm vai trò có tên riêng theo nền nghiệp vụ Quản lý lớp/Kế toán; quyền dạng ô chọn, kiểm tra phụ thuộc và giới hạn nghiệp vụ ở máy chủ. Nền nghiệp vụ không đổi sau khi tạo; ADMIN bảo vệ. Kiểm tra phiên bản khi lưu, quyền có hiệu lực từ yêu cầu tiếp theo, không lấy quyền cũ từ phiên đăng nhập.
- Mọi tài khoản hoạt động được xem Tổng quan. Thống kê/hồ sơ theo quyền và phạm vi lớp; quản lý chỉ thấy lớp được giao. Tài khoản chưa có quyền nghiệp vụ thấy lời chào/hướng dẫn; thống kê truy cập toàn hệ thống dành cho ADMIN. Dashboard là quyền luôn có trong trình chọn.
- Thêm Quên mật khẩu ở đăng nhập: email → mã6số → mật khẩu mới và xác nhận. Phản hồi chung cho email có/không tồn tại; HMAC domain riêng, mã10phút/một lần, tối đa5lần sai, giới hạn theo email/IP/challenge. Không lưu mã rõ; đổi email/tài khoản hoặc yêu cầu mã mới vô hiệu mã cũ; đổi mật khẩu thu hồi phiên và xóa khóa đăng nhập cũ. Có thư thông báo sau khi đổi, không tự đăng nhập.
- Email dùng outbox có lease, tối đa5lần gửi và lùi thời gian khi lỗi; after thử gửi sau phản hồi, lệnh email:search chạy cả hàng đợi tra cứu và khôi phục. SMTP chưa cấu hình ở môi trường hiện tại: chưa xác minh gửi đến hộp thư thật.
- Migration20261017000400 chỉ bổ sung cột/bảng/index/FK, không xóa hồ sơ hiện có. Đã kiểm thử toàn bộ migrations trên schema cô lập, sao lưu và phục hồi thử trước migrate deploy; không resetDB. Bản sao lưu có8đăng ký/6migration trước thay đổi, schema hiện có7migration.

### Validation
- test:account-access PASS: email duy nhất, vai trò mới/phân công/phạm vi/thu hồi/concurrent version, Tổng quan luôn có, phản hồi khôi phục không lộ tồn tại, hashOTP/hết hạn/một lần/5lần sai/retrySMTP, resetpassword/session/login-lock, chống replay đồng thời, vô hiệu khi đổiemail/khóaTK. Dùng sender giả, không gửi email thật.
- test:rbac PASS trong schema cô lập: quyền cũ, phụ thuộc và chặn quyền ngoài phạm vi vẫn đúng.
- Build thành công, TypeScript và targeted ESLint đạt; private-artifact gate đạt.
- Browser cô lập2/2PASS10.8s: trang/menu/action cũ sau thu hồi; tạo vai trò, email, Tổng quan theo phạm vi, trang reset và đăng xuất phiên. Review ảnh1440/390px, không tràn trang.
- Targeted browser2/2PASS9.3s: tạo/sửaTK/đổi vai trò/password/khóa và tìm/lọc/phân trang Hồ sơ học viên. Không chạy toàn bộsuite.
- Kiểm tra bảo toàn8đăngký/8hồsơ/4hashfile riêng tư,7hồsơcầnđốichiếu,0unlinked/orphan/fixture.

### Rollback / vận hành
Giữ các bảng/cột mới nếu tạm quay UI về phiên bản cũ; không xóa dữ liệu email/vai trò/reset để rollback. Cần cấu hình SMTP thật và chạy worker bền vững để có retry khi tiến trình bị dừng. Không thay đổi file định danh, thông tin thanh toán hoặc các hồ sơ thật.
