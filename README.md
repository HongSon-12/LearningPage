# LearningPage


## SSO production cho edu.115.org.vn (07/11/2026)

Production đăng nhập qua `https://sso.115.org.vn`, không nhập mật khẩu tại edu. `AUTH_MODE=sso` là cấu hình phát hành; mật khẩu/email tài khoản nhân sự chỉ thay đổi tại SSO. Trang `/login` chuyển thẳng sang OIDC; trang khôi phục tài khoản cũng chuyển về SSO. OTP tra cứu/đăng ký của **học viên** vẫn là chức năng riêng và dùng SMTP bên dưới.

- Origin: `https://edu.115.org.vn`.
- Issuer/discovery: `https://sso.115.org.vn/application/o/edu/` và `.well-known/openid-configuration` dưới issuer này.
- Confidential client ID: `y2FhSDe4EM0VbaSKtfCrniWkhHjJNuZECUxSa2XO`.
- Callback: `https://edu.115.org.vn/api/auth/callback/authentik`.
- Post-logout redirect: `https://edu.115.org.vn/da-dang-xuat` (đăng ký strict/allowlist ở provider).
- Back-channel logout: `https://edu.115.org.vn/api/auth/backchannel-logout`.
- Webhook: `https://edu.115.org.vn/api/auth/webhook/authentik`, JSON **chỉ** `{"eventId":"<event UUID>"}`, header `Authorization: Bearer <secret>`.
- SMTP: `pro66.emailserver.vn:465`, `SMTP_SECURE=true`, user `edu@115.org.vn`; mật khẩu cấu hình riêng.

### Bí mật và quyền API SSO

Điền riêng trên máy chủ trong `.env.production` **ngoài checkout** (mặc định `$HOME/.config/edu/.env.production`, xem [runbook](docs/HUONG_DAN_KHOI_TAO_MAY_CHU.md)) theo `deploy/production.env.example`: `SSO_CLIENT_SECRET`, `SSO_API_TOKEN`, `SSO_WEBHOOK_SECRET`, `SSO_TOKEN_ENCRYPTION_KEY`, `SMTP_PASS`, các URL/mật khẩu database và `LOOKUP_OTP_SECRET`. `SSO_WEBHOOK_SECRET` là đúng phần bí mật **sau** `Bearer ` trong header transport đang có; không ghi cả tiền tố vào biến. Dùng Bearer ngẫu nhiên ít nhất 32 ký tự. Khóa mã hóa SSO là 32 byte ngẫu nhiên dạng hex, khác khóa OTP; thay khóa sẽ buộc các phiên hiện tại đăng nhập lại. Không gửi bí mật trong chat/Git/image hoặc access log.

`SSO_API_TOKEN` là token của service account riêng, được **đọc toàn bộ human users** và **đọc events** để lấy chi tiết `eventId`; không dùng mật khẩu của nlhson, token webhook hoặc Client Secret để thay thế. App không ghi tài khoản/quyền/mật khẩu lên SSO. Khởi tạo và webhook cần API đọc `/api/v3/core/users/`, `/api/v3/core/users/<id>/`, `/api/v3/events/events/<eventId>/`. `deploy:check` còn thử GET danh sách events/users và introspection bằng token giả để kiểm tra kết nối/quyền/client, không gửi email hoặc thay đổi SSO.

### Đồng bộ ban đầu và phân quyền

Sau backup và `prisma migrate deploy` (hiện **9 migrations**), cấp quyền bảng mới cho runtime rồi chạy qua shell function `prod` ở hướng dẫn phía dưới:

```bash
# Chỉ xem số lượng, chưa ghi:
prod run --rm ops ./node_modules/.bin/tsx scripts/sync-sso-users.ts
# Đồng bộ toàn bộ phân trang:
prod run --rm ops ./node_modules/.bin/tsx scripts/sync-sso-users.ts --apply
```

Lệnh bỏ qua service accounts; không sao chép mật khẩu. Tài khoản SSO `nlhson` được khởi tạo ADMIN và cấp quyền edu **chỉ khi tạo mới**. Các tài khoản khác chờ admin edu cấp quyền, không lấy role/group/is_superuser của SSO làm quyền edu. Tại `/users`, chọn vai trò và bật **Cấp quyền truy cập edu**. Trạng thái hoạt động bằng **SSO active AND được admin edu cấp quyền**. SSO khóa/xóa tài khoản sẽ chặn truy cập và thu hồi phiên, nhưng giữ lựa chọn quyền để admin có thể quản lý. Đồng bộ không tự cấp lại quyền đã thu hồi.

