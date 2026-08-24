# Kế hoạch Triển khai Chi tiết: Hệ thống Quản lý Lớp học Sơ cấp cứu

Dự án sẽ được xây dựng trên nền tảng Next.js Full-stack, với mục tiêu phân tách rõ ràng 3 phân hệ chính: **Nền tảng (Platform & Core)**, **Giao diện Người dùng (User Interface)**, và **Giao diện Quản lý (Admin Dashboard)**. Việc phân tách này giúp mã nguồn dễ bảo trì, dễ mở rộng và bảo mật tốt hơn.

---

## 1. Phân hệ Nền tảng (Platform & Core)
Đây là "trái tim" của hệ thống, xử lý cơ sở dữ liệu, logic nghiệp vụ, và việc đóng gói ứng dụng.

- **Cơ sở dữ liệu (PostgreSQL):** 
  - Chạy trong container Docker riêng biệt.
  - Lưu trữ 4 bảng chính: `User` (tài khoản admin), `Class` (danh sách lớp học), `Registration` (danh sách học viên đăng ký), và `Setting` (cấu hình STK ngân hàng, nội dung CK).
- **ORM (Prisma):** 
  - Cầu nối tương tác với Database an toàn, cung cấp tự động các Type để bắt lỗi code.
- **Backend API (Next.js Server Actions / API Routes):**
  - Đóng vai trò là các hàm xử lý logic chạy trên Server (Thêm/sửa/xóa dữ liệu).
- **Môi trường vận hành (Docker):**
  - Sử dụng file `docker-compose.yml` để chạy đồng thời 2 container: `postgres_db` và `nextjs_app`. Điều này đảm bảo môi trường ở máy local của bạn giống hệt lúc deploy lên máy chủ Debian.

---

## 2. Phân hệ Giao diện Người dùng (User UI - Landing Page)
Tập trung tối đa vào trải nghiệm (UX) để thu hút học viên đăng ký.

- **Định tuyến (Routing):** Nằm tại các file gốc trong `src/app/(public)/...` (Ví dụ: Trang chủ `/`).
- **Thiết kế UI & Hoạt ảnh (Animations):**
  - Ứng dụng **TailwindCSS** kết hợp **Framer Motion** để tạo ra giao diện Premium.
  - Các hiệu ứng: Fade-in khi cuộn chuột, hiệu ứng hover nổi bật trên các khối thông tin lớp học.
  - Thiết kế Mobile-first đảm bảo xem trên điện thoại cực kỳ mượt mà.
- **Tính năng chính:**
  - **Hiển thị thông tin lớp học:** Load dữ liệu các lớp đang mở từ Database. Giao diện dạng thẻ (Cards) bắt mắt.
  - **Form Đăng ký dạng Wizard:** Thay vì một form dài nhàm chán, học viên sẽ trải qua các bước mượt mà (Chọn lớp → Điền thông tin → Xem hướng dẫn chuyển khoản). Không cần tải lại trang.
  - **Hướng dẫn thanh toán động:** Số tài khoản và nội dung chuyển khoản được render trực tiếp dựa trên cấu hình lấy từ Backend.

---

## 3. Phân hệ Giao diện Quản lý (Admin Dashboard)
Tập trung vào tính bảo mật, tiện dụng và quản lý luồng dữ liệu.

- **Định tuyến (Routing):** Nằm tách biệt hoàn toàn tại `src/app/(admin)/...` (Ví dụ: `/admin`, `/admin/classes`, `/admin/registrations`).
- **Bảo mật (Authentication):**
  - Mọi route trong `/admin` đều được bảo vệ bởi Next.js Middleware.
  - Đăng nhập bằng tài khoản/mật khẩu, trả về HttpOnly JWT Cookie, chống tấn công XSS.
- **Giao diện & Tính năng:**
  - Giao diện thiết kế theo dạng Dashboard (Sidebar bên trái, nội dung bên phải). Ưu tiên tính rõ ràng, dễ dùng.
  - **Dashboard:** Thống kê tổng số lượt đăng ký, số tiền dự kiến, các lớp sắp khai giảng.
  - **Quản lý Lớp (Classes):** Bảng danh sách lớp. Modal để Thêm/Sửa/Xóa lớp học (cập nhật ngày giờ, số lượng học viên).
  - **Quản lý Đăng ký (Registrations):** Bảng danh sách người đăng ký. Chức năng đổi trạng thái (Chờ thanh toán → Đã thanh toán). Có khả năng xuất file Excel (CSV) để báo cáo.
  - **Cấu hình (Settings):** Trang thiết lập Số tài khoản, Ngân hàng, Tên người thụ hưởng để hiển thị cho học viên.

---

## Kiến trúc Thư mục Đề xuất

```text
/ttcc-app
├── docker-compose.yml
└── /app
    ├── Dockerfile
    ├── package.json
    ├── /prisma              # Nền tảng (Database Schema)
    ├── /src
    │   ├── /app
    │   │   ├── (public)     # ---> Giao diện Người dùng
    │   │   ├── (admin)      # ---> Giao diện Quản lý
    │   │   └── api          # ---> Nền tảng (Backend APIs)
    │   ├── /components      # Các khối UI dùng chung
    │   └── /lib             # Các hàm tiện ích, cấu hình database
```

**Kế hoạch này đã phân định rất rõ ràng chức năng và giới hạn của 3 phần. Nếu bạn đã hoàn toàn chốt phương án này, vui lòng nhấn Proceed để tôi lập tức tạo thư mục `ttcc-app`, thiết lập cấu trúc và bắt đầu viết code!**
