# 13. ADR - Nhật ký quyết định kỹ thuật

## ADR-001 - Chọn shadcn/ui
**Trạng thái:** Accepted  
**Quyết định:** dùng shadcn/ui làm design system.  
**Lý do:** tùy biến cao, phù hợp landing + admin, cùng hướng với project khác.  
**Hệ quả:** team sở hữu code component; cần kỷ luật khi nâng component.

## ADR-002 - Không viết lại project
**Trạng thái:** Accepted  
**Quyết định:** refactor incremental trên baseline hiện có.  
**Hệ quả:** mọi thay đổi phải có regression test.

## ADR-003 - Giữ Next.js 16.x trong đợt tối ưu
**Trạng thái:** Accepted  
**Quyết định:** không major-upgrade framework cùng lúc UI/SSO.  
**Hệ quả:** chỉ cập nhật patch/minor có kiểm thử.

## ADR-004 - Project đào tạo không cài mới NextAuth v4
**Trạng thái:** Accepted  
**Quyết định:** Authentik + OIDC trực tiếp qua auth facade/openid-client, giữ server-side session.  
**Lý do:** app không có NextAuth; v4 maintenance; v5 vẫn beta ở thời điểm rà soát.  
**Hệ quả:** team phải triển khai flow OIDC/logout đúng chuẩn và test kỹ.

## ADR-005 - App NextAuth v4 hiện hữu giữ v4 khi chuyển SSO
**Trạng thái:** Accepted  
**Quyết định:** không upgrade auth library trong cutover SSO đầu tiên.  
**Hệ quả:** migration v5 là dự án riêng sau ổn định.

## ADR-006 - Quyền nghiệp vụ nằm ở app
**Trạng thái:** Accepted  
**Quyết định:** SSO group chỉ gate app access ở mức cần thiết; role/scope/class assignment do DB app quyết định.  
**Hệ quả:** không auto-admin từ IdP claim.

## ADR-007 - Private file storage
**Trạng thái:** Accepted  
**Quyết định:** CCCD/bằng cấp/biên lai không nằm trong `/public`.  
**Hệ quả:** cần StoredFile + endpoint download có authz.

## ADR-008 - Search không dùng một định danh đơn
**Trạng thái:** Accepted  
**Quyết định:** cần mã hồ sơ/token + yếu tố thứ hai.  
**Hệ quả:** phải cập nhật UX và email hướng dẫn tra cứu.

## ADR-009 - Email outbox
**Trạng thái:** Accepted  
**Quyết định:** nghiệp vụ commit trước; email gửi async/retry.  
**Hệ quả:** thêm table/worker nhưng tăng độ tin cậy.

## ADR-010 - Không thêm realtime ở first release
**Trạng thái:** Accepted  
**Quyết định:** giữ polling chọn lọc; server transaction là source of truth.  
**Hệ quả:** ít hạ tầng hơn.

## ADR-011 - OWASP ASVS Level 2 làm baseline tham chiếu
**Trạng thái:** Accepted  
**Quyết định:** checklist security lấy ASVS L2/cheat sheets làm nền thực dụng.  
**Hệ quả:** upload/session/authz/logging phải có tiêu chí test.

## ADR-012 - Business decisions chưa chốt không hard-code mới
**Trạng thái:** Accepted  
**Quyết định:** giữ hành vi đã triển khai hoặc feature flag; không mở rộng khác học phí/auto-expire cho tới khi nghiệp vụ chốt.


## ADR-013 - Dependency baseline mở có kiểm soát
**Trạng thái:** Accepted  
**Quyết định:** danh sách package là baseline, không phải danh sách đóng. Codex/lập trình viên được phép đề xuất thêm package khi có lợi ích rõ về UX, accessibility, bảo mật, hiệu năng, quan sát hoặc giảm mã tự viết.  
**Điều kiện:** kiểm tra tương thích, tránh trùng chức năng, đánh giá bundle/runtime/license, giữ lockfile và chạy test.  
**Hệ quả:** linh hoạt nhưng tránh “dependency soup”.

