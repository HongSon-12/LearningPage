# Kế hoạch chi tiết: Giao diện Người dùng (User Landing Page)

Tài liệu này mô tả chi tiết trải nghiệm, giao diện (UI) và hành trình (Flow) của học viên khi truy cập trang web để tìm hiểu và đăng ký lớp học sơ cấp cứu.

## 1. Nguyên tắc Thiết kế (Aesthetics & UX)
- **Sang trọng & Tin cậy (Premium & Trust):** Sử dụng thiết kế Glassmorphism (Kính mờ), Gradient màu sắc nhẹ nhàng (Xanh Navy và Vàng Gold), Font chữ hiện đại (Inter).
- **Sống động (Dynamic):** Ứng dụng thư viện `framer-motion` để tạo các vi hoạt ảnh (micro-animations) như:
  - Các khối nội dung từ từ hiện ra (Fade-in-up) khi cuộn chuột tới.
  - Card lớp học nổi lên (Scale) và bóng đổ (Shadow) khi hover.
  - Nút bấm (Button) có hiệu ứng Ripple hoặc nhịp đập (Pulse) để thu hút sự chú ý.
- **Tối ưu Di động (Mobile-First):** Đảm bảo form đăng ký và bảng thông tin hiển thị hoàn hảo trên màn hình điện thoại (do 80% người dùng truy cập từ điện thoại).

## 2. Cấu trúc Trang chủ (Landing Page Sections)

### 2.1. Header & Hero Section
- **Header:** Cố định (Sticky), trong suốt khi ở trên cùng và đổ nền trắng mờ khi cuộn xuống. Chứa Logo, Tên Trung tâm 115 và nút "Đăng ký ngay".
- **Hero Banner:** Hình nền lớn hoặc Gradient tối màu sang trọng.
  - Headline mạnh mẽ: "Khóa Sơ cấp cứu Cộng đồng — Cấp chứng nhận bởi TT Cấp cứu 115".
  - Nút Call-to-Action lớn: "Xem Lịch Khai Giảng".

### 2.2. Vấn đề & Giải pháp (Pain points)
- Hiển thị các Card nhỏ minh họa các tình huống (Trẻ hóc dị vật, Đột quỵ, Đuối nước).
- Sử dụng Icon hoặc Emoji lớn, màu sắc bắt mắt. Thiết kế dạng lưới (Grid) 3 cột.

### 2.3. Lợi ích & Đối tượng
- Trình bày trực quan lý do nên học (Giảng viên là bác sĩ 115, có chứng nhận, thực hành 70%).

### 2.4. Danh sách Lớp học (Dynamic Classes)
- Khu vực hiển thị các lớp học đang **OPEN** (Dữ liệu được lấy từ Database thông qua Next.js Server Components).
- Hiển thị dạng thẻ (Cards) với nút "Chọn lớp này". Các lớp đã **FULL** sẽ bị làm mờ (Disabled).

## 3. Trải nghiệm Đăng ký (Multi-step Wizard)

Thay vì chuyển trang, khi người dùng bấm "Đăng ký", một Modal toàn màn hình (hoặc chuyển slide mượt mà) sẽ hiện ra gồm 3 bước:

### Bước 1: Chọn lớp học
- Người dùng thấy danh sách lớp đang mở (Lọc theo tháng).
- Click chọn 1 lớp -> Tự động chuyển sang Bước 2.

### Bước 2: Thông tin cá nhân
- Điền các trường bắt buộc (Form Validation bằng `React Hook Form` & `Zod`):
  - Họ và tên, Ngày sinh, SĐT/Zalo, Email.
  - Tên đơn vị (Tùy chọn), Ghi chú.
- Bấm "Tiếp tục" -> Chuyển sang Bước 3.

### Bước 3: Thanh toán & Hoàn tất
- Màn hình hiển thị thông tin ngân hàng được lấy động từ Database (Bảng Setting).
- **Tích hợp VietQR:** Tự động tạo mã QR chứa nội dung chuyển khoản chuẩn xác (Số tiền 400.000đ + STK + Cú pháp). Học viên chỉ việc quét mã.
- Nút "Tôi đã chuyển khoản". Bấm vào hệ thống sẽ gọi API `/api/registrations` lưu dữ liệu vào Database, sau đó hiển thị màn hình Chúc mừng hoàn tất.
