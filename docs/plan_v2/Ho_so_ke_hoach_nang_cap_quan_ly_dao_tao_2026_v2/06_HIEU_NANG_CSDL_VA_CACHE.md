# 06. Kế hoạch hiệu năng, CSDL và cache

## 1. Nguyên tắc

Tối ưu theo đo lường, không thêm hạ tầng chỉ vì “có thể nhanh hơn”.

Mục tiêu thực tế:
- landing page tải nhanh trên mobile;
- admin table phản hồi ổn định;
- đăng ký/giữ chỗ chính xác khi đồng thời;
- build không phụ thuộc DB không cần thiết;
- DB không cạn connection.

## 2. Server Components trước

- page/layout mặc định là Server Component;
- chỉ gửi JS cho component tương tác;
- chart, modal nặng, editor có thể dynamic import khi cần;
- không ship Prisma/server-only code sang client.

## 3. Landing page

- dùng `next/image` cho ảnh marketing;
- đặt kích thước/aspect ratio rõ;
- lazy-load ảnh dưới fold;
- hero chỉ preload ảnh thực sự là LCP;
- dùng `next/font` hoặc font tự host qua Next;
- hạn chế video/background nặng;
- Framer Motion chỉ ở section cần thiết.

## 4. Cache public

Nội dung ít đổi:
- giới thiệu chương trình;
- FAQ;
- hình ảnh;
- nội dung giảng viên.

Có thể cache/revalidate theo sự kiện.

Dữ liệu lớp:
- trạng thái/lịch/học phí có thể cache ngắn;
- số chỗ còn lại chỉ để hiển thị tham khảo;
- lúc submit phải query/lock DB và quyết định lại.

## 5. Admin không cache public

- `no-store`/dynamic cho dữ liệu theo user khi cần;
- không dùng CDN cache cho response chứa PII;
- nếu cache nội bộ, cache key phải gồm scope/identity và có invalidation rõ ràng.

## 6. Query DB

Checklist:
- dùng `select` thay vì include cả object lớn;
- tránh N+1;
- pagination;
- chỉ load file metadata khi cần;
- không load blob/file vào DB list;
- dashboard dùng aggregate query gọn;
- log slow query ở môi trường test/production có kiểm soát.

## 7. Index đề xuất cần rà bằng schema thật

```text
Class(courseType, status, startDate)
Class(status, registrationDeadline)
Registration(classId, status)
Registration(classId, paymentStatus)
Registration(phoneNormalized)
Registration(cccdLookupHash)       # nếu triển khai
Registration(createdAt)
ClassManager(userId, classId)
SsoIdentity(issuer, subject) UNIQUE
AppSession(userId, revokedAt)
AppSession(expiresAt)
AuditLog(createdAt)
EmailOutbox(status, nextAttemptAt)
StoredFile(ownerType, ownerId)
```

Không tạo index trùng hoặc quá nhiều trước khi xem query plan.

## 8. PostgreSQL connection pool

Với Prisma 7 + `@prisma/adapter-pg`, pool do `pg` quản lý.

Cần set rõ:
- `max`;
- `connectionTimeoutMillis`;
- `idleTimeoutMillis`;
- SSL option production nếu DB qua mạng.

Điểm khởi đầu self-host single instance:
```text
max: 5-10
connection timeout: 3-5s
idle timeout: 10-30s
```

Sau đó đo. Tổng pool của mọi instance phải nhỏ hơn `max_connections` của PostgreSQL và chừa chỗ cho admin/migration/monitoring.

## 9. Transaction

Giữ transaction ngắn:
- kiểm tra/chốt sĩ số;
- transfer;
- import Excel;
- update có consistency cao.

Không gửi email, scan file hoặc gọi dịch vụ ngoài bên trong transaction DB.

## 10. Polling sĩ số

Hiện có refresh 15 giây khi tab hiển thị. Đây là chấp nhận được ở quy mô hiện tại.

Tối ưu:
- chỉ poll ở trang thật sự cần;
- dừng khi hidden;
- backoff khi lỗi;
- không dùng polling làm nguồn sự thật;
- chưa cần WebSocket nếu mục tiêu chỉ là hiển thị tương đối mới.

## 11. Excel

Giới hạn hiện tại 500 dòng/5MB là hợp lý cho first release.
- không nâng giới hạn nếu chưa benchmark;
- parse/validate ngoài transaction nếu có thể;
- transaction chỉ cho bước commit;
- export chọn cột theo role, không export object thừa.

## 12. Email

Outbox giúp giảm latency request và tránh SMTP timeout làm người dùng tưởng đăng ký thất bại.

## 13. Upload

- stream file thay vì đọc toàn bộ nếu implementation cho phép;
- giới hạn size tại Nginx và app;
- quét malware async sau upload nếu quy trình cho phép trạng thái `PENDING_SCAN`;
- tránh generate thumbnail đồng bộ với file lớn.

## 14. Build

Phải sửa việc RootLayout gọi DB khi build nếu không cần.

Build gate:
```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

Build production phải chạy khi DB chỉ được cung cấp ở runtime cho phần không cần pre-render DB.

## 15. Chỉ số theo dõi

Public:
- LCP;
- INP;
- CLS;
- TTFB.

Server:
- request latency p50/p95;
- error rate;
- DB connection usage;
- slow query;
- SMTP failure;
- upload failure;
- registration conflict/full rate.

Nghiệp vụ:
- số đăng ký;
- tỷ lệ hoàn tất bước 2 -> 3;
- tỷ lệ duyệt;
- email send success;
- lỗi import.
