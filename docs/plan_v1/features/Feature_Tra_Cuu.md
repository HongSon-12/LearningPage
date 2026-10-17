# Tính Năng: Tra Cứu Hóa Đơn Điện Tử (HĐĐT) & Chứng Chỉ

## 1. Mục đích (Giai đoạn 7 & 9)
Nhằm tự động hóa khâu hậu kỳ, giúp học viên có thể chủ động lên Website để tự tra cứu và tải về Hóa đơn điện tử cũng như xác nhận Số Chứng chỉ đã được cấp mà không cần phải gọi điện hỏi trung tâm.

## 2. Luồng xử lý kỹ thuật

### Phía Quản Trị (Admin)
- Admin truy cập trang Chi tiết Lớp học (`app/(admin)/courses/[id]`).
- Chọn các học viên có trạng thái `DONE` (Hoàn thành khóa học).
- Hệ thống hiển thị giao diện dạng bảng, có các ô Input text cho phép Admin:
  - Nhập **Mã tra cứu HĐĐT** (Lấy từ phần mềm kế toán).
  - Nhập **Số chứng chỉ CME** (Lấy từ danh sách cấp phôi).
  - (Tương lai có thể mở rộng tính năng Import file Excel để cập nhật hàng loạt).
- Bấm "Lưu hậu kỳ" để update vào DB (`invoiceCode`, `certificateCode`).
- Sau khi nhập xong, bấm "Gửi Email E" để hệ thống tự động bắn mail thông báo cho các học viên này vào web tra cứu.

### Phía Người Học (Frontend - `app/(user)/search`)
- Học viên truy cập `quanly.115.org.vn/search` (Theo hướng dẫn trong Email E).
- **Giao diện Tra cứu:**
  - Ô nhập liệu: Nhập Số điện thoại hoặc Số CCCD.
  - Nút: "Tra cứu".
- **Xử lý:**
  - Frontend gọi API `GET /api/search?q=...`
  - Backend query DB bảng `Registration` tìm kiếm theo `phone` hoặc `cccd`. Trả về danh sách các khóa học học viên đã tham gia.
- **Hiển thị Kết quả:**
  - Tên học viên.
  - Các khóa học đã học kèm Số Chứng Chỉ tương ứng.
  - Nút/Link "Tải Hóa Đơn Điện Tử" -> Dẫn tới link có chứa `invoiceCode` để họ truy cập hệ thống của cơ quan thuế hoặc link file PDF xuất ra từ kế toán.
