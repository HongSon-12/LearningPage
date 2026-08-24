# Phân Tích Đối Tượng Học Viên & Khóa Học Tương Ứng

Hệ thống quản lý 5 lớp học chính, phân chia theo 3 nhóm đối tượng mục tiêu rõ rệt. Việc phân tách đối tượng giúp hệ thống cá nhân hóa Form đăng ký và thông điệp truyền thông.

## 1. Đối tượng: Bác sĩ, Y sĩ, Điều dưỡng (Nhân viên Y tế)
Đây là nhóm đối tượng chuyên môn cao, cần cấp chứng chỉ CME (Đào tạo liên tục).
Hồ sơ đăng ký bắt buộc phải có: **Bằng cấp chuyên môn, Chứng chỉ hành nghề (nếu có), Đơn vị công tác, Ảnh thẻ chụp chuẩn.**

Các lớp áp dụng:
- **CME_ABCDE:** Lớp cập nhật kiến thức y khoa liên tục về “Cấp cứu ban đầu ngoài bệnh viện - Xử trí bệnh cấp cứu và chấn thương – ABCDE”.
- **CPR_ADVANCED:** Lớp Hồi sinh tim phổi nâng cao.
- **CPR_BASIC:** Lớp Hồi sinh tim phổi cơ bản.

## 2. Đối tượng: Cộng đồng người dân
Đây là nhóm đối tượng phổ thông, học để trang bị kỹ năng tự vệ và cứu người.
Hồ sơ đăng ký yêu cầu đơn giản: **Họ tên, SĐT, Năm sinh, CCCD (để cấp giấy chứng nhận cơ bản).**

Lớp áp dụng:
- **COMMUNITY_FIRST_AID:** Lớp Sơ cấp cứu dành cho Cộng đồng.

## 3. Đối tượng: Lái xe vận chuyển cấp cứu
Đây là nhóm đối tượng đặc thù, cần kỹ năng chuyên biệt khi vận chuyển bệnh nhân.
Hồ sơ đăng ký yêu cầu: **Bằng lái xe, CCCD, Đơn vị công tác (Hãng xe cấp cứu/Bệnh viện).**

Lớp áp dụng:
- **AMBULANCE_DRIVER:** Lớp tập huấn "Sơ cấp cứu ban đầu dành cho lái xe vận chuyển cấp cứu".

---
*Ghi chú: Mỗi đối tượng trên sẽ được hệ thống Core tự động điều hướng sang Form nhập liệu (Wizard) tương ứng khi họ bấm "Đăng ký" vào đúng mã lớp của họ.*
