# Phase 00 — Material context

Ngày: 17/10/2026 (Asia/Bangkok).

- Root dự án là Learning, không còn thư mục bọc ttcc-app/app. `src/app` là App Router và cần giữ.
- Base commit lúc discovery: a6ff1a2672ee606aa5a0f6ff87f64b7f1aee46e7. Không tự tạo commit/tag.
- Hai bộ hồ sơ v2 có nội dung giống nhau. Nguồn chính: `docs/plan_v2/Ho_so_ke_hoach_nang_cap_quan_ly_dao_tao_2026_v2/`.
- Kit chưa được triển khai vào root: AGENTS.md hiện có chỉ chứa hướng dẫn Next.js; chưa có PLANS.md/START_HERE_CODEX.md ở root. Không ghi đè hướng dẫn hiện hữu.
- PostgreSQL development hiện hoạt động; hai migration đã đồng bộ. Blocker DB trong báo cáo cũ không còn tái hiện ở lần này.
- Build đạt khi DB hoạt động; chưa chứng minh build không cần DB. RootLayout vẫn gọi setting.findFirst trước render.
- Tailwind 4.3.3/PostCSS đã có, alias @/* -> ./src/*. Chưa có components.json, src/components/ui, TanStack Table, RHF, Zod/resolver, Sonner hoặc OIDC packages trong dependencies trực tiếp.
- UI hiện có component riêng AdminUI/AdminDialog; cần giữ ý đồ UX khi thay component. AdminLayout sidebar cố định 256px, chưa có mobile drawer.
- Session hiện tại lưu hash token ngẫu nhiên trong DB, cookie HttpOnly/SameSite=Lax/Secure production, hết hạn 8h; active được kiểm tra mỗi lần đọc user. User chỉ có một role; scope quản lý lớp qua managerId. Chưa có SsoIdentity/AppSession mở rộng.
- Upload đã kiểm tra size/MIME/signature nhưng lưu public/uploads. Chưa có StoredFile, file access endpoint hoặc quyền tải theo hồ sơ.
- Search là Server Action `src/app/actions/search.ts`, không phải API route; nhận phone/CCCD/invoice/certificate/confirmation đơn lẻ và trả cả fullName/phone/cccd. Cần thay boundary này khi harden.
- Email hiện gọi bất đồng bộ không có outbox/retry bền vững. Không tự thay trigger nghiệp vụ DECIDE.
- Lint mặc định quét nhầm .next-build. Source lint có 14 lỗi any, 11 warnings; chi tiết tại build log. Không tắt rule để đạt xanh.
- HTTP smoke localhost:3101 đạt trên production build. Dùng 127.0.0.1:3101 ban đầu bị origin guard trả 403; không nới CSRF guard chỉ để test qua.
- Docker multi-stage có standalone nhưng chưa non-root/healthcheck/private volume; chưa có .dockerignore ở root. Nginx hiện proxy HTTP cơ bản. Chưa test deployment/HTTPS/restore.
- Bước triển khai kế tiếp: xử lý lint baseline rồi Phase 1 theo roadmap; security blockers phải được giải quyết trước phát hành công khai.

## Cập nhật sau baseline cleanup — 17/10/2026

- Lint blocker ở discovery đã đóng: .next-build được ignore, 14 any và 11 warnings đã xử lý. Không tắt rule lint.
- Lint, TypeScript, production build, management regression và production HTTP smoke đều đạt sau diff cleanup.
- Không đổi dependencies, schema hoặc nghiệp vụ. Ảnh VietQR dùng next/image unoptimized với URL/CSS cũ; one-off SSR check đã xác nhận.
- Bước tiếp theo hiện là Phase 1 shadcn foundation. Các rủi ro security/SSO/deployment và DECIDE ghi ở trên vẫn còn hiệu lực.
