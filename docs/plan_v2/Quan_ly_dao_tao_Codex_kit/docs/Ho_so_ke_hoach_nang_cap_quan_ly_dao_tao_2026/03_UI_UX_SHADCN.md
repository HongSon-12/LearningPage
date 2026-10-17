# 03. Kế hoạch UI/UX với shadcn/ui

## 1. Mục tiêu

Chuẩn hóa giao diện nhưng vẫn giữ concept riêng của từng chương trình đào tạo.

## 2. Stack giao diện chuẩn

| Thành phần | Package/cách bổ sung | Vai trò |
|---|---|---|
| CSS/theme | `tailwindcss`, `@tailwindcss/postcss`, `postcss` nếu chưa có | Layout, responsive, token, theme |
| Component | shadcn CLI | Button, Input, Field, Card, Dialog, Sidebar, Tabs, Table... |
| Data table | `@tanstack/react-table` | Sort/filter/page/select/column visibility |
| Form | `react-hook-form` | Form tương tác phức tạp |
| Validation | `zod` | Schema dữ liệu |
| RHF + Zod | `@hookform/resolvers` | Kết nối validation |
| Toast | Sonner qua shadcn | Thông báo UI thống nhất |

Các dependency nội bộ của shadcn như `clsx`, `tailwind-merge`, `class-variance-authority`, `cmdk`, `react-day-picker`, `vaul`... chỉ để CLI thêm khi component thực tế cần.

## 3. Discovery trước khi init

Trước khi chạy shadcn:
- đọc `package.json`, lockfile;
- kiểm tra Tailwind/PostCSS;
- kiểm tra `components.json`;
- kiểm tra alias `@/*`;
- kiểm tra `src/components/ui`;
- không init đè cấu hình đang hoạt động;
- không trộn Base UI/Radix/React Aria ngẫu nhiên.

Lệnh tham khảo:

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input field card badge table dialog alert-dialog tabs sidebar dropdown-menu select checkbox radio-group tooltip sheet drawer skeleton separator breadcrumb sonner
pnpm add @tanstack/react-table react-hook-form zod @hookform/resolvers
```

Không chạy máy móc nếu package/component đã có.

## 4. Package bổ sung trong quá trình làm

Codex **được phép đề xuất thêm** để thuận tiện/tối ưu hơn theo `12_KE_HOACH_DEPENDENCIES.md`.

Có thể cân nhắc khi thật sự cần:
- `date-fns`: xử lý ngày giờ phức tạp/lặp nhiều;
- `react-day-picker`: date picker;
- `cmdk`: command palette;
- `nuqs` hoặc tương đương: URL filter state phức tạp;
- package kiểm tra magic bytes upload;
- logging/observability package khi có hệ thống vận hành nhận log/trace.

Không mặc định thêm Redux, React Query, Axios, Redis hoặc UI framework thứ hai.

## 5. Design system

Shared tokens:
```text
--brand-primary
--brand-secondary
--brand-accent
--success
--warning
--danger
--surface
--muted
--border
```

`components/ui/*`: shadcn base, không chứa Prisma/business rule.

`components/admin/*`:
- `AdminShell`
- `StatCard`
- `FilterBar`
- `StatusBadge`
- `DataTable`
- `EmptyState`
- `EntityActions`

`components/public/*`:
- `ProgramHero`
- `ClassCard`
- `RelatedCourses`
- `ProgramSection`
- `FaqSection`
- `RegistrationCta`

## 6. Admin routes

### `/`
- 4-6 stat cards.
- Việc cần xử lý quan trọng hơn chart.
- Chart không được làm chậm first paint.

### `/courses`
- filter chương trình/trạng thái/thời gian;
- sĩ số;
- CRUD theo quyền;
- nút Quản lý học viên.

### `/courses/[classId]`
Màn hình trọng tâm:
- header lớp + status + sĩ số;
- quick actions;
- khu Học viên / Hồ sơ / Chứng từ / Lịch sử;
- DataTable + column visibility;
- dialog/drawer cho thao tác ngắn;
- vùng rộng cho hồ sơ dài.

### `/registrations`
- review hồ sơ;
- mặc định PENDING;
- duyệt/từ chối;
- lý do bắt buộc;
- thanh toán theo quyền;
- link sang lớp.

### `/users`
- quyền rõ;
- server vẫn kiểm tra;
- action nhạy cảm có confirm.

## 7. Landing page

Shared blocks, khác theme/content:
1. Hero.
2. Lợi ích/đối tượng.
3. Nội dung đào tạo.
4. Hình thực hành.
5. Lớp mở.
6. Học phí/đăng ký.
7. FAQ.
8. Related.
9. CTA.

`framer-motion` chỉ dùng animation nhẹ có ích. Không animate bảng/số liệu nặng trên mobile.

## 8. Form

Client:
- RHF quản lý state;
- Zod validation;
- browser validation cơ bản;
- giữ dữ liệu nếu lớp vừa đầy.

Server:
- validate lại;
- derive price/role/scope từ server;
- transaction cho sĩ số;
- không tin request client.

## 9. DataTable

TanStack chỉ quản lý UI state.

Dữ liệu lớn:
- filter/sort/page bằng query params;
- server query;
- không tải toàn bộ học viên xuống client.

Ví dụ:
```text
/courses?status=OPEN&courseType=...
/courses/abc?payment=PAID&query=nguyen
```

## 10. Mobile/a11y

Test:
- 360x800;
- 390x844;
- 768px;
- 1366/1440 desktop.

Yêu cầu:
- column priority/card view;
- sticky action hợp lý;
- vùng chạm khoảng 44px;
- label thật;
- focus visible;
- keyboard;
- dialog có title/description;
- aria-live cho lỗi/thông báo;
- không dùng màu làm tín hiệu duy nhất.

## 11. Definition of Done UI

- đúng quyền;
- loading/empty/error;
- desktop/mobile;
- keyboard;
- không layout shift lớn;
- không gửi dữ liệu thừa;
- screenshot/UAT;
- test nghiệp vụ không regress;
- package mới được ghi nhận.
