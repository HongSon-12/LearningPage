# 12. Kế hoạch dependencies và package

## 1. Baseline hiện có

```json
{
  "@prisma/adapter-pg": "^7.9.1",
  "@prisma/client": "^7.9.1",
  "bcryptjs": "^3.0.3",
  "exceljs": "^4.4.0",
  "framer-motion": "^13.0.0",
  "lucide-react": "^1.31.0",
  "next": "16.3.0",
  "nodemailer": "^10.0.3",
  "pg": "^8.23.0",
  "react": "19.2.8",
  "react-dom": "19.2.8",
  "recharts": "^3.10.1",
  "server-only": "^0.0.1",
  "uuid": "^14.0.1"
}
```

Đây chỉ là phần `dependencies` đã được cung cấp. Trước mọi thay đổi, Codex phải đọc repository thật.

## 2. Inventory trước khi cài

Đọc:
- `package.json`;
- `pnpm-lock.yaml`;
- `devDependencies`;
- `components.json`;
- `postcss.config.*`;
- `tsconfig.json`;
- `src/components/ui`;
- imports hiện có.

Lệnh tham khảo:
```bash
pnpm list --depth 0
pnpm list tailwindcss @tailwindcss/postcss postcss @tanstack/react-table react-hook-form zod @hookform/resolvers --depth 0
```

## 3. Nhóm A - UI/Form/Table

### Tailwind/PostCSS

Nếu chưa có:
```bash
pnpm add -D tailwindcss @tailwindcss/postcss postcss
```

Nếu đã có, không cài lại.

### shadcn/ui

```bash
pnpm dlx shadcn@latest init
```

Component theo nhu cầu:
```bash
pnpm dlx shadcn@latest add button input field card badge table dialog alert-dialog tabs sidebar dropdown-menu select checkbox radio-group tooltip sheet drawer skeleton separator breadcrumb sonner
```

Không chạy init/add mù quáng nếu source đã tồn tại.

### Table

```bash
pnpm add @tanstack/react-table
```

Dùng cho UI table state; server vẫn quyết định query và quyền.

### Form + schema

```bash
pnpm add react-hook-form zod @hookform/resolvers
```

- RHF: form state.
- Zod: schema/validation.
- Resolver: RHF + Zod.
- Server validate lại.

### Toast

Ưu tiên Sonner qua shadcn:
```bash
pnpm dlx shadcn@latest add sonner
```

## 4. Nhóm B - SSO/Security

### OIDC

```bash
pnpm add openid-client jose
```

- `openid-client`: OIDC Authorization Code + PKCE/discovery.
- `jose`: verify logout token/JWKS khi app xử lý trực tiếp.

Không cài NextAuth v4 vào project đào tạo chỉ để tích hợp SSO.

### Upload signature

Nếu code chưa kiểm tra magic bytes đủ tốt, Codex có thể đề xuất package chuyên biệt như `file-type` hoặc tương đương.

Phải:
- chạy server-only;
- kiểm tra ESM/runtime;
- giới hạn loại file;
- không đưa package vào client bundle.

## 5. Nhóm C - Conditional

| Package/nhóm | Khi nên dùng | Không mặc định |
|---|---|---|
| `date-fns` | xử lý/format ngày giờ lặp nhiều | vài format đơn giản |
| `react-day-picker` | calendar/date picker | không có calendar |
| `cmdk` | command palette/search | sidebar/search thường đủ |
| `nuqs` hoặc tương đương | query/filter URL phức tạp | searchParams thuần vẫn rõ |
| `pino`/logging lib | cần JSON structured logs | chưa có use case vận hành |
| observability SDK | có collector/APM thật | chưa có nơi nhận |
| Redis client | có Redis + use case rõ | “có thể cần cache” |
| queue framework | job volume lớn | outbox + worker đơn giản đủ |

## 6. Không thêm mặc định

- Redux;
- React Query/TanStack Query cho mọi fetch;
- Axios chỉ để thay `fetch`;
- UI framework thứ hai;
- form/schema framework thứ hai;
- WebSocket framework;
- CMS SDK;
- Redis/BullMQ.

Chỉ thêm khi có use case + lý do.

## 7. Chính sách đề xuất package mới

Codex **được phép và nên đề xuất** package mới khi nó làm giải pháp tốt hơn.

Trước khi cài, ghi:
```text
Package:
Vấn đề:
Tại sao stack hiện tại chưa đủ:
Server hay client:
Ảnh hưởng bundle/runtime:
Tương thích Next/React/Node:
License/maintenance:
Rủi ro:
Rollback:
Test:
```

Tạo ADR khi package:
- thay đổi kiến trúc;
- tạo external service/vendor lock-in;
- ảnh hưởng auth/session/crypto;
- ảnh hưởng dữ liệu;
- có chi phí/license đáng kể.

## 8. Quy trình cài

1. Inventory.
2. Đọc docs chính thức hiện hành.
3. Cài theo nhóm nhỏ.
4. Không trộn UI + SSO package cùng commit nếu không cần.
5. Chạy:

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

6. Chạy relevant tests (`test:management`, `test:http` hoặc script thực tế).
7. Ghi build log.
8. Commit lockfile.

## 9. Versioning

- Không `pnpm update --latest` toàn bộ.
- Không major-upgrade Next/React/Prisma trong release UI/SSO.
- Không đổi package manager.
- `pnpm outdated` chỉ để tham khảo.
- Package security advisory phải đánh giá exploitability và regression trước khi nâng.

## 10. Prisma/pg

