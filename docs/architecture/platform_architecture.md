# Kế hoạch chi tiết: Phân hệ Nền tảng (Platform & Core)

Tài liệu này mô tả chi tiết kiến trúc kỹ thuật ngầm (Backend & Database) đóng vai trò xương sống cho hệ thống quản lý lớp học.

## 1. Công nghệ sử dụng
- **Framework Chính:** Next.js (App Router) - Xử lý cả giao diện lẫn API (Full-stack).
- **Cơ sở dữ liệu:** PostgreSQL 16.
- **ORM:** Prisma - Đảm bảo an toàn kiểu dữ liệu (Type-safety) và tự động tạo migration.
- **Triển khai (Deployment):** Docker Compose (Chạy đồng thời App và DB).

## 2. Thiết kế Cơ sở dữ liệu (Database Schema)

Hệ thống sẽ bao gồm 4 bảng chính:

### Bảng `User` (Tài khoản Admin)
- `id`: UUID (Primary Key)
- `username`: String (Unique)
- `passwordHash`: String (Mật khẩu đã mã hóa bcrypt)
- `createdAt` / `updatedAt`: DateTime

### Bảng `Setting` (Cấu hình hệ thống)
- `id`: Int (Primary Key - Thường chỉ có 1 dòng ID = 1)
- `bankName`: String (Tên ngân hàng, ví dụ: VietinBank)
- `accountName`: String (Tên người thụ hưởng, ví dụ: TT Cấp cứu 115)
- `accountNumber`: String (Số tài khoản)
- `transferSyntax`: String (Cú pháp chuyển khoản mẫu, ví dụ: `CD2026_{CLASS}_{PHONE}`)
- `updatedAt`: DateTime

### Bảng `Class` (Danh sách lớp học)
- `id`: UUID (Primary Key)
- `code`: String (Mã lớp, ví dụ: CD1.2026) - Unique
- `name`: String (Tên lớp)
- `date`: DateTime (Ngày diễn ra lớp học)
- `startTime`: String (Giờ bắt đầu)
- `endTime`: String (Giờ kết thúc)
- `status`: Enum (`OPEN`, `FULL`, `DONE`)
- `createdAt` / `updatedAt`: DateTime

### Bảng `Registration` (Học viên đăng ký)
- `id`: UUID (Primary Key)
- `classId`: UUID (Khóa ngoại trỏ về `Class.id`)
- `fullName`: String (Họ và tên)
- `dob`: DateTime (Ngày sinh)
- `phone`: String (Số ĐT / Zalo)
- `email`: String (Email)
- `organization`: String (Tên đơn vị - Tùy chọn)
- `printOrgOnCert`: Boolean (Có in tên đơn vị lên GCN không)
- `note`: String (Ghi chú thêm)
- `paymentStatus`: Enum (`PENDING`, `PAID`, `CANCELLED`)
- `createdAt`: DateTime (Thời điểm đăng ký)

## 3. Kiến trúc API (Next.js Route Handlers)

Thay vì dùng Express, chúng ta sẽ viết trực tiếp trong thư mục `/src/app/api/...`:

- `POST /api/auth/login`: Xác thực admin, trả về HttpOnly Cookie chứa JWT Token.
- `POST /api/auth/logout`: Xóa Cookie.
- `GET /api/classes`: Trả về danh sách lớp học (Public cho Landing Page).
- `GET /api/settings`: Trả về thông tin cấu hình ngân hàng (Public).
- `POST /api/registrations`: Tạo mới một lượt đăng ký (Public).
- `GET/POST/PUT/DELETE /api/admin/...`: Các API quản trị, được bảo vệ bởi Middleware (Chỉ cho phép nếu có JWT Token hợp lệ).

## 4. Bảo mật (Security)
- **CORS:** Cấu hình tự động xử lý bởi Next.js (cùng domain).
- **Authentication:** Sử dụng JWT ký bằng thư viện `jose` (Edge-compatible). Token không lưu ở LocalStorage mà lưu ở **HttpOnly, Secure Cookie** để chống tấn công XSS.
- **Data Validation:** Sử dụng `Zod` để validate mọi dữ liệu từ Frontend gửi lên API trước khi đưa vào Database qua Prisma.

## 5. Môi trường Docker & Reverse Proxy (Nginx)
Hệ thống sẽ chạy qua `docker-compose.yml` với 3 services chính cho môi trường Thực tế (Production):
1. **`postgres`**: Chạy image `postgres:16-alpine`, lưu trữ dữ liệu qua Volume.
2. **`web` (Next.js)**: Chạy ứng dụng Next.js ở chế độ Standalone (Cổng 3000), kết nối nội bộ tới database.
3. **`nginx` (Reverse Proxy)**: 
   - Rất cần thiết khi deploy lên máy chủ Debian. 
   - Đứng mũi chịu sào ở cổng 80 (HTTP) và 443 (HTTPS), tiếp nhận request từ người dùng và đẩy về cho Next.js (cổng 3000).
   - Nginx sẽ giúp: Xử lý chứng chỉ bảo mật SSL/HTTPS (qua Certbot/Let's Encrypt), nén Gzip giúp web tải nhanh hơn, và chặn các request rác trước khi tới Node.js.
