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