- một pattern Prisma client thống nhất;
- không tạo pool/request;
- pool/timeout qua `pg` adapter;
- migration theo config repo;
- thay pool phải benchmark.

## 11. Release dependency checks

```bash
pnpm audit
pnpm outdated
```

Ngoài ra:
- kiểm tra secret scan;
- package mới có owner/use case;
- loại bỏ package thử nghiệm không dùng trước release.

## 12. Acceptance criteria

- [ ] Stack shadcn/Tailwind rõ ràng.
- [ ] TanStack Table cho DataTable.
- [ ] RHF/Zod/resolver thống nhất cho form phức tạp.
- [ ] Sonner thống nhất toast.
- [ ] SSO package server-only.
- [ ] Không framework trùng.
- [ ] Lockfile được lưu.
- [ ] Typecheck/build/test đạt sau nhóm package.
- [ ] Package ngoài baseline có lý do trong log.

## 13. Dependency thực tế sau Phase 1 — 17/10/2026

| Package | Version | Mục đích / phạm vi |
|---|---|---|
| @tanstack/react-table | 9.3.1 | Native useTable; chỉ sorting/pagination/columnVisibility features |
| react-hook-form | 7.90.0 | Login và form lớp |
| zod | 4.6.7 | Client form validation; server vẫn kiểm tra như baseline |
| @hookform/resolvers | 5.9.1 | RHF/Zod4 |
| sonner | 2.0.8 | Toast admin |
| radix-ui | 1.8.1 | Primitive của các component shadcn được dùng |
| cn | 0.4.0 | Utility generator sử dụng, export qua src/lib/utils.ts |
| class-variance-authority | 0.7.1 | Component variants |
| tw-animate-css | 1.4.0 | Animation overlay |
| @playwright/test | 1.64.1 (dev) | Browser regression; không vào runtime/client bundle |

Generator: shadcn 4.22.0 qua dlx. Formatter: Prettier 3.6.2 qua dlx. Không thêm hai CLI này vào runtime dependencies. Không cần next-themes vì chỉ triển khai light theme; Sonner wrapper dùng theme light.

Npm metadata và peer/engine/license đã kiểm tra. cn/Radix/TanStack/RHF/Zod/resolver/Sonner/tw-animate-css dùng MIT; CVA và Playwright dùng Apache-2.0. Node22/React19 đáp ứng engine/peers. Next/React/Prisma giữ nguyên phiên bản. Không giữ exception mới trong pnpm-workspace.yaml.

Quyết định chọn native TanStack9 sau discovery được ghi ở ADR-015. Giữ lockfile. Rollback bằng diff phase1 của package/lockfile cùng source UI; không có schema migration. Kết quả test ở harness/build-log.md.


## 14. Điểm danh — 17/10/2026

`jsqr@1.4.0` (Apache-2.0) là dependency runtime duy nhất được thêm cho điểm danh. Không runtime dependency con, không React/Next peer constraint. Decode QR trong browser bằng canvas; dynamic import sau khi bấm mở camera. Không đưa vào các trang quản trị khác hoặc gọi dịch vụ ngoài. Upstream ít hoạt động là rủi ro bảo trì; khóa version và cô lập trong `src/components/attendance/qr-camera.tsx`, có tìm thủ công để dự phòng. Rollback bỏ component/import/package/lockfile change, giữ dữ liệu điểm danh và chức năng tìm tay.

Bộ thử dùng QR PNG tổng hợp do `pnpm dlx qrcode@1.5.4` (MIT) sinh một lần; không cài qrcode vào app. Kiểm thử chạy bộ jsQR thật trên MediaStream từ canvas; có từ chối quyền, trả quyền trễ, tự dừng track và không gửi payload riêng tư lên server. Đã kiểm tra Next16.3/React19.2/Node22, type/lint/build. Nguồn chính thức: https://github.com/cozmo/jsQR ; https://github.com/soldair/node-qrcode .


## 15. Lịch và bộ chọn — 17/10/2026

Thêm direct dependency `@daypicker/react@10.0.2` (MIT), namespace chính thức hiện tại của React DayPicker; package này hiện trỏ tới `react-day-picker@10.0.2`, dùng nội bộ date-fns4 và @date-fns/tz1 (MIT). Tổng4 package mới trong lockfile. Dự án trước đó chưa có thư viện lịch; không nâng major thư viện/framework hiện có. React>=16.8 hỗ trợ React19 đang dùng, không thêm framework UI/form/state khác. Select/Popover dùng radix-ui1.8.1 đã có.

Mục đích: lịch có locale Việt, grid/keyboard/navigation đã có sẵn để thay popup native không style được. Chỉ import locale vi. Parser ISO/hiển thị giờ dùng helper nhỏ của app; không thêm date-fns làm direct dependency. Thư viện nằm trong client controls của các màn hình dùng lịch; không gọi dịch vụ ngoài. Chunk liên quan lịch khoảng155KB minified/~48KB gzip (đo build, không phải tổng bundle của trang).

Rollback chỉ source/component/dependency và các hunk lockfile thuộc phase02d, giữ công việc các phase trước; không có migration hoặc thao tác dữ liệu. Verification: type/lint/build,20 Playwright và test:date-time, gồm Bangkok/UTC+14, lưu FormData/RHF thực tế, popup trong dialog, label/keyboard/mobile. Nguồn: https://daypicker.dev/ ; https://daypicker.dev/docs/styling ; https://www.radix-ui.com/primitives/docs/components/select ; https://ui.shadcn.com/docs/components/radix/date-picker .
