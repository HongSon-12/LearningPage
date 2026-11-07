# Tài liệu dự án quản lý đào tạo TTCC 115

## Thông tin hiện tại

- [Khởi tạo máy chủ thật](HUONG_DAN_KHOI_TAO_MAY_CHU.md): database edu/user edu_user, file bí mật ngoài Git, quyền DB, backup/migration, SSO, Nginx và kiểm tra phát hành.

- [Báo cáo tiến độ](BAO_CAO_TIEN_DO_DU_AN.md): cập nhật 07/11/2026, SSO, hiệu năng/bảo mật, các kiểm tra local và những bước còn chờ nghiệm thu máy chủ.
- [Hướng dẫn chạy và triển khai](../README.md): chọn local/production, `.env`, database riêng, mạng Docker, Nginx, SSO, migration và đồng bộ tài khoản.
- [Nhật ký triển khai/kiểm thử](../harness/build-log.md): bằng chứng và phạm vi từng đợt thay đổi.
- [Checklist phát hành](plan_v2/Ho_so_ke_hoach_nang_cap_quan_ly_dao_tao_2026_v2/11_CHECKLIST_RELEASE.md): nghiệm thu môi trường đích trước khi mở production.

## Phân chia môi trường

- Local: `docker-compose.local.yml`; `docker-compose.yml` mặc định include local, giữ project/volume `ttcc-app`. `pnpm dev` dùng localhost:3001, tài khoản local phục vụ phát triển.
- Production: `docker-compose.production.yml`, `.env.production`, SSO 115 và domain `edu.115.org.vn`.
- DB máy chủ: `cap-cuu-115-db:5432`, database `edu`, user `edu_user`.
- DB_NETWORK và PROXY_NETWORK: `cap-cuu-115_private`; Nginx kết nối `edu-app:3000` qua mạng có sẵn.

## Tài liệu thiết kế và lịch sử

- [Kế hoạch giai đoạn 1](plan_v1/): kiến trúc, nghiệp vụ, tính năng, giao diện và các phương án xác thực ban đầu.
- [Kế hoạch nâng cấp giai đoạn 2](plan_v2/Ho_so_ke_hoach_nang_cap_quan_ly_dao_tao_2026_v2/00_README.md): định hướng nâng cấp và vận hành. Phân biệt thiết kế mục tiêu với tính năng đã nghiệm thu trong báo cáo tiến độ.
- [Báo cáo audit](audits/): các lượt rà soát bảo mật/hiệu năng trước đây.

Khi cập nhật tiến độ, ghi rõ ngày, môi trường, phần đã triển khai, kiểm thử thực sự đã chạy và việc còn lại; kết quả local không tự thay thế nghiệm thu production. Không lưu bí mật, dữ liệu hồ sơ thật hoặc bản sao lưu vào tài liệu/Git.
