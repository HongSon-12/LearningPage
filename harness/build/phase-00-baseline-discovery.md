# Phase 00 — Baseline discovery

## Goal
Đọc plan_v2 và xác lập baseline thực tế trước khi refactor ứng dụng TTCC 115.

## Current state
Mã nguồn đã nằm trực tiếp tại Learning. Base commit: `a6ff1a2672ee606aa5a0f6ff87f64b7f1aee46e7`.
Kế hoạch chính: `docs/plan_v2/Ho_so_ke_hoach_nang_cap_quan_ly_dao_tao_2026_v2/`.
Bản hồ sơ trong Codex kit có 17 file giống hệt; dùng bản chính làm nguồn tham chiếu.

## In scope
Inventory package/config/routes/auth/schema/upload/search/email; chạy các kiểm tra hiện có; ghi bằng chứng và phân loại blocker.

## Out of scope
Refactor UI/auth/schema; migration feature mới; thay đổi business rule; triển khai production.

## Dependencies
PostgreSQL development trên localhost:5432, Node 22.22.2, pnpm 11.21.0 và các package đã cài.

## Data/schema impact
Không chạy migrate deploy/dev/reset. Integration test tạo và dọn schema ngẫu nhiên ttcc_test_*. HTTP test tạo user test tạm rồi dọn, đăng nhập bằng tài khoản development hiện có và xóa session của lần chạy thành công.

## Security impact
Không đọc/ghi secret vào báo cáo. Ghi nhận public uploads, search theo một trường, thiếu audit tổng quát và hạ tầng production chưa nghiệm thu.

## Performance impact
Chỉ kiểm tra build, chưa benchmark latency, bundle hoặc DB query plan.

## Implementation steps
- [x] Đọc 17 tài liệu chính, kit và phase templates.
- [x] Inventory repo và phiên bản thực tế.
- [x] Kiểm tra migration và generate client.
- [x] Chạy TypeScript, lint và production build.
- [x] Chạy management regression và HTTP smoke.
- [x] Phân biệt lỗi source với generated artifacts; ghi build log/context.

## Verification
Kết quả chi tiết trong `../build-log.md`, entry 17/10/2026. Production smoke dùng localhost:3101 và output .next-build.

## Acceptance criteria
Baseline được xác định; lỗi lint được phân loại; không ghi PASS cho UAT/security/deployment chưa chạy. Phase 00 discovery hoàn tất; baseline chưa xanh toàn bộ vì lint.

## Rollback
Không sửa source, dependency hay schema nghiệp vụ. Có thể bỏ các tài liệu harness mới nếu muốn. Generated build/client có thể tạo lại; server smoke riêng đã được dừng.

## Open decisions
Giữ các mục DECIDE của roadmap: courseType/courseBatch, thời hạn giữ chỗ, chênh học phí, email reject/manual/late, GCN logistics, multi-role, UX tra cứu, SSO revoke SLA và break-glass. Chưa chốt thay người dùng.
