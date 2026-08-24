# Tính Năng: Quản Lý Form Đăng Ký & Tải Lên Hồ Sơ (Upload)

## 1. Mô tả chung
Hệ thống Core đóng vai trò là nơi tiếp nhận toàn bộ dữ liệu đăng ký từ 6 khóa học vệ tinh. Điểm mấu chốt của tính năng này là **tính linh hoạt (Dynamic)** dựa vào mã lớp (`classId`).

## 2. Luồng xử lý kỹ thuật (Technical Flow)

### Phía Người Học (Frontend - `app/(user)/register/[classId]`)
- Khi truy cập, hệ thống gọi API lấy thông tin `Class` kèm `courseType`.
- **Logic Hiển thị Form:**
  - Nếu `courseType == COMMUNITY_FIRST_AID`: Hiển thị Form cơ bản (Họ tên, SĐT, Email, DOB).
  - Nếu `courseType IN [CME_ABCDE, CPR_ADVANCED, CPR_BASIC]`: Yêu cầu thêm field Bằng cấp, Đơn vị công tác, Ảnh CCCD (Nút Upload file).
  - Nếu `courseType == AMBULANCE_DRIVER`: Yêu cầu field Bằng lái xe, Ảnh CCCD.
- **Tính năng Upload (File Input):**
  - Người dùng bấm tải ảnh/pdf lên. Component sẽ convert file thành `FormData`.
  - Giới hạn dung lượng ở Frontend (ví dụ Max 5MB). File loại `.jpg, .png, .pdf`.

### Phía Máy Chủ (Backend - API Upload)
- API endpoint: `POST /api/upload`
- Xử lý nhận file (sử dụng Next.js API Routes kết hợp `fs` hoặc thư viện `formidable`).
- Ghi file vào thư mục `/public/uploads/` trên máy chủ vật lý.
- Trả về đường dẫn tĩnh: `/uploads/filename.ext`.
- Đường dẫn này sẽ được gửi kèm trong gói JSON khi học viên bấm "Hoàn tất đăng ký" để lưu vào bảng `Registration` dưới dạng các cột: `idPhotoUrl`, `degreeUrl`, `paymentReceiptUrl`.

## 3. Luồng Quản trị (Admin - Hồ sơ)
- Tại trang chi tiết hồ sơ `app/(admin)/admin/registrations`, Admin sẽ nhìn thấy các link (hoặc thumbnail) dẫn tới ảnh CCCD / Bằng cấp.
- Chức năng duyệt: Nút `Approve` để chuyển trạng thái từ `PENDING` sang `APPROVED`. (Kích hoạt luồng gửi Mail C).
