# Tính Năng: Hệ Thống Gửi Email Tự Động (SMTP Mailer)

## 1. Mục đích
Thay thế hoàn toàn việc liên lạc thủ công giữa Admin và Học viên, giảm thiểu rủi ro quên sót thông tin, đồng thời tạo ra một trải nghiệm chuyên nghiệp (Corporate Standard) cho học viên.

## 2. Các Kịch Bản Gửi Email (The 4 Forms)

### A. FORM B - Xác Nhận Chờ Duyệt
- **Thời điểm:** Ngay sau khi Học viên bấm nút "Hoàn tất đăng ký" và đã upload ảnh thanh toán học phí thành công (Giai đoạn 3).
- **Nội dung:** Thông báo hệ thống đã nhận được đầy đủ hồ sơ và biên lai. Đang chờ Admin xác nhận. Gồm các thông tin: Tên HV, Tên Lớp, Số tiền đã chuyển, Kèm lời cảm ơn.
- **Trigger:** Hàm Server Action `createRegistration` sẽ gọi hàm gửi Mail ngay sau khi lưu data vào Database.

### B. FORM C - Thông Báo Đăng Ký Thành Công
- **Thời điểm:** Sau khi Kế toán/Admin kiểm tra thấy tiền đã vào tài khoản, và hồ sơ đã hợp lệ, Admin vào Dashboard và bấm nút **"Duyệt"** (Giai đoạn 4).
- **Nội dung:** Chúc mừng HV đã ghi danh thành công. Nhắc lại lịch học (Ngày, giờ, địa điểm) và một số nội quy khóa học.
- **Trigger:** Hàm Server Action `approveRegistration`.

### C. FORM D - Gửi Tài Liệu Trực Tuyến
- **Thời điểm:** Khoảng 1-3 ngày trước ngày khai giảng khóa học (Giai đoạn 6).
- **Nội dung:** Lời chào, nhắc nhở đi học đúng giờ, và cung cấp các Link tải tài liệu (Slide bài giảng, Ebook...).
- **Trigger:** Nút "Gửi tài liệu khóa học" trong màn hình Quản lý Lớp học của Admin. Nút này sẽ bắn Mail hàng loạt cho tất cả các Học viên có trạng thái `APPROVED` trong lớp đó.

### D. FORM E - Thư Cảm Ơn & Tra Cứu HĐĐT
- **Thời điểm:** Sau khi khóa học kết thúc, Admin nhận được mã từ Kế toán, Admin tiến hành cập nhật "Mã tra cứu Hóa Đơn Điện Tử" vào hệ thống (Giai đoạn 8).
- **Nội dung:** Cảm ơn HV đã tham gia. Hướng dẫn các bước vào website để tra cứu Hóa đơn điện tử (kèm link trang tra cứu) và Chứng chỉ CME.
- **Trigger:** Nút "Gửi Thư cảm ơn" trong giao diện Cập nhật hậu kỳ của Admin.

## 3. Kiến trúc Kỹ thuật
- Sử dụng thư viện `nodemailer` cài đặt trong Next.js (Server actions).
- Email Template: Code bằng HTML/CSS nội tuyến (inline-css) mang màu sắc thương hiệu của Trung Tâm Cấp Cứu 115.
- Cấu hình: Các thông số `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` sẽ được lưu trữ an toàn trong file biến môi trường `.env`.


## 4. Điều chỉnh thời điểm tiếp nhận (06/10/2026)

Hồ sơ và chỗ học được ghi nhận khi thông tin Bước 2 lưu thành công, trước Bước 3. Email tiếp nhận hiện gửi ở thời điểm này, chỉ xác nhận đã nhận thông tin; không khẳng định đã nhận biên lai/thanh toán. Việc duyệt hồ sơ và đối soát vẫn độc lập. Các luồng gửi email Form C/D hàng loạt trong tài liệu là kế hoạch cũ, cần triển khai riêng nếu chưa có; cập nhật hóa đơn/chứng chỉ giữ thông báo hiện có. Import và kiểm thử không tự động gửi email.
