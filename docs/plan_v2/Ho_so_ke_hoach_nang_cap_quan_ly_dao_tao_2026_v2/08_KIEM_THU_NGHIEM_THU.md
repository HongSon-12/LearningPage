# 08. Kế hoạch kiểm thử và nghiệm thu

## 1. Test pyramid thực dụng

1. Unit: schema, helper, authorization predicate.
2. Integration: Prisma + Postgres cho business transaction.
3. HTTP smoke: route/auth/permission.
4. E2E: vài luồng quan trọng bằng trình duyệt.
5. Manual visual: desktop/mobile/accessibility.
6. Security/performance checks trước release.

## 2. Baseline bắt buộc trước refactor

Khi DB hoạt động:
```bash
pnpm exec prisma migrate status
pnpm exec prisma generate
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm test:management
pnpm test:http
```

Lưu kết quả vào báo cáo ngày kiểm tra.

## 3. Regression business

### Capacity
- 39/40 + 12 request đồng thời -> chỉ thêm 1;
- retry cùng idempotency key không thêm hồ sơ;
- từ chối/hủy giải phóng chỗ đúng;
- kích hoạt lại kiểm tra chỗ.

### Transfer
- cùng phạm vi hợp lệ;
- lớp full;
- khác học phí;
- đã có invoice/GCN/GXN;
- ngoài scope;
- rollback nếu transaction lỗi.

### Manual/Late
- qua deadline khi OPEN;
- không vượt capacity;
- origin type đúng;
- email theo rule đã chốt.

### Review/payment
- reject bắt buộc lý do;
- class manager không update payment;
- accountant không approve hồ sơ nếu không có quyền;
- admin đầy đủ theo matrix.

### Excel
- file đúng;
- file sai một dòng -> rollback;
- số 0 đầu;
- sai lớp;
- field ngoài quyền;
- >500 dòng;
- >5MB.

## 4. SSO test

- login thành công;
- user chưa link;
- user local inactive;
- state mismatch;
- replay callback;
- issuer mismatch;
- revoke local;
- deactivate IdP;
- back-channel valid/invalid/replay;
- logout local/global;
- SSO outage;
- role/scope local không bị thay đổi ngoài ý muốn.

## 5. Upload test

- valid jpg/png/pdf;
- extension giả;
- content-type giả;
- file lớn;
- double extension;
- filename traversal;
- unauthorized download;
- user lớp A thử file lớp B;
- no execute;
- header download đúng.

## 6. Search test

- đúng mã + đúng yếu tố thứ hai;
- sai từng phần;
- nhiều lần thất bại -> rate limit;
- response không phân biệt quá mức;
- không trả PII thừa;
- token hết hạn/replay nếu dùng token.

## 7. UI visual

Màn hình bắt buộc:
- login;
- dashboard;
- courses;
- class roster;
- registrations;
- users/settings;
- landing pages;
- register wizard;
- search.

Device:
- 360x800;
- 390x844;
- 768px;
- 1366x768;
- 1440x900.

Kiểm tra:
- overflow;
- modal/drawer;
- table sticky/scroll;
- keyboard;
- focus;
- loading/error/empty;
- tiếng Việt có dấu;
- zoom 200% cơ bản.

## 8. Performance test

### Public
- Lighthouse production build;
- hero/LCP image;
- JS bundle;
- slow 4G profile tham khảo.

### API
Đo p95 cho:
- public class list;
- registration Step 2;
- admin roster;
- search;
- Excel export nhỏ.

### DB
- query plan cho query list/filter chính;
- pool saturation;
- lock contention lúc registration concurrent.

## 9. Security test

- IDOR;
- forced browsing;
- CSRF custom routes;
- XSS stored/reflected ở tên/ghi chú;
- open redirect;
- file upload abuse;
- export data over-scope;
- session reuse after lock;
- SSO logout token validation;
- security headers/CSP.

## 10. UAT checklist

Người nghiệp vụ xác nhận:
- thuật ngữ;
- quyền;
- trạng thái;
- email;
- nội dung landing;
- field bắt buộc;
- xử lý lỗi;
- chuyển lớp;
- quy trình hậu kỳ.

Mỗi lỗi UAT phải có:
```text
ID
môi trường
user/role
route
bước tái hiện
kết quả thực tế
kết quả mong muốn
severity
ảnh/video nếu có
```

## 11. Exit criteria

Không release nếu còn:
- lỗi P0/P1;
- build/test đỏ;
- upload public PII;
- search enumeration;
- quyền server-side thiếu;
- migration chưa dry-run;
- không có backup/restore test;
- secret production chưa tách môi trường.
