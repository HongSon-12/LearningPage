# Bộ hồ sơ kế hoạch tối ưu và phát triển tiếp Hệ thống Quản lý đào tạo TTCC 115

**Mốc lập hồ sơ:** 17/10/2026  
**Mốc hiện trạng:** `BAO_CAO_TIEN_DO_DU_AN.md` ngày 17/10/2026  
**Mục tiêu:** đưa mã nguồn hiện có từ trạng thái “đã triển khai phần lớn chức năng” sang trạng thái có thể nghiệm thu, vận hành an toàn, tối ưu giao diện bằng shadcn/ui, chuẩn bị SSO tập trung và có quy trình phát triển tiếp rõ ràng.

> Bộ tài liệu này được thiết kế để con người và Codex cùng sử dụng. Khi đưa vào repository, nên đặt `AGENTS.md`, `PLANS.md`, `START_HERE_CODEX.md` ở thư mục gốc và giữ thư mục hồ sơ trong `docs/`.

## 1. Nguyên tắc

Bộ này **không phải kế hoạch viết lại ứng dụng**. Ưu tiên:
1. Giữ nghiệp vụ đã có.
2. Kiểm thử trước khi refactor.
3. Thay đổi theo phase nhỏ, có rollback.
4. Không tự chốt các mục nghiệp vụ đang `DECIDE`.

Thứ tự ưu tiên nguồn khi có xung đột:
1. Mã nguồn và báo cáo tiến độ 17/10/2026.
2. Mục “Thiết lập đã triển khai” ngày 06/10/2026.
3. Đặc tả chức năng đã cập nhật.
4. Tài liệu UI/UX và kế hoạch cũ.
5. Ý tưởng chưa chốt.

Ký hiệu:
- `DONE`: đã có và từng kiểm tra.
- `VERIFY`: đã có nhưng phải nghiệm thu lại.
- `CHANGE`: cần sửa.
- `DECIDE`: cần chốt nghiệp vụ.
- `LATER`: để sau release đầu.

## 2. Stack mục tiêu

- Next.js 16.x + React 19 hiện tại.
- PostgreSQL + Prisma 7 + `@prisma/adapter-pg`.
- shadcn/ui + Tailwind CSS.
- `@tanstack/react-table`.
- `react-hook-form` + `zod` + `@hookform/resolvers`.
- Sonner cho toast thống nhất.
- Giữ `framer-motion`, `lucide-react`, `recharts`, `exceljs`, `nodemailer`.
- Authentik làm IdP; project đào tạo tích hợp OIDC trực tiếp qua auth facade, ưu tiên `openid-client` + `jose`, giữ server-side AppSession.
- Private storage cho CCCD/bằng cấp/biên lai.
- Search công khai chống enumeration.
- Email chuyển dần sang outbox/worker.

## 3. Chính sách dependency mở có kiểm soát

Danh sách package trong hồ sơ là **baseline**, không phải danh sách đóng.

Codex/lập trình viên được phép đề xuất thêm package nếu giúp:
- giảm mã tự viết;
- tăng accessibility/UX;
- tăng bảo mật;
- cải thiện hiệu năng hoặc observability;
- chuẩn hóa ngày giờ, table, form, upload, auth;
- giải quyết yêu cầu mới rõ ràng.

Trước khi cài phải:
1. nêu vấn đề;
2. kiểm tra package đang có;
3. kiểm tra tương thích Next/React/Node;
4. tránh thư viện trùng chức năng;
5. xem ảnh hưởng client bundle/runtime;
6. kiểm tra license/maintenance;
7. cài bằng pnpm và giữ lockfile;
8. chạy typecheck/lint/build/test;
9. ghi lý do vào build log;
10. cập nhật dependency plan/ADR nếu ảnh hưởng kiến trúc.

Không cài package chỉ vì “có thể sẽ cần”.

## 4. Tài liệu

| File | Mục đích |
|---|---|
| `01_HIEN_TRANG_GAP_ANALYSIS.md` | Hiện trạng và blocker |
| `02_KIEN_TRUC_MUC_TIEU.md` | Kiến trúc đích |
| `03_UI_UX_SHADCN.md` | shadcn/UI plan |
| `04_SSO_DANH_TINH_PHAN_QUYEN.md` | SSO/auth/session/authz |
| `05_BAO_MAT_VA_BAO_VE_DU_LIEU.md` | Bảo mật |
| `06_HIEU_NANG_CSDL_VA_CACHE.md` | Hiệu năng |
| `07_DU_LIEU_EMAIL_UPLOAD_TRA_CUU.md` | Upload/email/search |
| `08_KIEM_THU_NGHIEM_THU.md` | Test/UAT |
| `09_TRIEN_KHAI_VAN_HANH.md` | Deployment/operations |
| `10_ROADMAP_BACKLOG.md` | Roadmap |
| `11_CHECKLIST_RELEASE.md` | Release gates |
| `12_KE_HOACH_DEPENDENCIES.md` | Package policy |
| `13_ADR_QUYET_DINH_KY_THUAT.md` | ADR |
| `14_NGUON_THAM_KHAO.md` | Nguồn |
| `15_BAN_DO_TAI_LIEU_CU_MOI.md` | Đồng bộ tài liệu |
| `16_HUONG_DAN_CODEX_THUC_HIEN.md` | Hướng dẫn Codex |

## 5. Production Definition of Done

Chỉ xem là production-ready khi:
- DB/migration/build/test đạt.
- Các luồng đăng ký, giữ chỗ, chuyển lớp, duyệt/từ chối, thanh toán, Excel, chứng từ được nghiệm thu.
- Desktop/mobile đã UAT.
- Upload nhạy cảm không còn public trực tiếp.
- Search chống dò dữ liệu.
- Mọi route nhạy cảm có server authz.
- SMTP thật được test; lỗi mail không rollback nghiệp vụ.
- Docker/Nginx/HTTPS/backup/restore/log/health check đã thử.
- SSO staging đạt nếu nằm trong release.
- Có rollback + backup trước migration/cutover.


Bổ sung từ yêu cầu 17/10/2026: [17_BUOI_HOC_DIEM_DANH.md](17_BUOI_HOC_DIEM_DANH.md) mô tả buổi học, quét QR/đối chiếu ảnh và điểm danh thủ công. Trạng thái thực hiện: harness/build/phase-02c-users-attendance.md và harness/build-log.md tại root repository.
