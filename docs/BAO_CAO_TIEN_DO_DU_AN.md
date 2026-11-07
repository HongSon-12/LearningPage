# Báo cáo tiến độ quản lý đào tạo TTCC 115

**Cập nhật:** 07/11/2026, Asia/Bangkok.
**Phạm vi:** workspace `Learning` ở repository root; package 0.1.3.
**Trạng thái:** mã nguồn và kiểm thử local đã hoàn tất các phần bên dưới; chưa phát hành/nghiệm thu máy chủ thật. Tài khoản SSO thật chưa được kéo về vì người triển khai sẽ tự điền bí mật.

## 1. Phần đã hoàn thành

| Hạng mục | Hiện trạng |
| --- | --- |
| Nghiệp vụ | Quản lý lớp, hồ sơ/học viên, đăng ký online/thủ công/vét, giữ chỗ, chuyển lớp, duyệt/từ chối, học phí, GCN/GXN/hóa đơn, Excel và lịch sử thay đổi |
| Hiệu năng lớp | Phân trang phía máy chủ, rút gọn dữ liệu truy vấn, dùng lại dữ liệu danh sách ban đầu, khóa theo lớp/danh tính và bảo vệ retry/chỗ cuối; thống nhất tab bằng query trên `/courses/[classId]` |
| Phản hồi giao diện | Khung chờ khi điều hướng, spinner/khóa thao tác khi lưu, chống bấm lặp, thông báo lỗi phù hợp production; mã OTP 6 ô có dán mã/số 0 đầu/đếm ký tự |
| Tài liệu riêng tư | Upload giới hạn loại/dung lượng, chuẩn hóa ảnh, kiểm tra nội dung file và quyền tải; tài liệu ngoài public, chặn đường dẫn uploads cũ |
| Xác thực production | OIDC với Authentik tại SSO 115; PKCE/state/nonce/JWKS; thông tin tài khoản và mật khẩu quản lý tại SSO |
| Quyền edu | `nlhson` được khởi tạo ADMIN khi đồng bộ; người mới khác chờ cấp quyền. Active = SSO active AND được admin edu cấp quyền. Vai trò/lớp vẫn do edu quản lý |
| Thu hồi phiên | Logout qua end-session; xác minh back-channel; chống phát lại/callback muộn; đối soát introspection và trạng thái tài khoản; tab kiểm tra định kỳ/khi focus và chặn thao tác khi chưa xác minh |
| Đồng bộ tài khoản | CLI dry-run/apply có phân trang và chống trùng. Webhook Bearer nhận eventId, đọc sự kiện/tài khoản đích từ SSO rồi cập nhật; không coi actor sự kiện là tài khoản đích |
| Email | Cấu hình production `pro66.emailserver.vn:465`, TLS, user `edu@115.org.vn`; worker OTP chạy bền vững, lease/retry/heartbeat và dọn dữ liệu SSO hết hạn. OTP học viên giữ nguyên; mật khẩu nhân sự chuyển về SSO |
| Bảo mật dependency | Next.js 16.4.1, Nodemailer 10.1.4 và bản vá dependency liên quan; audit production ngày 07/11 báo 0 lỗ hổng |
| Triển khai | Image web/ops Alpine chạy non-root, private uploads volume, health checks; file môi trường mẫu và `.env.production` có placeholder, Git/Docker loại bí mật khỏi artifact |

## 2. Tách local và máy chủ thật

| | Local hiện tại | Production đã chuẩn bị |
| --- | --- | --- |
| Compose | `docker-compose.local.yml`; `docker-compose.yml` mặc định include local | `docker-compose.production.yml`, chạy độc lập |
| Project/volume | Giữ `ttcc-app`, `ttcc-app_pgdata`, `ttcc-app_uploads` | `learning-production`, volume uploads riêng; DB/Nginx đã có |
| Database | `postgres:16-alpine`, localhost:5432 hoặc service postgres trong local stack | `PG_HOST=cap-cuu-115-db`, `PG_PORT=5432`, database `edu`, user `edu_user` |
| Mạng | Mạng local của project, không tham gia mạng server | `DB_NETWORK=cap-cuu-115_private`, `PROXY_NETWORK=cap-cuu-115_private`, external |
| HTTP/proxy | `pnpm dev`: localhost:3001; local container Nginx: localhost:80 | Nginx hiện có trên PROXY_NETWORK → `edu-app:3000`, không publish app port |
| Xác thực | `AUTH_MODE=local` phục vụ phát triển/fixture | `AUTH_MODE=sso`, domain `https://edu.115.org.vn` |
| Env | `.env`, mẫu `deploy/local.env.example` | `.env.production`, mẫu `deploy/production.env.example`; tự điền bí mật |

