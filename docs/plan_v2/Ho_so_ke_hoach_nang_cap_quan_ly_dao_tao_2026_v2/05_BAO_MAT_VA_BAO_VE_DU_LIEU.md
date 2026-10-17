# 05. Kế hoạch bảo mật và bảo vệ dữ liệu

## 1. Baseline

Mục tiêu tối thiểu: áp dụng tư duy OWASP ASVS Level 2 cho các phần có tài khoản, dữ liệu học viên, upload và quản trị.

Không coi framework tự bảo vệ toàn bộ. Mỗi boundary phải có kiểm tra riêng.

## 2. Phân loại dữ liệu

### Public
- nội dung khóa học;
- lịch lớp công khai;
- học phí;
- thông tin liên hệ công khai.

### Internal
- dashboard;
- thống kê vận hành;
- mapping user-role-class.

### Sensitive/PII
- CCCD;
- ngày sinh;
- điện thoại/email;
- bằng cấp/bằng lái;
- biên lai;
- lịch sử đăng ký;
- thông tin thanh toán/chứng từ liên quan cá nhân.

PII không được xuất hiện trong URL, log hoặc tên file.

## 3. Authentication/session

- HTTPS toàn bộ production.
- Cookie `Secure`, `HttpOnly`, `SameSite` được set rõ.
- session token đủ ngẫu nhiên, không tuần tự.
- revoke khi logout/khóa account.
- absolute expiry; không gia hạn vô hạn.
- MFA cho admin cao quyền qua SSO.
- reauthentication cho thao tác nhạy cảm.

## 4. Authorization

Nguyên tắc:
- default deny;
- server-side enforcement;
- object-level authorization;
- field-level authorization khi export/import;
- role + data scope.

Kiểm tra bắt buộc với:
- `/courses/[classId]`;
- `/registrations`;
- Excel;
- file download;
- file upload admin;
- thanh toán;
- invoice/certificate;
- users/settings;
- SSO identity link.

## 5. CSRF và request integrity

- Server Actions dùng cơ chế framework nhưng vẫn validate authorization và input.
- Custom POST Route Handler phải kiểm tra Origin/CSRF strategy phù hợp.
- Upload phải bảo vệ CSRF.
- OIDC dùng state + PKCE + nonce/checks theo flow.
- GET không được thay đổi trạng thái.

## 6. Validation

- Zod/server schema là allowlist.
- giới hạn length cho mọi text field;
- chuẩn hóa Unicode khi cần;
- normalize phone/CCCD trước so sánh;
- không concat SQL;
- không tin client-provided price/status/role.

## 7. Upload

Bắt buộc:
- extension allowlist;
- magic bytes/content verification;
- MIME allowlist;
- max size;
- max file count;
- filename server-generated;
- storage ngoài webroot;
- no execute permission;
- virus scan nếu có;
- PDF/image preview không cho chạy active content;
- download với `Content-Disposition` an toàn.

Không phục vụ CCCD/bằng cấp qua `/public/uploads/*`.

## 8. Search public

Không search chỉ bằng 1 định danh dễ đoán.

Đề xuất A:
```text
Mã hồ sơ + SĐT
```

Đề xuất B:
```text
Mã hồ sơ + email -> gửi OTP/link tra cứu
```

Phản hồi không được tiết lộ quá nhiều. Rate limit và audit số lượt thất bại.

## 9. Rate limiting

Tối thiểu áp dụng:
- login/local break-glass;
- OIDC start/callback abnormal patterns;
- search;
- registration submit;
- upload;
- resend email;
- Excel import;
- endpoint back-channel có rate control riêng nhưng không chặn request hợp lệ từ IdP theo cách thô.

Kết hợp:
- Nginx `limit_req` cho endpoint public;
- app-level limit theo key/IP/identity cho use case cần chính xác hơn.

## 10. Security headers

Production Nginx/Next cần rà:
- `Strict-Transport-Security` sau khi HTTPS ổn định;
- `Content-Security-Policy`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy`;
- `Permissions-Policy`;
- `frame-ancestors` trong CSP hoặc tương đương;
- cookie flags.

CSP triển khai theo report-only trước nếu ứng dụng hiện có nhiều inline script/third-party.

## 11. Secret management

- không commit `.env`;
- client secret SSO riêng từng app/môi trường;
- SMTP password riêng;
- DB credential quyền tối thiểu;
- không dùng `NEXT_PUBLIC_` cho secret;
- Docker runtime inject secret, không bake vào image;
- rotate khi nhân sự/nhà cung cấp thay đổi hoặc lộ nghi ngờ.

## 12. Logging/audit

Audit event nên có:
```text
actorUserId
actorSessionId
action
resourceType/resourceId
result
reason
ip
userAgent summary
createdAt
correlationId
```

Audit các thao tác:
- login/logout/revoke;
- link SSO;
- đổi role/scope;
- duyệt/từ chối;
- thanh toán/invoice;
- GCN/GXN;
- chuyển lớp;
- import/export;
- download hồ sơ nhạy cảm;
- settings.

Không log:
- password;
- cookie/session token;
- access/refresh/id token;
- raw logout token;
- full CCCD;
- full upload content.

## 13. Data protection nâng cao

Nếu cần tra cứu CCCD nội bộ:
- `cccdLookupHash = HMAC-SHA256(normalizedCCCD, lookupKey)` để tìm kiếm chính xác;
- giá trị CCCD gốc có thể mã hóa ứng dụng bằng AES-GCM nếu yêu cầu bảo vệ ở mức cao hơn;
- key mã hóa tách khỏi DB.

Không tự triển khai crypto nếu chưa có quy trình quản lý key.

## 14. Security review trước release

- dependency audit;
- secret scan;
- route inventory;
- permission matrix test;
- file upload abuse test;
- search enumeration test;
- IDOR test;
- CSRF/origin test;
- CSP report review;
- session fixation/replay test;
- SSO issuer/audience/state/PKCE/logout test;
- backup chứa PII phải được bảo vệ tương đương production DB.