## ADR-014 - UI stack chuẩn
**Trạng thái:** Accepted  
**Quyết định:** shadcn/ui + Tailwind CSS + TanStack Table + React Hook Form + Zod là stack UI/form/table mặc định.  
**Hệ quả:** không bổ sung UI framework hoặc form/schema framework thứ hai nếu chưa có ADR nêu lý do.

## ADR-015 — Native TanStack Table 9 cho UI mới
**Trạng thái:** Accepted 17/10/2026.
**Quyết định:** dùng @tanstack/react-table 9.3.1 với useTable/tableFeatures, không dùng v8 useReactTable hoặc legacy adapter.
**Bằng chứng:** thử v8 theo mẫu shadcn phát hiện react-hooks/incompatible-library do mutable table instance. Tài liệu React mô tả rủi ro stale memoization; tài liệu TanStack9 có adapter tương thích React Compiler. Chưa có table package ở baseline nên không có dữ liệu/API table cũ phải migrate.
**Trade-off:** column types thêm feature generics; UI mới phải theo API9. Chỉ đăng ký sorting/pagination/column visibility và row models cần thiết. Không thêm app-wide state manager.
**Verification:** lint sạch không exemption; TypeScript/build/management/HTTP/5 nhóm Playwright đạt; sorting/pagination/columns/focus được test qua browser.
**Rollback:** revert UI/dependency của phase1; không thay domain/schema/framework.
**Sources:** https://react.dev/reference/eslint-plugin-react-hooks/lints/incompatible-library và https://tanstack.com/table/latest/docs/framework/react/guide/migrating.


## ADR-016 — Public lookup by one-use email link
**Trạng thái:** Superseded by ADR-019 — người dùng đổi luồng sang CCCD/OTP và hồ sơ học viên cùng ngày 17/10/2026.
**Quyết định:** mã hồ sơ (Registration UUID) + email trùng hồ sơ để yêu cầu liên kết ngẫu nhiên 256 bit, 15 phút, một lần. Email vẫn tùy chọn; không có email thì liên hệ trung tâm. Link dùng fragment và nút POST riêng; GET/prefetch không consume.
**Hệ quả:** bỏ tra cứu bằng điện thoại/CCCD đơn lẻ; kết quả chỉ initials/class/status/document codes; không PII, file hoặc lịch sử. Đưa worker/outbox SEARCH_LINK tối thiểu từ phase 3 lên sớm để phục vụ lựa chọn này. SMTP thật và lịch chạy chưa nghiệm thu.

## ADR-017 — Private runtime storage and artifact isolation
**Trạng thái:** Accepted — triển khai local 17/10/2026.
**Quyết định:** StoredFile + FK, claim theo uploader/capability trong transaction; download theo lớp hiện tại và role, accountant receipt-only. File là runtime volume, không là asset build.
**Hệ quả:** không preview active content; download attachment/nosniff/sandbox/no-store. Trace exclusions + build gate và Docker ignore chặn private files/backups/.env trong artifact. Giữ backup/quarantine/rollback manifest; không mở lại `/uploads` khi rollback. Lịch sử Git/image cũ cần xử lý ở release review.

## ADR-018 — Pause globally loaded third-party analytics during security cutover
**Trạng thái:** Accepted — kỹ thuật bảo vệ token/PII.
**Quyết định:** dừng GA/Meta/Clarity vốn được root layout nạp trên tất cả trang; giữ nguyên config.
**Hệ quả:** cần route/consent isolation ở phase 5 trước khi bật lại; không dùng conditional unmount script để giả định SDK đã ngừng ghi nhận trang nhạy cảm.


## ADR-019 — Hồ sơ học viên dùng chung và tra cứu CCCD qua mã email
**Trạng thái:** Accepted — người dùng đề xuất 17/10/2026, supersedes ADR-016.

