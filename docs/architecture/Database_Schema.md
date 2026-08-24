# Cấu Trúc Cơ Sở Dữ Liệu (Database Schema) - Hệ Thống Quản Lý Khóa Học Trung Tâm

Tài liệu này mô tả cấu trúc CSDL của ứng dụng cốt lõi (Core System), được thiết kế linh hoạt để hoạt động như một Trạm Trung Tâm (LMS) tiếp nhận và quản lý dữ liệu từ nhiều nhánh quảng bá (Landing Pages) khác nhau.

## 1. Các Enum (Danh mục trạng thái và Phân loại)

### `CourseType`
Dùng để phân loại các khóa học, từ đó giúp Frontend biết hiển thị mẫu Form đăng ký nào và yêu cầu những giấy tờ gì.
- `COMMUNITY_FIRST_AID`: Sơ cấp cứu cộng đồng.
- `CME_ABCDE`: Cấp cứu ban đầu ngoài bệnh viện - Xử trí bệnh cấp cứu và chấn thương – ABCDE.
- `AMBULANCE_DRIVER`: Sơ cấp cứu ban đầu dành cho lái xe vận chuyển cấp cứu.
- `CPR_ADVANCED`: Hồi sinh tim phổi nâng cao.
- `CPR_BASIC`: Hồi sinh tim phổi cơ bản.
*(Có thể mở rộng thêm vô hạn khóa học trong tương lai).*

### `RegistrationStatus`
Trạng thái kiểm duyệt hồ sơ đăng ký của học viên.
- `PENDING`: Đang chờ duyệt (Mặc định).
- `APPROVED`: Đã duyệt (Kích hoạt luồng gửi Mail Xác nhận đăng ký chính thức).
- `REJECTED`: Từ chối hồ sơ (Do giấy tờ sai sót hoặc thiếu).

### `PaymentStatus`
Trạng thái thanh toán học phí.
- `PENDING`, `PAID`, `CANCELLED`.

### `ClassStatus`
Trạng thái của một lớp học.
- `OPEN` (Đang tuyển sinh), `FULL` (Đã đủ số lượng), `DONE` (Đã kết thúc).

---

## 2. Bảng Dữ Liệu Cốt Lõi (Core Models)

### Bảng `Class` (Quản lý Lớp học)
Mỗi dòng đại diện cho một lịch khai giảng cụ thể của một khóa học.
- `id`: Định danh duy nhất (UUID).
- `courseType`: Phân loại khóa học (Liên kết với Enum `CourseType`).
- `code`: Mã lớp (VD: SCC-01, CME-10).
- `name`: Tên lớp (Hiển thị cho học viên).
- `date`, `startTime`, `endTime`: Lịch học.
- `capacity`: Số lượng học viên tối đa (Khi đạt mức này, tự động kích hoạt đẩy sang Form Đăng Ký Vét).
- `status`: Trạng thái lớp (`ClassStatus`).

### Bảng `Registration` (Hồ sơ Học viên)
Đây là "trái tim" của hệ thống, nơi lưu trữ mọi thông tin xuyên suốt từ lúc khách mới điền Form cho đến khi nhận Chứng chỉ.
**Thông tin cá nhân cơ bản:**
- `id`, `classId` (Khóa ngoại trỏ về `Class`).
- `fullName`, `dob` (Ngày sinh), `phone`, `email`.

**Thông tin Hồ sơ (Đặc thù CME):**
- `cccd`: Số Căn cước công dân.
- `workplace`: Đơn vị công tác / Nơi làm việc.
- `organization`: Tổ chức cử đi học (Nếu có).
- `printOrgOnCert`: Cờ đánh dấu có in tên tổ chức lên chứng chỉ không.

**Lưu trữ File Chứng từ (Dạng Link tĩnh - Uploads):**
- `idPhotoUrl`: Đường dẫn ảnh chụp CCCD.
- `degreeUrl`: Đường dẫn ảnh chụp Bằng cấp chuyên môn (Y tế, Lái xe...).
- `paymentReceiptUrl`: Đường dẫn ảnh chụp Biên lai thanh toán học phí.

**Thông tin Kiểm duyệt & Hậu kỳ:**
- `status`: Trạng thái duyệt hồ sơ (`RegistrationStatus`).
- `paymentStatus`: Trạng thái tiền (`PaymentStatus`).
- `invoiceCode`: Mã tra cứu Hóa đơn điện tử (Admin cập nhật sau khi học xong).
- `certificateCode`: Số Chứng chỉ / Số hiệu bằng cấp (Admin cập nhật).

**Tracking & Marketing:**
- `source`: Nguồn khách (Từ Zalo, Facebook, Direct...).
- `sessionId`: Định danh phiên truy cập của khách hàng.

---

## 3. Các Bảng Khác (Hệ sinh thái)

### Bảng `User`
- Quản lý tài khoản Admin truy cập vào hệ thống Lõi. Gồm `username`, `passwordHash`.

### Bảng `Setting`
- Cấu hình chung cho toàn hệ thống: Thông tin ngân hàng (`bankName`, `accountName`, `accountNumber`, `transferSyntax`), và các mã Tracking hệ thống (`googleAnalyticsId`, `facebookPixelId`).

### Bảng `TrackingEvent`
- Lưu trữ lịch sử click/truy cập của khách hàng từ các nhánh quảng bá vệ tinh đổ về, giúp đo đạc hiệu quả Marketing. Gồm `sessionId`, `eventName`, `source`.

---
*Cấu trúc này đảm bảo tính "Mở" hoàn toàn. Các Landing Page vệ tinh chỉ cần lấy danh sách `Class` từ hệ thống này qua API (hoặc Link) để hiển thị, và khi khách hàng điền form, hệ thống sẽ linh hoạt lưu dữ liệu dựa vào `courseType`.*
