# 01. Hiện trạng và Gap Analysis

## 1. Tóm tắt hiện trạng

Project đã có phần lớn nghiệp vụ cốt lõi:
- quản lý lớp và học viên;
- đăng ký trực tuyến, thủ công và vét;
- kiểm soát sĩ số đồng thời;
- chuyển lớp;
- duyệt/từ chối;
- thanh toán và hóa đơn;
- GCN/GXN;
- import/export Excel;
- tài khoản và phân quyền;
- landing page chương trình/lớp;
- email ở một số điểm gọi;
- Docker/Nginx ở mức có cấu hình.

Rào cản hiện tại không phải “thiếu ứng dụng”, mà là **chưa tái xác nhận đầy đủ môi trường, giao diện, triển khai và bảo mật production**.

## 2. Các điểm đã làm nhưng phải VERIFY

1. Build production: từng đạt, lần rà soát 17/10 bị chặn bởi PostgreSQL không kết nối.
2. Test management và HTTP: từng đạt các tình huống quan trọng nhưng phải chạy lại.
3. Concurrency 39/40: từng kiểm tra 12 request đồng thời, cần đưa thành test hồi quy.
4. Excel: từng rollback toàn file nếu lỗi, cần giữ nguyên hành vi khi refactor UI.
5. Chuyển lớp: đã lưu lịch sử và kiểm tra quyền, cần test lại sau thay đổi.
6. Khóa tài khoản: đã thu hồi session hiện tại, cần test lại sau SSO.
7. Docker/Nginx/HTTPS/SMTP: chưa đủ bằng chứng nghiệm thu production.
8. Responsive/mobile: chưa có vòng nghiệm thu trực quan đầy đủ.

## 3. Các điểm CHANGE trước production

### 3.1 RootLayout phụ thuộc DB lúc build

Hiện build có thể lỗi khi `RootLayout` đọc cấu hình từ DB trong giai đoạn dựng trang. Cần:
- không bắt buộc DB cho layout gốc tại build nếu dữ liệu đó không phải bắt buộc;
- tách cấu hình động vào component/route động;
- có giá trị fallback cho thông tin không nhạy cảm;
- tuyệt đối không “nuốt lỗi DB” cho các thao tác nghiệp vụ cần tính đúng.

### 3.2 Upload hồ sơ đang hướng tới `/public/uploads`

Đây là thiết kế không phù hợp cho CCCD/bằng cấp/chứng từ. Cần chuyển:
- file ra ngoài webroot;
- tên file ngẫu nhiên;
- metadata trong DB;
- tải/xem qua endpoint có kiểm tra quyền hoặc signed token ngắn hạn;
- chặn thực thi file;
- kiểm tra magic bytes/MIME/extension/size;
- có quy trình quét malware nếu hạ tầng cho phép.

### 3.3 Search theo một trường đơn

Tra cứu bằng một SĐT hoặc CCCD có thể bị enumeration. Trước production:
- không trả kết quả chỉ dựa trên một định danh dễ đoán;
- ưu tiên `registrationCode + phone/email` hoặc token tra cứu gửi qua email;
- rate limit theo IP + khóa tra cứu;
- trả lỗi chung, không tiết lộ “CCCD tồn tại/không tồn tại”;
- chỉ trả dữ liệu tối thiểu.

### 3.4 Email chưa có cơ chế giao hàng bền vững

Không nên gửi SMTP đồng bộ như một phần bắt buộc của transaction nghiệp vụ. Cần:
- lưu nghiệp vụ trước;
- ghi `EmailOutbox` trong transaction hoặc ngay sau transaction;
- worker/cron gửi;
- retry có giới hạn;
- idempotency tránh gửi trùng;
- log message id/trạng thái nhưng không log nội dung nhạy cảm.

### 3.5 SSO chưa nằm trong mã hiện tại

Tài liệu SSO hiện hữu là tài liệu kiến trúc/mẫu, không phải bằng chứng project đã tích hợp. Cần triển khai qua nhánh riêng và test cutover.

## 4. Các điểm DECIDE trước khi khóa nghiệp vụ

1. “Cùng khóa học” khi chuyển lớp: chỉ cùng `courseType` hay phải cùng `courseBatch`?
2. Chênh lệch học phí khi chuyển lớp: tiếp tục chặn hay có quy trình điều chỉnh?
3. Thời hạn giữ chỗ hồ sơ chưa thanh toán: có auto-expire không?
4. Trường gửi GCN: có cần ngày gửi, người gửi, mã bưu gửi?
5. Có gửi lý do từ chối cho học viên qua email không?
6. Đăng ký thủ công/vét có gửi email giống đăng ký trực tuyến không?
7. Landing page: concept riêng theo chương trình hay riêng tới từng lớp?
8. Tài khoản có được kiêm nhiều vai trò không?
9. SSO: có yêu cầu khóa tập trung có hiệu lực tối đa 5 phút không?
10. Có giữ một tài khoản local break-glass hay bắt buộc 100% SSO cho admin?

## 5. Ưu tiên rủi ro

| Mức | Hạng mục | Lý do |
|---|---|---|
| P0 | Khôi phục DB + build/test | Không có baseline thì mọi refactor đều khó kiểm chứng |
| P0 | Private upload | Dữ liệu hồ sơ cá nhân không được public tĩnh |
| P0 | Search hardening | Tránh dò dữ liệu học viên |
| P0 | Server-side authorization audit | Tránh IDOR/leo quyền |
| P1 | shadcn design system | Nâng UX nhưng ít rủi ro nếu không đổi logic |
| P1 | SSO POC/cutover | Tập trung danh tính, thu hồi phiên |
| P1 | SMTP/outbox | Độ tin cậy vận hành |
| P1 | Nginx/TLS/security headers | Baseline production |
| P1 | DB index/pool/query | Hiệu năng và ổn định |
| P2 | Landing page concept nâng cao | Tăng chất lượng quảng bá |
| P2 | Realtime/WebSocket | Chưa cần nếu server vẫn quyết định sĩ số |

## 6. Nguyên tắc không phá vỡ chức năng đã có

- Mọi refactor phải giữ test 39/40.
- Không đổi cách đếm sĩ số chỉ vì đổi component UI.
- Không dùng client state làm nguồn sự thật cho quyền hoặc sĩ số.
- Không để import Excel bypass quy trình chuyển lớp/quyền/sĩ số.
- Không để SSO group tự động biến thành vai trò quản trị nếu chưa có quy tắc chính thức.
- Không xóa user khi nghỉ/khóa vì còn lịch sử nghiệp vụ.
