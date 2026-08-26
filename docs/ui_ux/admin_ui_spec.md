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
  - **Cú pháp chuyển khoản** (Ví dụ `CD {MALOP} {SDT}`)
- Khi Admin lưu thành công, thông tin này sẽ lập tức được thay đổi hiển thị trên trang Đăng ký của Người dùng (Frontend) mà không cần can thiệp vào code.