Local có service one-shot `uploads-init` chỉ chỉnh quyền named volume uploads về UID/GID 1000 trước khi app chạy; giữ nội dung và các volume cũ. Hai mạng production hiện cùng một mạng thật; cấu hình còn hỗ trợ tách hai mạng sau này. Worker/ops chỉ gắn logical database network. Không khởi động production trên máy local hay tạo/chạm vào mạng `cap-cuu-115_private` trong đợt kiểm tra này.

## 3. Các đường dẫn hiện hành

- `/`: tổng quan theo quyền; `/courses`: danh sách lớp.
- `/courses/[classId]?tab=students|sessions|documents|info`: không gian làm việc lớp. Link `/sessions` cũ chuyển về tab tương ứng; màn điểm danh chi tiết vẫn dùng route riêng.
- `/students`, `/registrations`: hồ sơ và quản lý đăng ký theo quyền.
- `/users`, `/permissions`, `/courses/assignments`: quyền/tài khoản/phân công; `/account`: thông tin tài khoản SSO chỉ đọc trong production.
- `/help`: hướng dẫn và phiên bản; version ở topbar/menu tài khoản dẫn tới nội dung này.
- `/hocsocapcuu`, `/dao-tao/[slug]`, `/lop/[classId]`, `/hocsocapcuu/courses`, `/register/[classId]`, `/search`: các luồng công khai/học viên.
- `/login` production chuyển qua SSO; callback `/api/auth/callback/authentik`; webhook `/api/auth/webhook/authentik`; back-channel `/api/auth/backchannel-logout`; trang sau logout `/da-dang-xuat`.

## 4. Bằng chứng đã đạt ở local

| Kiểm tra | Kết quả / giới hạn |
| --- | --- |
| Build + TypeScript + lint | Đạt; web/ops image Alpine và standalone smoke đạt |
| Giao diện | 44/44 regression UI và 5/5 HTTPS SSO UI bằng provider giả lập đạt |
| SSO integration | PKCE/state/nonce/chữ ký, ID bất biến, mã hóa token, grant/active, lease/fail-closed, webhook/thu hồi, duplicate và race logout/callback đạt |
| Nghiệp vụ/security | 8 bộ integration trước SSO đạt; các bộ security/account/concurrency chạy lại sau bản vá đạt |
| Chỗ cuối | 64 yêu cầu cùng tranh một chỗ: đúng 1 được nhận; retry, CCCD trùng, chuyển/khôi phục/chỉnh sĩ số vẫn giữ ràng buộc |
| Database | PostgreSQL local 16.13 Alpine; backup/restore trước nâng cấp 8 → 9 migration đạt; fingerprint User/Registration cũ giữ nguyên |
| Docker | UID 1000, ghi private uploads, cookie/header/route guards, worker heartbeat/SIGTERM, không có .env/runtime secrets trong image đạt |
| Compose mới | Kiểm tra render local/default/production; kết nối thử DNS/HTTP alias edu-app với các mạng Docker tạm, gồm DB/proxy trùng và khác nhau; Nginx syntax kiểm tra trên mạng tạm |

Lần tách Compose này chỉ thay cấu hình và tài liệu cùng kiểm tra khớp host/port; không chạy lại toàn bộ ứng dụng hay coi các kiểm thử trước là nghiệm thu máy chủ thật. Kết quả chi tiết đợt cấu hình nằm trong `harness/build-log.md`.

## 5. Việc cần làm trước mở production

