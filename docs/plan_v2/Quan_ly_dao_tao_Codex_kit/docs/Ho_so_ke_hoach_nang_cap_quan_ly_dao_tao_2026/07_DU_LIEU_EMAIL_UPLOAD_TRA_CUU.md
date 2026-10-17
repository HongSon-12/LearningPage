# 07. Dữ liệu, Email, Upload và Tra cứu

## 1. Mục tiêu

Chuẩn hóa các vùng dễ tạo nợ kỹ thuật và rủi ro bảo mật mà không phá luồng đã có.

## 2. Dữ liệu nghiệp vụ

Các entity lõi tiếp tục giữ:
- User;
- Class/CourseType/CourseBatch;
- Registration;
- Payment state;
- Certificate/GXN/invoice;
- class assignment;
- transfer history;
- settings.

Bổ sung/chuẩn hóa:
- `SsoIdentity`;
- `AppSession` có revoke/absolute expiry;
- `StoredFile`;
- `EmailOutbox`;
- `AuditLog`;
- `SearchToken` nếu chọn tra cứu bằng token.

## 3. Upload

### Không dùng nữa
```text
/public/uploads/<filename>
```
cho CCCD, bằng cấp, bằng lái, biên lai.

### Flow mới
1. client chọn file;
2. server kiểm tra size/extension/magic bytes;
3. tạo UUID storage key;
4. lưu ngoài webroot;
5. ghi `StoredFile`;
6. trả `fileId`, không trả public path;
7. Registration lưu FK/fileId;
8. admin xem qua endpoint có authorization.

### Quyền xem
- Quản trị: theo scope toàn bộ.
- Quản lý lớp: file hồ sơ của lớp được giao.
- Kế toán: chỉ file/chứng từ cần cho đối soát, không mặc định xem mọi tài liệu chuyên môn.

## 4. Email outbox

Schema gợi ý:
```text
EmailOutbox
- id
- type
- recipient
- registrationId/classId nullable
- payloadJson
- idempotencyKey UNIQUE
- status PENDING/SENDING/SENT/FAILED
- attemptCount
- nextAttemptAt
- lastErrorCode
- providerMessageId
- createdAt/sentAt
```

Không lưu password/token trong payload.

## 5. Trigger email chuẩn hóa

### Registration received
Khi Bước 2 được lưu thành công:
- xác nhận đã nhận thông tin;
- không khẳng định đã nhận tiền/biên lai nếu chưa có.

### Approved
Chỉ gửi khi nghiệp vụ đã chốt điều kiện “đăng ký thành công”.

### Rejected
Chỉ gửi lý do nếu BGĐ/nghiệp vụ chốt cho phép.

### Reminder/material
Không gửi tự động cho tới khi có scheduler + idempotency + test.

### Invoice/certificate
Gửi theo sự kiện cập nhật và điều kiện đã chốt, tránh spam khi sửa mã nhiều lần.

## 6. Worker email

Đơn giản cho self-host:
- process riêng trong container hoặc cron/systemd gọi command nội bộ;
- mỗi lượt lấy N bản ghi PENDING;
- lock/claim;
- gửi;
- retry exponential/backoff;
- sau số lần giới hạn chuyển FAILED và cảnh báo.

Không cần Redis ở giai đoạn đầu.

## 7. Search public an toàn

### Phương án khuyến nghị
```text
registrationCode + phone/email
```

Hoặc:
```text
registrationCode -> gửi one-time link qua email -> xem kết quả
```

Kết quả chỉ hiển thị:
- tên viết tắt/masked nếu cần;
- tên khóa/lớp;
- trạng thái chứng từ được phép công khai;
- mã tra cứu/hyperlink đã được thiết kế an toàn.

Không trả:
- full CCCD;
- hồ sơ upload;
- lịch sử quản trị;
- payment metadata nội bộ.

## 8. Token tra cứu

Nếu dùng token:
- random >= 128 bit;
- lưu hash trong DB;
- expire;
- single-use nếu phù hợp;
- không log full token;
- rate limit.

## 9. Excel

Giữ nguyên:
- `.xlsx`;
- 500 dòng/5MB;
- preview trước commit;
- file lỗi rollback toàn bộ;
- giữ số 0 đầu;
- import update dùng mã hồ sơ;
- không chuyển lớp qua Excel;
- quyền theo role/scope.

Bổ sung:
- export log ai tải dữ liệu nào;
- file export có timestamp/phạm vi;
- tránh xuất CCCD mặc định nếu không cần;
- cột nhạy cảm chỉ xuất cho role được cấp.

## 10. Retention

Cần chốt chính sách:
- hồ sơ upload giữ bao lâu;
- email outbox/log giữ bao lâu;
- audit giữ bao lâu;
- bản export tạm có xóa sau khi tải hay tạo on-the-fly;
- dữ liệu test không được copy nguyên production PII nếu không cần.