**Quyết định:** Student giữ định danh và email tra cứu; nhiều Registration giữ lịch sử từng lần đăng ký. CCCD hợp lệ duy nhất ở Student. Public nhập CCCD, nhận mã 6 chữ số qua email của hồ sơ, xác thực rồi xem lịch sử. Mã 10 phút, một lần, tối đa 5 lần sai; lưu HMAC với secret runtime, không lưu/gửi token trong URL. Email đăng ký vẫn tùy chọn.

**Hệ quả:** đăng ký lớp mới không tự thay email hồ sơ. Dữ liệu cũ chỉ chọn email nếu nhất quán; CCCD/email/nhân thân mâu thuẫn cần quản trị đối chiếu. Registration chưa khớp hồ sơ không xuất hiện trong public history hoặc tổng số. Admin xác nhận định danh/email/các lần đăng ký, có audit và thu hồi mã cũ; quản lý lớp chỉ xem lịch sử lớp được giao. Không tự động gộp ID không hợp lệ hay triển khai thao tác gộp/tách khó đảo ngược. Snapshot, sĩ số, chứng từ và file giữ nguyên. SMTP thật và rollout là gate riêng.


## ADR-020 — Buổi học và điểm danh có người đối chiếu
**Trạng thái:** Accepted — yêu cầu người dùng 17/10/2026, triển khai local.

**Quyết định:** Class có nhiều ClassSession, mỗi buổi có Attendance riêng gắn Registration. QR chỉ lấy số CCCD để tìm người trong danh sách học của lớp; ảnh mặt trước lấy từ tài liệu đã đăng ký, người quản lý đối chiếu rồi chủ động xác nhận hoặc đóng. Tìm thủ công dùng cùng bước xác nhận. Không dùng QR làm bằng chứng danh tính hoặc tự động ghi nhận. QR đọc trên thiết bị qua jsQR; chỉ gửi 12 chữ số, không gửi khung hình hay thông tin khác trong mã.

**Quyền:** chỉ ADMIN và CLASS_MANAGER đang được giao lớp. ACCOUNTANT không xem điểm danh hoặc ảnh căn cước. Giữ ba vai trò hiện tại theo chốt của người dùng; yêu cầu tương lai là tùy chỉnh quyền cho hai vai trò ngoài ADMIN, chưa triển khai permission editor trong phase này.

**Dữ liệu:** thêm ClassSession/Attendance với FK hạn chế xóa, unique buổi/học viên. Dùng transaction chung với thay đổi sĩ số/chuyển lớp; kiểm tra lại quyền đang có, lớp hiện tại, trạng thái buổi, học viên không bị từ chối/hủy. Pending hồ sơ/học phí vẫn trong danh sách học hiện tại, hiển thị rõ trạng thái. Xác nhận lặp lại không tạo trùng. Hủy giữ dòng lịch sử + audit; chuyển lớp giữ lịch sử tại buổi gốc. Chốt buổi chặn sửa điểm danh, mở lại có audit. Chưa ghi nhận không tự tính là vắng.

**Ảnh:** endpoint riêng `/api/attendance/[sessionId]/identity/[registrationId]`, chỉ raster PNG/JPEG/WebP đã gắn đúng hồ sơ trong lớp; kiểm tra signature/hash, no-store/nosniff/sandbox và xác thực mỗi request. PDF chỉ tải xuống qua endpoint cũ, không inline active content. Next Image dùng unoptimized để không đi qua cache/optimizer. Mở camera chỉ được phép trên trang điểm danh; cần HTTPS trên điện thoại. Mọi camera track được dừng khi đọc được mã/đóng/ẩn tab/unmount, kể cả quyền trả về trễ.

**Giới hạn:** parser hỗ trợ số 12 chữ số hoặc CCCD ở trường đầu payload phân cách `|`; định dạng khác tìm thủ công. Chưa có xác minh với cơ sở dữ liệu dân cư, NFC hay xác thực chống giấy tờ giả. Bộ đọc đã thử bằng camera giả lập và QR tổng hợp; Android/iOS/CCCD vật lý cần nghiệm thu riêng. Chưa triển khai container.
