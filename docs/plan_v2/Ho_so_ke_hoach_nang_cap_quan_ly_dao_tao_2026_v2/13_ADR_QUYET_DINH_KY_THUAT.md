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
