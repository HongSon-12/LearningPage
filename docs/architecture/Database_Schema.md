# Cấu Trúc Cơ Sở Dữ Liệu (Database Schema) - Hệ Thống Quản Lý Khóa Học Trung Tâm

Tài liệu này mô tả cấu trúc CSDL của ứng dụng cốt lõi (Core System), được thiết kế linh hoạt để hoạt động như một Trạm Trung Tâm (LMS) tiếp nhận và quản lý dữ liệu từ nhiều nhánh quảng bá (Landing Pages) khác nhau.

## 1. Các Enum (Danh mục trạng thái và Phân loại)

### `CourseType`
Dùng để phân loại các khóa học.
- `COMMUNITY_FIRST_AID`, `CME_ABCDE`, `AMBULANCE_DRIVER`, `CPR_ADVANCED`, `CPR_BASIC`

### `TargetAudience`
Đối tượng mục tiêu của khóa học (Được phép chọn nhiều cho 1 lớp).
- `DOCTOR` (Bác sĩ), `NURSE` (Điều dưỡng), `PHYSICIAN` (Y sĩ), `DRIVER` (Nhân viên lái xe), `COMMUNITY` (Cộng đồng).

### `CertificateType`
Loại chứng chỉ được cấp.
- `CERTIFICATE` (Giấy chứng nhận).
- `CONFIRMATION` (Giấy xác nhận).

### `Gender`
Giới tính học viên.
- `MALE`, `FEMALE`, `OTHER`

### `RegistrationStatus`
Trạng thái kiểm duyệt hồ sơ đăng ký của học viên.
- `PENDING` (Chờ duyệt), `APPROVED` (Đã duyệt), `REJECTED` (Từ chối).

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
- `courseType`: Phân loại khóa học.
- `code`: Mã lớp (VD: SCC-01, CME-10).
- `name`: Tên lớp.
- `courseBatch`: Khóa.
- `capacity`: Số lượng học viên tối đa.
- `fee`: Học phí.
- `location`: Địa điểm học.
- `startDate`: Thời gian học (Từ ngày).
- `endDate`: Thời gian học (Đến ngày).
- `registrationDeadline`: Hạn đăng ký.
- `totalLessons`: Tổng số tiết.
- `targetAudiences`: Đối tượng đăng ký (Mảng các `TargetAudience`).
- `certificateType`: Loại chứng chỉ (`CertificateType`).
- `status`: Trạng thái lớp (`ClassStatus`).

### Bảng `Registration` (Hồ sơ Học viên)
Nơi lưu trữ mọi thông tin xuyên suốt từ lúc khách mới điền Form cho đến khi nhận Chứng chỉ.
**Thông tin cá nhân cơ bản:**
- `id`, `classId` (Khóa ngoại trỏ về `Class`).
- `fullName`: Họ và tên.
- `dob`: Ngày tháng năm sinh.
- `gender`: Giới tính.
- `phone`: Số điện thoại.
- `email`: Email.

**Thông tin Hồ sơ:**
- `cccd`: Số căn cước.
- `workplace`: Đơn vị công tác (Nếu có).
- `organization`: Tổ chức cử đi học (Nếu có).
- `printOrgOnCert`: Có in tên tổ chức lên chứng chỉ không.

**Lưu trữ File Chứng từ (Dạng Link tĩnh - Uploads):**
- `idPhotoUrl`: Đính kèm Căn cước công dân.
- `degreeUrl`: Đính kèm Văn bằng chuyên môn.
- `paymentReceiptUrl`: Ảnh đã chuyển khoản.

**Thông tin Kiểm duyệt & Hậu kỳ:**
- `status`: Trạng thái duyệt hồ sơ (`RegistrationStatus`).
- `paymentStatus`: Trạng thái tiền (`PaymentStatus`).
- `invoiceCode`: Mã tra cứu Hóa đơn điện tử.
- `certificateCode`: Số Chứng chỉ.

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
