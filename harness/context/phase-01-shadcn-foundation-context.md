# Phase 01 — Material context

Date: 17/10/2026 (Asia/Bangkok).

- Nguồn kế hoạch sống là docs/plan_v2/Ho_so_ke_hoach_nang_cap_quan_ly_dao_tao_2026_v2. Bản trong Codex kit giữ làm snapshot ban đầu; không tạo thêm bản đồng bộ giả.
- Phase00 cleanup chưa commit riêng; giữ nguyên các diff đó. Base HEAD lúc triển khai: a6ff1a2672ee606aa5a0f6ff87f64b7f1aee46e7.
- Manual shadcn config bảo toàn CSS/alias cũ; CLI new-york tạo Radix components. Không trộn Base UI; không thêm NextThemes cho light-only theme.
- Native TanStack9 được chọn sau khi v8 cảnh báo incompatible memoization. ADR-015; không tắt rule hoặc dùng legacy adapter. Shared feature types tại components/data-table/table-features.ts.
- RHF/Zod áp dụng login và form lớp. Class server actions/auth/domain/schema giữ nguyên; client schema không thay server validation.
- Admin layout vẫn await pageUser trên server; Shell client nhận actor tối thiểu và server-rendered children.
- Public medical red --color-accent giữ nguyên; admin/auth/overlay scope alias sang màu hover nhẹ. Root lang=vi và Geist font token được nối đúng.
- Dialog cần logical trigger IDs: cell có thể remount khi rows refresh, không chỉ lưu HTMLElement cũ. Đã test focus trở về nút mở và fallback main khi row bị xóa.
- Không dùng global admin loading.tsx vì làm streamed denial trả200. Table loading nằm sau server auth/scope check; denied class vẫn404 và wrong-role redirect vẫn307.
- Bảng có paging10/sort/column visibility ở client, trên cùng dataset/scope baseline. Server pagination/minimal DTO là Phase5; không xem đây là tối ưu dữ liệu lớn.
- Mobile: menu Sheet, min44px controls, columns/actions có ưu tiên, region cuộn được bằng phím. Đã test 360/390/768/1366/1440 và review screenshots; chưa full screen-reader/UAT/performance.
- Playwright dev-only, port3101 riêng, synthetic users/classes/students với cleanup theo ID; không dùng dữ liệu cá nhân thật. HTTP regression dùng server tạm3102 và tự dừng.
- Next: Phase2 private uploads/file authz/search/rate-limit; cần discovery subsystem và giữ DECIDE chưa chốt. RootLayout DB dependency, public upload/search PII, outbox và SSO chưa được giải quyết bởi UI phase.