Ánh xạ bằng ID/UID bất biến của SSO và issuer/sub đã xác minh. Giữ Subject mode của provider là **Hashed user ID** (mặc định Authentik) hoặc User ID; app kiểm tra sub phải khớp UID/ID từ API, không dùng email/username làm subject. Các subject mode khác cần ánh xạ bất biến được xác minh trước khi bật. Tài khoản cục bộ hoặc email trùng sẽ được báo xung đột; không tự nối theo tên/email, không tự đổi quyền hay ghi đè tài khoản cũ. Nếu chuyển một cài đặt cũ đã có username `nlhson`, cần kiểm tra và xử lý liên kết có chủ đích trước khi bootstrap; không đổi tên/xóa tài khoản thật để né kiểm tra.

### Đăng xuất toàn bộ và tab đang mở

**Phải** đặt provider edu → Advanced flow settings → Invalidation Flow = `default-invalidation-flow` (có User Logout stage). `default-provider-invalidation-flow` mặc định chỉ kết thúc riêng app. Các app liên quan cũng phải tham gia SLO. Xem [Authentik Single Logout](https://docs.goauthentik.io/add-secure-apps/providers/single-logout/).

Logout tại edu là thao tác có chống CSRF: thu hồi các phiên edu của tài khoản, xóa cookie và chuyển tới end-session của provider với state dùng một lần. SSO kết thúc phiên trung tâm theo flow trên và gửi back-channel cho các app. Đây là SLO của **phiên SSO/trình duyệt liên quan**; các thiết bị có phiên SSO độc lập tuân theo chính sách phiên của SSO, không được coi là đã bị xóa toàn bộ thiết bị chỉ vì nhận một sid logout.

Back-channel xác minh chữ ký RS256 qua JWKS, issuer, audience, iat/jti và logout event; chặn nonce, token sai/giả/cũ và phát lại. Lưu dấu logout để callback đến muộn không tái tạo phiên. sid/sub chọn đúng phạm vi phiên; user deactivation/webhook thu hồi toàn bộ phiên edu của tài khoản đó. Webhook xác minh Bearer rồi đọc sự kiện từ SSO; `event.user` là người thực hiện thao tác, không phải tài khoản đích. Đọc tài khoản đích mới nhất qua API, chống trùng event và trả 503 để gửi lại khi chưa xử lý được.

Mỗi request được bảo vệ vẫn kiểm tra phiên/quyền trong DB. App đối soát token bằng introspection và trạng thái tài khoản SSO với lease tối đa 30 giây; gom các lượt kiểm tra đồng thời và không ghi lại tài khoản không đổi. Tab visible kiểm tra mỗi 20 giây, kiểm tra ngay khi quay lại tab/back/forward, che nội dung và khóa thao tác khi chưa xác minh được. Back-channel/webhook thành công có hiệu lực cho request tiếp theo; khi mất push, lần kiểm tra tiếp theo sẽ phát hiện token đã bị SSO thu hồi. Khi SSO/API lỗi và lease hết hạn, app từ chối thao tác thay vì tiếp tục dùng quyền cũ. Phiên hết hạn chuyển tới trang đã đăng xuất, không tự đăng nhập lại vòng lặp.

Cho phép server SSO POST vào webhook/back-channel qua Nginx/WAF, giữ nguyên `Authorization` và body. Không thêm session/CSRF trình duyệt vào hai endpoint máy-chủ này; chúng có Bearer/JWT riêng. Không log query callback/logout hoặc request Authorization; ID token hint chỉ gửi tới end-session cố định của SSO. Không cache `/api/auth/*` và nội dung quản trị.

### Kiểm thử và trạng thái nghiệm thu

`pnpm test:sso` kiểm tra OIDC/state/nonce/PKCE/chữ ký, mã hóa token, phân quyền, webhook, lease/fail-closed và các cuộc đua callback/logout trong schema PostgreSQL local riêng. `pnpm test:sso-ui` dùng SSO + proxy HTTPS giả lập trên loopback, chứng thư tạm và tài khoản giả; không gọi SSO thật hoặc gửi mail. Kiểm tra 5 luồng trình duyệt: đăng nhập/quyền, tài khoản chờ, logout edu nhiều tab, back-channel, mất push/webhook khóa tài khoản. Các kiểm thử local cũ dùng `AUTH_MODE=local` riêng cho fixture; production preflight bắt buộc SSO.

Kết quả cuối ngày 07/11/2026: build host và hai image Alpine đạt; lint/TypeScript đạt; 44/44 hồi quy UI và 5/5 HTTPS SSO UI đạt; integration SSO đạt; audit dependency production báo 0 lỗ hổng. Docker smoke xác nhận redirect SSO, session 401 khi chưa đăng nhập, callback sai bị từ chối, webhook/back-channel chặn request không hợp lệ, UID 1000/private uploads và không chứa `.env`/secrets runtime trong image. Database local đã được sao lưu, phục hồi thử và nâng từ 8 lên 9 migration, fingerprint tài khoản/đăng ký cũ giữ nguyên. Các container/schema phục vụ test được dọn sau chạy.

Phiên edu không vượt quá hạn access token do SSO cấp hoặc 8 giờ; phiên hết hạn sẽ yêu cầu đi qua SSO lại. Không lưu refresh token hay tự tạo mật khẩu edu. Hết hạn phiên edu không tự chứng minh rằng các phiên SSO trên thiết bị khác đã kết thúc.

Discovery thực tế của `sso.115.org.vn` đã được đọc: Authentik 2026.8.4 có back-channel/session support, RS256, PKCE S256 và introspection. Đã tạo sẵn `.env.production` (quyền 600, Git/Docker bỏ qua) với giá trị công khai và placeholder để người triển khai tự điền; `.env` local được giữ nguyên. Chưa đồng bộ tài khoản thật hay nghiệm thu login/logout thật khi chưa có Client Secret, API Token và Bearer webhook trong môi trường. Sau cấu hình, chạy preflight, đồng bộ trước rồi nghiệm thu nlhson, cấp quyền một user, logout từ edu/SSO/app khác, tab cũ, webhook khóa/mở khóa, và gửi OTP học viên thật.


## Chọn môi trường chạy

Mã nguồn nằm ngay ở thư mục `Learning`. Compose local và production là hai cấu hình độc lập:

| Môi trường | Cấu hình | Database / proxy | Đăng nhập |
| --- | --- | --- | --- |
| Phát triển trên máy | `pnpm dev` + `docker compose -f docker-compose.local.yml up -d postgres` | PostgreSQL local cổng 5432; Next ở `http://localhost:3001` | Tài khoản local phục vụ phát triển |
| Kiểm tra container trên máy | `docker compose -f docker-compose.local.yml up -d --build` | PostgreSQL 16 Alpine + app + Nginx local ở `http://localhost` | `AUTH_MODE=local` được đặt rõ trong Compose |
| Máy chủ thật | `docker compose --env-file "$EDU_ENV_FILE" -f docker-compose.production.yml ...` | DB/Nginx có sẵn, mạng external | SSO 115; quyền do admin edu cấp |

`docker-compose.yml` mặc định include file local, nên `docker compose up` vẫn dùng project `ttcc-app` và các volume `ttcc-app_pgdata`/`ttcc-app_uploads` hiện có. File mặc định cần [Docker Compose từ 2.20.3](https://docs.docker.com/compose/how-tos/multiple-compose-files/include/); có thể chỉ định trực tiếp `-f docker-compose.local.yml`. Các lệnh production phải chỉ định đúng file production, không ghép hai môi trường.

`.env` dành cho local; mẫu là `deploy/local.env.example`. `.env` hiện tại đã đặt `AUTH_MODE=local` và `APP_ORIGIN=http://localhost:3001`, giữ các giá trị kết nối/bí mật khác. Với local container, `LOCAL_APP_ORIGIN=http://localhost` tách khỏi `APP_ORIGIN=http://localhost:3001` của `pnpm dev`; nếu đổi `LOCAL_HTTP_PORT`, đổi cả `LOCAL_APP_ORIGIN`. Local Nginx/DB chỉ publish trên loopback, không tham gia mạng máy chủ. SMTP thật không tự truyền từ file production vào stack local. Service local `uploads-init` chạy một lần khi khởi động, không có mạng và chỉ chuẩn bị quyền named volume uploads cho UID/GID 1000. Bước này hỗ trợ volume cũ từng do root tạo, giữ nội dung tài liệu và không áp dụng cho database.

## Triển khai máy chủ thật: PostgreSQL 16 Alpine và Nginx có sẵn

Cập nhật 07/11/2026: dùng **PostgreSQL `postgres:16-alpine` đã có sẵn**, tạo **database riêng** cho LearningPage; dùng Nginx HTTPS hiện có. `docker-compose.production.yml` chỉ chạy app/worker; không tạo PostgreSQL, Nginx hoặc volume database. Không dùng file Compose local ở đầu tài liệu để triển khai production.

### Chuẩn bị database

Máy chủ đã có database **`edu`**, dùng tài khoản **`edu_user`** tại `cap-cuu-115-db:5432`. Dùng schema `public`; không tạo lại database/user hoặc trỏ vào database của ứng dụng khác. `.env.production` và mẫu đã cập nhật tên DB/user. `MIGRATION_DATABASE_URL` mặc định để trống, migration dùng chính `edu_user`; role này cần quyền tạo schema/object của edu và không có quyền quản trị PostgreSQL toàn cục. Chỉ điền URL migration riêng nếu DBA đã cấp một role DDL khác.

Xem **[hướng dẫn khởi tạo máy chủ thật](docs/HUONG_DAN_KHOI_TAO_MAY_CHU.md)**: lưu bí mật ngoài repository, cấp quyền cho role đã có, backup, migrate, đồng bộ nlhson/SSO, chạy app/worker và nghiệm thu Nginx. Hướng dẫn không dùng seed admin/mật khẩu local.

### Cấu hình và phát hành

1. Theo [runbook](docs/HUONG_DAN_KHOI_TAO_MAY_CHU.md), sao chép mẫu vào `$HOME/.config/edu/.env.production` ngoài checkout, quyền file 600/thư mục700; điền mật khẩu edu_user trong DATABASE_URL, OTP/SSO secrets và SMTP thật. Giữ MIGRATION_DATABASE_URL trống nếu dùng cùng role. Runbook có đoạn sinh khóa thẳng vào file, không in giá trị. URL-encode mật khẩu trong URL; không dùng localhost làm host database của container.
2. Máy chủ sử dụng các giá trị đã chốt:

```dotenv
PG_HOST=cap-cuu-115-db
PG_PORT=5432
DB_NETWORK=cap-cuu-115_private
PROXY_NETWORK=cap-cuu-115_private
```

`DATABASE_URL` và `MIGRATION_DATABASE_URL` trong mẫu tham chiếu `${PG_HOST}:${PG_PORT}`; Compose mở rộng các biến này từ `.env.production`. Chỉ dùng qua `docker compose --env-file ...`; `dotenv`/`docker run --env-file` riêng không tự mở rộng theo cùng cách. Điền user/mật khẩu/database riêng của edu trong cả hai URL. Preflight phát hiện host/port URL không khớp PG_HOST/PG_PORT. PostgreSQL có sẵn phải mang DNS `cap-cuu-115-db` trên DB_NETWORK; Nginx có sẵn phải tham gia PROXY_NETWORK. Các mạng được khai báo external, Compose sẽ yêu cầu chúng tồn tại và không tạo/xóa mạng của hệ thống khác. Xem [Docker networks](https://docs.docker.com/reference/compose-file/networks/).

App tham gia mạng DB và proxy, cung cấp alias cố định **`edu-app`**, chỉ expose cổng 3000 nội bộ; worker/ops tham gia mạng DB. Hai biến mạng có thể trùng như hiện tại hoặc tách riêng sau này; alias được giữ ở cả hai cấu hình. Không publish app port lên host. Nginx upstream của `edu.115.org.vn` dùng **`http://edu-app:3000`**, tránh alias `app` chung với ứng dụng khác.
3. Dùng shell function sau cho mọi lệnh production:

```bash
EDU_ENV_FILE="${EDU_ENV_FILE:-$HOME/.config/edu/.env.production}"
prod() {
  docker compose --env-file "$EDU_ENV_FILE" \
    -f docker-compose.production.yml "$@"
}
prod config --quiet
prod --profile tools build app ops
prod run --rm ops ./node_modules/.bin/tsx scripts/check-production.ts --config-only
```

4. Sao lưu database đích và private uploads, phục hồi thử vào database/volume tạm trước khi nâng cấp. Dùng `pg_dump`/`pg_restore` **bản 16** từ container PostgreSQL hiện có. Nếu chuyển dữ liệu từ local: chuyển database và private uploads cùng đợt, kiểm tra hồ sơ/file và loại dữ liệu `[MẪU]` ở bản sao staging; không chạy `demo:seed`, `migrate reset`, `db push` hoặc `prisma db seed` trên production. Giữ bản sao trước chuyển đổi, không xóa volume cũ.
5. Kiểm tra và áp dụng migration bằng ops (database mới sẽ báo pending ở bước status):

```bash
prod run --rm ops ./node_modules/.bin/prisma migrate status
prod run --rm ops ./node_modules/.bin/prisma migrate deploy
# Nếu dùng role DDL riêng, DBA cấp quyền runtime theo hướng dẫn khởi tạo, sau đó:
prod run --rm ops
# Phải đạt config / PostgreSQL 16 / role / 9 migrations / quyền bảng / private storage.
```

6. Đồng bộ tài khoản SSO bằng `sync-sso-users.ts` (dry-run rồi `--apply`) như mục SSO ở đầu tài liệu. Đăng nhập `nlhson` qua SSO và cấp quyền cho các tài khoản còn lại. Không chạy setup-admin hoặc seed mật khẩu cục bộ trên production.
7. Khởi chạy và kiểm tra:

```bash
prod up -d app email-worker
prod ps
prod exec -T app node -e "fetch('http://127.0.0.1:3000/api/health/live').then(r=>{console.log(r.status);process.exit(r.ok?0:1)})"
prod exec -T app node -e "fetch('http://127.0.0.1:3000/api/health/ready').then(r=>{console.log(r.status);process.exit(r.ok?0:1)})"
```

8. Ghép `deploy/nginx.production.conf.example` vào server HTTPS của container Nginx hiện có trên PROXY_NETWORK; giữ chứng thư/domain, upstream là `edu-app:3000`. Khi app healthy, kiểm tra `nginx -t` rồi reload Nginx, kể cả sau lần triển khai làm đổi IP container app. Nginx ghi đè Host/X-Real-IP/X-Forwarded-Proto, chặn `/api/health/` phía public, không cache nội dung riêng tư và không buffer streaming. Cho phép SSO POST webhook/back-channel với header Authorization nguyên vẹn.

### Nghiệm thu trước khi mở cho người dùng

- HTTPS/domain đúng, HTTP chuyển sang HTTPS, cookie phiên có Secure/HttpOnly/SameSite, đăng nhập/đăng xuất/khôi phục hoạt động.
- Gửi OTP học viên thật và kiểm tra hộp thư cho tra cứu/đăng ký; khôi phục mật khẩu nhân sự do SSO quản lý; SMTP production bắt buộc TLS/STARTTLS. Worker chạy liên tục, có lease/retry và heartbeat; kiểm tra không có outbox FAILED tồn đọng. Health DB không chứng minh SMTP đã gửi thành công.
- Tạo một hồ sơ thử có kiểm soát, upload/tải tài liệu theo quyền, kiểm tra dữ liệu thanh toán trong `/settings`, lớp học, điểm danh và mobile HTTPS/camera. Không dùng kết quả local để khẳng định đã nghiệm thu máy chủ.
- Sao lưu định kỳ cả database riêng lẫn volume `learning-production_uploads`, mã hóa và giữ ngoài máy chủ; phục hồi thử, đặt retention/cảnh báo dung lượng, lỗi 5xx, DB, worker. Giới hạn pool mỗi app mặc định 10, worker 2; tính tổng pool theo số replica và chừa kết nối vận hành.
- Khi quay về image cũ: giữ database và uploads, xác nhận code cũ đọc được schema mới; không tự xóa migration/bảng hoặc hạ major PostgreSQL. Không đổi trực tiếp volume major khác sang 16; dùng dump/restore kiểm chứng.

Kiểm thử đồng thời/tải cao chỉ ở local/staging được phép. Các file `.env.production`, bản sao lưu và mật khẩu không nằm trong image/Git.


### Kết quả kiểm tra local ngày 07/11/2026

| Hạng mục | Kết quả |
| --- | --- |
| PostgreSQL thực tế | 16.13, Alpine 3.23.4; database tạm riêng, role runtime không có quyền quản trị |
| Migration và phục hồi | Trước SSO: 8 migration từ DB trống và dump/restore dữ liệu giả đạt. Sau SSO: kiểm tra đủ 9 SQL migration trong schema riêng; backup/restore local trước nâng cấp 8 → 9 và đối chiếu dữ liệu cũ đạt |
| Đăng ký đồng thời | 64 lượt tranh chỗ cuối: đúng 1 người được nhận; retry/CCCD/chuyển lớp/khôi phục/đổi sĩ số đều giữ các ràng buộc |
| Hồi quy | 8 bộ integration trước SSO đạt; integration SSO đạt; 44/44 UI và 5/5 HTTPS SSO UI đạt |
| Build và mã | Build host và hai image Alpine đạt; TypeScript, toàn bộ lint, kiểm tra private artifacts đạt |
| Container | UID 1000; ghi private uploads; public routes/JS/CSS/security headers đạt; ready trả 503 chung khi mất quyền DB và trở lại 200 sau phục hồi; worker heartbeat/SIGTERM đạt; không có `.env` trong image |
| Dependency production | Next.js 16.4.1, Nodemailer 10.1.4, fast-uri 3.1.9; `pnpm audit --prod` báo 0 lỗ hổng tại thời điểm kiểm tra |
| Proxy | Cấu hình mẫu cho Nginx có sẵn đã qua `nginx -t`; chưa kiểm tra chứng thư/domain thực tế của máy chủ |

Next.js được cập nhật theo các khuyến cáo [image optimization](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [Server Actions](https://github.com/advisories/GHSA-p3m5-59mp-jv5r) và [use cache](https://github.com/advisories/GHSA-673q-mjm6-r5xr). Nodemailer cập nhật theo [khuyến cáo address parser](https://github.com/advisories/GHSA-8c8m-p3m8-cjg8). Kết quả audit có thời điểm, cần chạy lại trước mỗi lần phát hành.

Các kết quả trên dùng dữ liệu giả và PostgreSQL local. Còn cần nghiệm thu trên máy chủ: network/role/database đích, HTTPS/cookie qua Nginx thật, OTP đến hộp thư, dữ liệu thanh toán, file đã chuyển và backup định kỳ. Khi phục hồi uploads, bảo đảm chủ sở hữu UID/GID 1000 của runtime đọc/ghi được và chạy lại preflight. Không gửi email thật, kiểm thử tải cao hoặc thay đổi máy chủ production trong lần kiểm tra này.


This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

You can start editing the page by modifying `src/app/`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Application routes

On the current development server (`http://localhost:3001`):

- `/` opens Hệ thống Quản trị (authentication required); `/login` is the sign-in page.
- `/hocsocapcuu` is the public first-aid landing page.
- `/hocsocapcuu/courses`, `/register/[classId]`, and `/search` are the public schedule, registration, and lookup pages.
- `/login` is the admin login page.
- `/fb`, `/zalo`, and `/page` redirect to `/hocsocapcuu` with their respective `source` tracking parameter.

These paths also apply when running the application on another port or domain.

## Student management setup

Run `pnpm exec prisma migrate deploy` and `pnpm exec prisma generate` for the new schema. The initial migration is a baseline for existing installations; this workspace's existing schema was verified and marked as applied before the additive upgrade.

Run `pnpm setup:admin` to initialize a missing/placeholder administrator with a strong generated password. Existing real credentials are preserved. Local credentials are saved in `.local/admin-access.txt`, which is excluded from Git. After logging in, use `/users` to create class-manager/accountant accounts and assign classes.

Use `/registrations` for manual/late registration, transfers, rejection reasons, GCN/GXN tracking and Excel import/export. Transfers require matching program and tuition, available seats and no issued documents. Rejected/cancelled registrations do not occupy seats; restoring them checks capacity again. Unpaid reservations do not expire automatically.

Program landing pages use `/dao-tao/[slug]`, individual class pages use `/lop/[classId]`, and the existing first-aid landing remains `/hocsocapcuu`.

Validation: `pnpm test:management` uses an isolated database schema; `pnpm test:http` checks the running development server and requires the local admin-access file. Use `NEXT_BUILD_DIR=.next-build pnpm build` for a production build alongside a running dev server.


### Administrative navigation

- `/courses`: class list; **Quản lý học viên** opens `/courses/[classId]` with manual/late registration, transfers, Excel and certificate/payment management according to account permissions.
- `/students`: canonical student dossiers and scoped learning history; admins confirm contact/identity changes.
- `/registrations`: check registration information and attachments, approve or reject with a reason; initially lists pending applications.
- `/course-links`: copy direct, Facebook, Zalo and Fanpage links for the five main training programs.
- `/settings`, `/users`: settings and account management. Old `/admin/...` page URLs redirect to the corresponding new URLs.
- Public schedules now use `/hocsocapcuu/courses` to avoid conflicting with administrative `/courses`.

## UI regression

Với database development, chuẩn bị Chromium một lần bằng `pnpm exec playwright install chromium`. Chạy `NEXT_BUILD_DIR=.next-build pnpm build`, sau đó `pnpm test:ui`.

Bộ test khởi động server riêng ở localhost:3101, tạo tài khoản/lớp/học viên giả và tự dọn các ID của run sau kiểm thử. Không chạy bộ test fixture này với database production. Screenshot/trace được lưu trong `.local/`, ngoài Git. Kết quả và giới hạn nghiệm thu: `harness/build-log.md`.


## Private documents, student dossiers and email OTP

`pnpm test:security` tests private files/OTP. `pnpm test:students` rehearses profile backfill with populated legacy data in an isolated schema. Browser tests now run the standalone production artifact, with static assets copied as in Docker and private uploads kept outside that artifact.

For an **existing** installation, back up and cut over during a maintenance window:

1. `pnpm backup:security` saves the pre-cutover DB and legacy files under a protected `.local/backups/security-...` directory.
2. `pnpm exec tsx scripts/verify-security-backup.ts .local/backups/security-...` restores the archive into a random temporary database for verification (requires create-database permission). Production should use matching-major PostgreSQL tools.
3. `pnpm exec prisma migrate deploy` and `pnpm exec prisma generate` apply additive schema changes.
4. `pnpm migrate:files` validates/inventories only. `pnpm migrate:files --apply --backup /absolute/path/to/.local/backups/security-...` copies/compares hashes, updates file FKs/private URLs and quarantines the old public directory. Keep the backup and rollback manifest protected. Never reopen `/uploads` during rollback.

This workspace completed that local cutover on 17/10/2026. The Nginx container now uses the root configuration without a legacy file bind mount; PostgreSQL keeps its original container and volume. Four private documents were copied and SHA-256 verified into `ttcc-app_uploads` on 18/10/2026, with local originals retained. The application image still needs rebuilding when deploying new code. Persist private file data alongside the database. Old files were tracked in Git; deleting the current files does not rewrite history or old images.

Runtime configuration:

- `PRIVATE_UPLOAD_DIR`: writable private volume outside `public`; defaults to `.local/uploads` for local use. Include this volume in ongoing operational backups; the cutover backup command above is for legacy migration.
- `APP_ORIGIN`: canonical origin for POST checks, e.g. `http://localhost:3001` locally or the actual HTTPS origin in production. Do not derive links from request Host.
- `TRUST_PROXY=true`: only behind a proxy overwriting `X-Real-IP`, with direct public app access blocked. Otherwise the safe default uses a shared anonymous rate bucket.
- `LOOKUP_OTP_SECRET`: 32 random bytes encoded as 64 hex characters, generated separately per environment and injected at runtime. Local development .env is ignored and protected. Rotating this key invalidates pending lookup codes.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`: inject runtime secrets; do not put them in an image or client environment.

`pnpm email:search` processes one leased batch of pending SEARCH_OTP jobs. Configure LOOKUP_OTP_SECRET and SMTP first; schedule the internal command in phase 3/operations. It retries with backoff up to 5 attempts and stores safe error codes and HMACs of codes. No real email has been sent in tests.

Public lookup is now **CCCD → email code → learning history**. A six-digit code is valid 10 minutes, one-use and limited to 5 wrong guesses; resends have a 60-second cooldown. The recipient is the canonical Student profile email. Registration ID and email input/link lookup are superseded. Profiles without a usable confirmed contact require staff review.

Each Student dossier links many Registration snapshots. New signup/import never overwrites canonical email. Conflicting/unknown snapshots do not appear in public history or its totals until staff confirms the profile and its linked records. `/students` is paginated/scoped; managers cannot edit global identity or view other classes' history. Accountants see masked CCCD. Admin confirmation revokes pending codes. Changing an established CCCD goes through the dossier, not Excel; old registration snapshots otherwise stay intact. Invalid legacy IDs are not silently merged; broad manual merge/split is a later data-repair operation.

The local profile migration was backed up and completed on 17/10/2026. Old one-use links and queued link jobs are invalidated. Production rollout and actual SMTP verification remain pending.

Global GA/Meta/Clarity scripts are paused pending route/consent isolation. Build now fails if private files/backups/local secrets enter server traces; generated standalone `.env` copies are stripped, so deployers must inject runtime secrets. Retention, malware scanning, TLS/HSTS/CSP enforcement and actual SMTP verification remain release gates.


## Accounts, sessions and attendance (local implementation)

The application runs Next.js/React; the migrated admin UI uses shadcn/ui + Tailwind, with TanStack Table and RHF/Zod. `/users` now uses that stack for account creation/editing, password resets, active state, the existing three roles and class-manager assignments. Updating an account revokes its sessions. Reassign/unassign classes before disabling or changing the role of their manager. Customizing the two non-admin roles is a future requirement; no custom permission editor is currently exposed.

Open `/courses` → **Buổi học**, create/edit a session, then **Điểm danh**. Admin or the assigned manager can scan a CCCD QR using the phone's rear camera or search by name/phone/CCCD. A matching record shows its registered ID document; staff compare it and explicitly confirm presence. Scanning alone never checks someone in. Undo, close and reopen are audited. Transfers retain attendance in the original session. Unrecorded learners are not automatically marked absent.

Camera requires HTTPS on a phone and browser permission; manual search remains available. QR decoding runs locally and only the 12-digit identifier is sent to the scoped server search. The decoder supports a 12-digit value or the first field of supported pipe-separated card payloads; unknown layouts require manual entry. The authenticated identity preview endpoint serves raster images only, with no-store and no image optimizer; PDFs stay downloads. Physical phone/card acceptance and container rollout remain pending.

`pnpm test:attendance` runs isolated schema/domain checks. `pnpm test:ui` includes account/session/attendance, real QR decoding from synthetic camera frames, permission-denial/late-permission cleanup and direct action replay tests. See `docs/plan_v2/Ho_so_ke_hoach_nang_cap_quan_ly_dao_tao_2026_v2/17_BUOI_HOC_DIEM_DANH.md` and `harness/build/phase-02c-users-attendance.md`.


## Shared select/date/time controls

Visible selects now use `SelectField`/`SelectOption`, with styled scrollable menus, keyboard navigation and mobile wrapping. Use `onValueChange`; for React Hook Form use `ControlledSelectField` instead of register-only native select bindings. Empty values and standard FormData names are preserved.

`DateTimePicker` displays Vietnamese dd/mm/yyyy, HH:mm24-hour and combined date/time, with a localized calendar and month/year selection. Eight numeric digits autoformat as a date for phone keyboards. Date/time popups use the same visual tokens as selects; combined date/time has separate Ngày/Giờ steps within one popup. `ControlledDateTimeField` integrates RHF. Hidden fields keep existing ISO payloads; date-only values do not shift timezone. `ui-overlay` preserves the control accent for portal content without changing public brand colors.

Run `pnpm test:date-time` for parsing/round-trip checks and `pnpm test:ui` for actual dropdown/calendar/form interactions. Final phase02d verification:20/20 browser cases, type/lint/build and HTTP smoke pass. No database migration or container rollout in this phase.


## Admin layout and student directory

The current page title now appears once in the compact top bar; nested pages include a parent link. Admin pages use the available width with16/20px padding rather than nested fixed max-width containers. Page descriptions/actions stay compact below the bar. Use the shared server `PageHeader` wrapper; its client publisher supplies serializable title/parent metadata to `AdminShell`, keyed by pathname.

`/students` supports server-side search, class/review filters and20-row pagination with a compact desktop table and mobile cards. Search stays in server-action POST bodies rather than PII query strings. Accountants receive masked IDs and cannot search the CCCD field. Managers only receive assigned-class profiles/counts/history. Details place profile editing and registration history side by side on wide displays, stacked with quick anchors on phones. Profile confirmation/OTP and admin-only changes remain as before.

`pnpm test:student-directory` exercises scoped search/pagination/review/masking in a temporary schema. The full UI suite now has23 passing scenarios, including layout/title behavior and directory raw-action replay. No schema/dependency migration in this layout phase.


### Nhập lại thông tin khi đăng ký
Nhập CCCD trước, chọn **Dùng thông tin đã đăng ký** và xác thực mã6chữ số gửi đến email trong hồ sơ. Sau xác thực, thông tin cũ được điền để học viên kiểm tra/chỉnh sửa rồi tiếp tục thanh toán. Học viên mới hoặc không nhận được mã chọn **Tự điền thông tin**. Thông tin chỉnh sửa ghi nhận trong lần đăng ký mới, không tự đổi email tra cứu đã đối chiếu. Cần cấu hình SMTP và vận hành worker `pnpm email:search` để gửi mã thật.
## Local security and concurrency checks

The 18/10/2026 improvements add per-class seat locks, request-key and identity locks, server-side registration pagination, on-demand history, bounded database pools and short-lived public class caching. Seat admission always checks current database state inside its transaction; the public cache is only for display. Transfers, imports, reactivation, capacity edits and canonical identity confirmation share the relevant locks. Administrative multi-record operations retain their existing global serialization.

`pnpm build` now verifies required server files and excludes private data, then starts the actual standalone artifact on a temporary loopback port to check login, JS/CSS, the anonymous redirect and 404 handling. Both default `.next` and `NEXT_BUILD_DIR=.next-build` builds use these checks.

Run `pnpm test:concurrency`, `pnpm test:tracking` and `pnpm test:registration-list` against local PostgreSQL. They use random schemas and remove them afterward. The concurrency suite covers 64 contenders for the last seat, retries, duplicate identities, unrelated classes, transfer/restore/capacity races and identity confirmation. `pnpm test:ui` now runs the full browser suite in an isolated schema and private test directory with real SMTP disabled; it includes two actual browser submissions competing for one seat. Build `.next-build` first as described above. `pnpm test:rbac-ui` remains the separately isolated RBAC browser suite.

`DATABASE_POOL_MAX` defaults to 10 connections per application process. Budget PostgreSQL connections across all app processes, background workers and maintenance tools before increasing it. Public course metadata/counts are cached for up to 10 seconds per process with concurrent reads coalesced; the schedule polls a small endpoint every 20 seconds while visible and refreshes only after a change. Registrations are fetched 10 rows per page, with search/filter/sort performed in PostgreSQL; histories are fetched 20 events at a time.

Docker Compose injects the existing local `LOOKUP_OTP_SECRET` at runtime and has application/database readiness checks. Keep `.env` outside images. These local changes do not configure or replace production TLS/SMTP credentials.
