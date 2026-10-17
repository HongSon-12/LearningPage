# Lưu Đồ Quy Trình Quản Lý Tiếp Nhận Và Triển Khai Khóa Học CME

Tài liệu này mô tả chi tiết logic hệ thống và các quyết định kỹ thuật đã thống nhất dựa trên quy trình CME. 

## 1. Các Quyết Định Kỹ Thuật Chính
- **Mẫu Form Đăng Ký:** Sẽ hard-code (code cứng) 5 mẫu form chuyên biệt tương ứng với 5 lớp học:
  1. Lớp cập nhật kiến thức y khoa liên tục về “Cấp cứu ban đầu ngoài bệnh viện - Xử trí bệnh cấp cứu và chấn thương – ABCDE” (CME_ABCDE)
  2. Lớp Sơ cấp cứu dành cho Cộng đồng (COMMUNITY_FIRST_AID)
  3. Lớp tập huấn "Sơ cấp cứu ban đầu dành cho lái xe vận chuyển cấp cứu" (AMBULANCE_DRIVER)
  4. Lớp Hồi sinh tim phổi nâng cao (CPR_ADVANCED)
  5. Lớp Hồi sinh tim phổi cơ bản (CPR_BASIC)
  Cấu trúc dữ liệu của các khóa CME được thiết kế chặt chẽ để kiểm tra tính hợp lệ của hồ sơ tải lên (CCCD, Bằng cấp).
- **Lưu trữ Hồ sơ & Minh chứng:** Các tệp tin ảnh CCCD, bằng cấp, biên lai thanh toán sẽ được hệ thống upload qua API và lưu trữ trực tiếp trên ổ cứng của Máy chủ (Local Storage tại thư mục `public/uploads`). Cần có giải pháp sao lưu định kỳ thư mục này.
- **Hệ thống Gửi Mail Tự Động:** Dùng giao thức SMTP (qua thư viện `nodemailer`) với tài khoản máy chủ do Trung tâm cấp. Hệ thống sẽ tự động cấu hình và gửi các loại Form B, C, D, E.

## 2. Chi Tiết 9 Giai Đoạn Vận Hành

### GIAI ĐOẠN 1: Khởi tạo khóa học
- **Người Quản Lý (Admin):** Nhập thông tin khóa học, chọn loại đối tượng (chọn mẫu Form), số lượng tối đa.
- **Hệ Thống:** Lưu vào cơ sở dữ liệu `Class` với trường `courseType` tương ứng.

### GIAI ĐOẠN 2: Tiếp nhận hồ sơ đăng ký
- **Học Viên:** Điền thông tin cá nhân và upload các minh chứng (CCCD, Bằng cấp) dựa theo `courseType`.
- **Hệ Thống:** Validate (kiểm tra định dạng, bắt buộc). Nếu sai, báo lỗi. Nếu đúng, cho qua.

### GIAI ĐOẠN 3: Thanh toán và kiểm soát số lượng
- **Hệ Thống:** Kiểm tra khóa học đã đủ số lượng chưa?
  - Nếu ĐÃ ĐỦ: Báo “Số lượng học viên đã đủ”, giữ thông tin trên form để chọn lớp khác; chưa tự động tạo danh sách chờ.
  - Nếu CHƯA ĐỦ: Lưu đăng ký và ghi nhận 01 chỗ trong cùng giao dịch kiểm tra sĩ số; chỉ sau khi lưu thành công mới chuyển tới Bước 3 – Thanh toán.
- **Học Viên:** Chuyển khoản học phí và tải lên ảnh chụp minh chứng giao dịch.
- **Hệ Thống:** Lưu ảnh biên lai. Gửi tự động Email **FORM B** (Xác nhận đã ghi nhận thông tin, chờ duyệt).

### GIAI ĐOẠN 4: Xác nhận đăng ký chính thức
- **Người Quản Lý (Admin):** Xem lại hồ sơ (CCCD, Bằng cấp) và đối chiếu biên lai chuyển khoản. Bấm "Duyệt".
- **Hệ Thống:** Gửi tự động Email **FORM C** (Xác nhận đăng ký thành công).

### GIAI ĐOẠN 5: Đăng ký vét (Ngoại tuyến)
- **Người Quản Lý (Admin):** Khách đến nộp trực tiếp hoặc nộp trễ ngoài hệ thống web. Quản trị viên nhập thông tin khách vào hệ thống.
- **Hệ Thống:** Cập nhật danh sách học viên của khóa học.

### GIAI ĐOẠN 6: Gửi tài liệu trước khóa học
- **Người Quản Lý (Admin):** Bấm nút "Gửi tài liệu".
- **Hệ Thống:** Gửi tự động Email **FORM D** (Kèm tài liệu khóa học).

--- BẮT ĐẦU KHÓA HỌC ---

### GIAI ĐOẠN 7: Cập nhật sau khóa học
- **Người Quản Lý (Admin):** Nhận "Mã tra cứu Hóa Đơn Điện Tử (HĐĐT)" từ bộ phận Kế toán. Nhập mã này cùng với "Số chứng chỉ" vào hệ thống cho từng học viên.
- **Hệ Thống:** Lưu lại `invoiceCode` và `certificateCode` vào hồ sơ.

### GIAI ĐOẠN 8: Gửi thư cảm ơn & Hướng dẫn tra cứu HĐĐT
- **Hệ Thống:** Gửi tự động Email **FORM E** (Cảm ơn và cung cấp hướng dẫn cách tra cứu hóa đơn, chứng chỉ).

### GIAI ĐOẠN 9: Học viên tự tra cứu Hóa đơn/Chứng chỉ
- **Học Viên:** Truy cập trang Tra cứu (`/search`) trên Website, nhập số điện thoại hoặc CCCD.
- **Hệ Thống:** Trả về kết quả Số chứng chỉ và Hóa đơn điện tử để học viên tải về. Kết thúc quy trình.

## 3. Kiến Trúc Tên Miền (Domain Architecture)
- **Hệ thống Quản lý Tập trung (Core System):** Ứng dụng Next.js hiện tại sẽ đóng vai trò là "Trung tâm Quản lý & Đăng ký". Chứa các trang Admin, trang Danh sách Lớp học (`/courses`), trang Đăng ký (`/register/[id]`), và trang Tra cứu (`/search`).
- **Các Trang Landing Page Vệ tinh:** 6 khóa học (Sơ cấp cứu + 5 CME) sẽ được triển khai trên các tên miền riêng biệt độc lập (Ví dụ: WordPress, Ladipage hoặc các site tĩnh). 
- **Liên kết:** Các Landing page vệ tinh này sẽ trỏ link đăng ký về hệ thống quản lý tập trung (trỏ về `/courses` để người dùng chọn lịch, hoặc trỏ thẳng vào `/register/[id]`). Hệ thống quản lý sẽ tự động nhận diện ID lớp để hiển thị Form Đăng ký phù hợp mà không bị nhầm lẫn.

---
*Tài liệu này là cơ sở để lập kế hoạch sửa đổi Database Schema và các API liên quan trong dự án.*


Quy tắc chuyển lớp, đăng ký vét, phân quyền, Excel và trường hậu kỳ mới theo [đặc tả cập nhật](../features/Feature_Cap_Nhat_Quan_Ly_Hoc_Vien_Va_Landing_Page.md#12-thiết-lập-đã-triển-khai-06102026).
