# Danh sách Công việc (Task Checklist)

Dưới đây là các công việc chi tiết để triển khai hệ thống quản lý lớp học bằng Next.js, PostgreSQL và Docker. Tôi sẽ đánh dấu `[x]` khi hoàn thành và `[/]` khi đang thực hiện.

## 1. Khởi tạo Dự án & Cấu hình Docker
- `[x]` Tạo thư mục dự án `ttcc-app` bên trong thư mục `Learning`.
- `[x]` Khởi tạo Next.js App Router (TailwindCSS, TypeScript) bằng **pnpm** (`--use-pnpm`).
- `[x]` Tạo file `docker-compose.yml` định nghĩa service `db` (PostgreSQL), `app` (Next.js) và Nginx.
- `[x]` Tạo `Dockerfile` cho ứng dụng Next.js.
- `[x]` Khởi tạo các file `.md` tài liệu (platform_architecture.md, v.v.) trong artifacts.
- `[ ]` Khởi tạo các file `.md` tài liệu (README.md, ARCHITECTURE.md) trong source code để ghi chú kiến trúc cho lập trình viên.

## 2. Thiết lập Database & Prisma (Phân hệ Nền tảng)
- `[x]` Cài đặt Prisma CLI và khởi tạo schema.
- `[x]` Định nghĩa model `User` (Admin Auth).
- `[x]` Định nghĩa model `Setting` (Cấu hình ngân hàng).
- `[x]` Định nghĩa model `Class` (Quản lý các lớp).
- `[x]` Định nghĩa model `Registration` (Học viên đăng ký).
- `[ ]` Chạy Prisma migration (tạo bảng trong DB) (Sẽ chạy sau khi up Docker).
- `[x]` Tạo script Seed dữ liệu ban đầu (Tài khoản admin mặc định, cấu hình mặc định).

## 3. Giao diện Quản lý (Admin Dashboard)
- `[ ]` Setup cấu trúc thư mục `/src/app/(admin)`.
- `[ ]` Viết chức năng Login (JWT + HttpOnly Cookie / NextAuth).
- `[ ]` Phát triển giao diện Layout của Admin (Sidebar, Header).
- `[ ]` Trang **Dashboard**: Thống kê số liệu (Tổng học viên, số lớp, v.v.).
- `[ ]` Trang **Lớp học (Classes)**: Giao diện bảng danh sách lớp, Form Modal để Thêm/Sửa/Xóa lớp. Xử lý Server Actions kết nối Database.
- `[ ]` Trang **Đăng ký (Registrations)**: Danh sách học viên, đổi trạng thái thanh toán.
- `[ ]` Trang **Cấu hình (Settings)**: Form cập nhật thông tin Ngân hàng, số tài khoản, QR code.

## 4. Giao diện Người dùng (User Landing Page)
- `[ ]` Setup cấu trúc thư mục `/src/app/(public)`.
- `[ ]` Viết các Components dùng chung (Header, Footer, Floating Call).
- `[ ]` Tích hợp Framer Motion tạo hoạt ảnh (Scroll reveal, hover effects).
- `[ ]` Chuyển đổi giao diện cũ sang React Components (Hero, Tính năng, Lợi ích, Lịch khai giảng).
- `[ ]` Lấy danh sách lớp học động từ Database (thông qua Prisma) hiển thị lên giao diện.
- `[ ]` Phát triển Form Đăng ký dạng Wizard (Chuyển bước mượt mà):
  - Bước 1: Chọn lớp học.
  - Bước 2: Điền thông tin cá nhân.
  - Bước 3: Xem thông tin chuyển khoản (Lấy từ DB) và hoàn tất.
- `[ ]` Xử lý Submit Form: Ghi data vào bảng `Registration`.

## 5. Kiểm thử & Tối ưu (Verify)
- `[ ]` Chạy `docker-compose up` kiểm tra tính liên kết giữa Frontend và Database.
- `[ ]` Test toàn bộ luồng: Người dùng đăng ký -> Admin thấy đơn đăng ký -> Admin duyệt.
- `[ ]` Test Responsive (Mobile/Desktop) và UI/UX animations.
- `[ ]` Tạo file `walkthrough.md` tổng kết quá trình.
