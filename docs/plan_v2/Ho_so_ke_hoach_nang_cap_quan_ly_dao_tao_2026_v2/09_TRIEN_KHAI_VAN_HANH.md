# 09. Kế hoạch triển khai và vận hành

## 1. Môi trường

Tối thiểu:
- development;
- test/staging;
- production.

Không dùng chung:
- DB;
- SSO client secret;
- SMTP credential;
- upload storage;
- session secret/key.

## 2. Docker

Image production:
- multi-stage build;
- chạy non-root;
- chỉ copy artifact cần thiết;
- không copy `.env`/secret;
- healthcheck hợp lý;
- writable volume chỉ cho vùng cần ghi.

## 3. Nginx

Nhiệm vụ:
- HTTPS termination;
- redirect HTTP -> HTTPS;
- proxy header chuẩn;
- request body limit;
- rate limit một số endpoint;
- security headers;
- timeout phù hợp;
- không cache admin/search/file private.

Upload size ở Nginx phải khớp app.

## 4. Health endpoint

Tách:
```text
/api/health/live   # process sống
/api/health/ready  # DB + dependency tối thiểu
```

Không trả version secret/connection string.

## 5. Migration deploy

Quy trình:
1. backup DB;
2. `prisma migrate status`;
3. xem SQL migration;
4. chạy ở staging clone;
5. test;
6. maintenance/cutover window nếu cần;
7. `prisma migrate deploy` production;
8. smoke test;
9. rollback theo plan nếu lỗi.

Không dùng `migrate dev` trên production.

## 6. Backup

Backup phải gồm:
- PostgreSQL;
- private upload storage;
- cấu hình không-secret cần khôi phục;
- mapping version/image deployed.

Secret backup tách riêng theo quy trình quản lý secret.

## 7. Restore test

Không coi backup là hoàn chỉnh nếu chưa restore thử.

Test định kỳ:
- restore DB vào máy staging;
- restore file;
- kiểm tra relation fileId -> storageKey;
- chạy smoke test.

## 8. Logging

Ứng dụng ghi log có cấu trúc:
```text
time
level
requestId/correlationId
route/action
result
errorCode
userId nếu có
```

Không log PII/token.

Nginx access log không nên chứa query token tra cứu hoặc callback secret; thiết kế URL tránh secret trong query khi có thể.

## 9. Monitoring

Theo dõi:
- app up/down;
- HTTP 5xx;
- p95 latency;
- DB connectivity;
- disk usage upload;
- DB disk;
- email failed outbox;
- backup result;
- certificate expiry;
- SSO callback/back-channel failures.

## 10. SMTP

- STARTTLS/TLS theo provider;
- verify certificate;
- timeout;
- rate phù hợp;
- sender domain/SPF/DKIM/DMARC nếu quản lý được;
- template test trên Gmail/Outlook/mobile.

## 11. SSO dependency outage

Public site và registration public vẫn chạy.
Admin:
- session local còn hợp lệ xử lý theo lease policy;
- login mới có thể tạm unavailable;
- hiển thị lỗi rõ, không fallback tự động sang bypass authentication.

Break-glass nếu được phê duyệt phải có SOP riêng.

## 12. Release

Mỗi release ghi:
```text
version/tag
commit
migration
image digest
ngày giờ
người triển khai
backup id
smoke result
rollback point
```

## 13. Rollback

Rollback app dễ hơn rollback schema. Vì vậy:
- migration ưu tiên backward-compatible;
- deploy code mới đọc được schema mới và cũ trong cửa sổ ngắn khi cần;
- tránh drop column cùng release;
- chỉ cleanup sau 1-2 release ổn định.