1. Điền bí mật thật trong `.env.production`: hai URL/role database, Client Secret, API Token đọc users/events, Bearer webhook, khóa mã hóa SSO/OTP và SMTP_PASS. Không gửi qua chat hoặc commit.
2. Xác nhận DB riêng/role quyền hạn, DNS `cap-cuu-115-db` và cả DB/Nginx đang thuộc mạng server đã chốt. Dùng đúng file production và sao lưu DB/uploads trước migration.
3. Chạy migrate deploy bằng role owner, cấp quyền bảng cho runtime, preflight và đồng bộ SSO dry-run rồi apply. Đăng nhập nlhson và cấp quyền cho người dùng khác.
4. Đặt provider edu Invalidation Flow là `default-invalidation-flow` có User Logout stage; các app khác tham gia SLO. Nghiệm thu thật logout từ edu/SSO/app khác, tab cũ, khóa/mở khóa tài khoản và webhook retry.
5. Ghép mẫu Nginx, kiểm tra chứng thư/domain/HTTPS/cookie/header, upstream `edu-app:3000`, webhook/back-channel và private upload/download theo quyền. Reload Nginx khi app mới healthy.
6. Gửi OTP học viên tới hộp thư thật, kiểm tra worker/outbox; kiểm tra camera mobile HTTPS trên thiết bị thật.
7. Cấu hình backup định kỳ cả DB/uploads, restore thử trên server/staging, retention, dung lượng, cảnh báo 5xx/DB/outbox/SSO/chứng thư. Chốt release tag, commit và rollback image/schema tương thích.

Cài đặt/cấu hình local đã được kiểm thử không thay thế các bước trên; chưa có nghiệm thu SMTP, chứng thư, network/DB hay tài khoản thật trên máy chủ.

## 6. Các điểm nghiệp vụ vẫn cần chốt

- “Cùng khóa” trong chuyển lớp hiện theo chương trình và học phí; cần chốt thêm điều kiện courseBatch nếu muốn. Không chuyển hồ sơ bị từ chối/hủy, đã có chứng từ hoặc lớp nguồn kết thúc theo quy tắc hiện có.
- Chưa tự động hết hạn giữ chỗ khi chưa thanh toán; không được coi là đã có cơ chế giải phóng chỗ theo thời gian.
- Landing theo chương trình còn dùng mẫu chung; nội dung/concept cuối cần đơn vị sử dụng duyệt.
- Các bộ lọc/trạng thái gửi GCN bổ sung và quy trình bưu gửi (mã/ngày/người nhận) chưa được coi là hoàn thiện theo mọi đề xuất.
- Email lý do từ chối, xác nhận thủ công/vét và nhắc lịch tự động vẫn cần chốt phạm vi, điểm gọi/lịch chạy và nghiệm thu; worker OTP không chứng minh các luồng này đã xong.
- Antivirus/CDR tài liệu chuyên dụng và các yêu cầu retention cần phương án vận hành riêng.

## 7. Tài liệu đối chiếu

- [Khởi tạo máy chủ thật với edu/edu_user](HUONG_DAN_KHOI_TAO_MAY_CHU.md): file env ngoài repo, quyền DB, backup/migration và đồng bộ SSO.
- [Hướng dẫn local/production, SSO và migration](../README.md).
- [Checklist phát hành](plan_v2/Ho_so_ke_hoach_nang_cap_quan_ly_dao_tao_2026_v2/11_CHECKLIST_RELEASE.md): các mục production chỉ đánh dấu sau nghiệm thu thật.
- [Nhật ký thực hiện/kiểm thử](../harness/build-log.md).
- `prisma/schema.prisma`, `prisma/migrations/`; `src/lib/admissions.ts`, `src/lib/permissions.ts`, `src/lib/sso-*.ts`; `tests/` và `scripts/` ở repository root.

Báo cáo này thay snapshot 17/10 từng bị chặn bởi PostgreSQL. Sự cố kết nối local đó đã được xử lý; vẫn giữ tách bạch kết quả local với phát hành production. Các chỉnh sửa workspace chưa được coi là đã commit/phát hành.
