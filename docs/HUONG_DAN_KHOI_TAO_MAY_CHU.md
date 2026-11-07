# Khởi tạo edu.115.org.vn trên máy chủ thật

Cập nhật 07/11/2026. Thực hiện trong Bash trên máy chủ Linux, từ thư mục repository `/home/vuongpham/code/learning/LearningPage`. Database và tài khoản PostgreSQL đã được tạo: **edu / edu_user**. Hướng dẫn không tạo lại PostgreSQL, database, user hoặc Nginx hiện có.

## 1. Thông tin triển khai

| Mục | Giá trị |
| --- | --- |
| Domain | https://edu.115.org.vn |
| PostgreSQL | 16-alpine, DNS `cap-cuu-115-db`, port `5432` |
| Database / user ứng dụng | `edu` / `edu_user` |
| DB_NETWORK / PROXY_NETWORK | `cap-cuu-115_private` / `cap-cuu-115_private` |
| Compose | `docker-compose.production.yml`, project `learning-production` |
| Nginx upstream | `http://edu-app:13081`, qua mạng Docker; app không publish port host |
| SSO | https://sso.115.org.vn/application/o/edu/ |
| SMTP | `pro66.emailserver.vn:465`, TLS, `edu@115.org.vn` |

Máy chủ cần Docker + Compose, Git, editor; Python 3 nếu dùng đoạn tạo khóa bên dưới. PostgreSQL/Nginx đã ở mạng nói trên và container app/ops có thể kết nối ra SSO/SMTP. Không dùng Compose local, `pnpm dev`, seed dữ liệu mẫu, `db push` hay `migrate reset` cho production. Dừng ở bước đang lỗi; không bỏ qua preflight để mở ứng dụng.

### Kết quả kiểm tra trực tiếp Docker và cổng (07/11/2026)

Đã đọc toàn bộ `Dockerfile`, `Dockerfile.nginx`, ba file Compose, `nginx.conf`, mẫu deploy, `.dockerignore`, `.env`, script build/preflight và cấu hình Prisma. `docker ps`, `docker network ls`, `docker inspect` chỉ lấy mạng/mount và `ss -ltn` cho thấy:

| Container / dịch vụ | Cổng host đang dùng | Ghi chú |
| --- | --- | --- |
| `proxy` (nginx:stable-alpine) | `80`, `443` | Dùng lại; ở cả `cap-cuu-115_private` và `cap-cuu-115_public` |
| `cap-cuu-115-db` (PostgreSQL 16) | `5432` | Dùng lại DB `edu`; ở `cap-cuu-115_private` |
| `cap-cuu-115-dbtest` | `5433` | PostgreSQL test, không dùng cho edu |
| `cap-cuu-115-web` | `3000` | Ứng dụng hiện có |
| `qlvc115-sso-web-1` | `127.0.0.1:13080` | Ứng dụng hiện có |
| `snipe-it-web` | `8000` | Tài sản CNTT |
| `cap-cuu-115-cms` | `8055` | Directus |
| `cap-cuu-115-adminer-1` | `8080` | Adminer |
| `bullmq-redis` | `6379` | Redis dùng cho hệ thống khác |
| `cap-cuu-115-apptest`, `cap-cuu-115-redistest` | Không publish | Lần lượt expose nội bộ `3000`, `6379` |
| `qlvc115-sso-scanner-1`, `snipe-it-db`, `cap-cuu-115-watchtower` | Không publish | Nội bộ `3310`/`7357`, `3306`, `8080` |
| `sso115-server`, `sso115-worker`, `qlvc115-sso-document-worker-1`, `bullmq-worker` | Không publish | Giữ nguyên các worker/SSO hiện có |

Host còn có SSH `22`, SMTP loopback `25` và một số cổng loopback tạm thời. **Cổng `13081` chưa có listener tại thời điểm kiểm tra.** Production edu dùng `PORT=13081`, `expose: 13081`, healthcheck và upstream Nginx cùng cổng này. Không có `ports:`/`network_mode: host`, nên không chiếm cổng host; hai container khác nhau có thể dùng cùng cổng nội bộ mà không xung đột. Nếu cần truy cập kiểm tra, dùng `prod exec` ở bước 8; không tự thêm publish ra Internet.

Đối chiếu các chế độ Docker:

- `docker-compose.yml` mặc định include `docker-compose.local.yml`: tự tạo PostgreSQL, app và Nginx, publish `5432` và `80`. **Không chạy `docker compose up` mặc định trên máy này** vì trùng hạ tầng hiện có.
- `docker-compose.production.yml`: chỉ tạo `edu-app`, `email-worker` và `ops` chạy theo lệnh (`tools` profile); không tạo DB, Nginx, Redis hay dịch vụ SSO. Named volume `learning-production_uploads` thuộc riêng edu.
- `Dockerfile`: Node 22 Alpine; build Prisma + Next standalone; `runner` chạy web bằng user `node`; target `operations` có Prisma/tsx cho migration/preflight/worker. `EXPOSE 3000` trong image là metadata mặc định cho local, production đặt `PORT=13081` và Compose expose đúng cổng thực tế.
- `Dockerfile.nginx`/`nginx.conf` chỉ dành cho local. Production dùng container `proxy` và mẫu riêng `deploy/nginx.production.conf.example`.
- `email-worker` dùng PostgreSQL outbox và SMTP, không lắng nghe cổng, pool DB là 2; app mặc định pool 10. `ops` chạy tạm thời. Cần tính thêm kết nối của các app dùng chung PostgreSQL.

Có thể kiểm tra lại trước khi triển khai vì trạng thái cổng có thể đổi:

```bash
cd /home/vuongpham/code/learning/LearningPage
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
ss -ltn
docker inspect proxy cap-cuu-115-db --format '{{.Name}} {{range $name, $net := .NetworkSettings.Networks}}{{$name}} {{end}}'
```

### Đối chiếu `.env` hiện có và thông tin cần xác nhận

Đã bổ sung comment trong `.env`, giữ nguyên các giá trị bí mật bạn nhập. File này bị Git/Docker ignore. Bạn đã sửa các biến SSO đúng tên code đọc; đã đồng bộ sang `.env.production` và kiểm tra từ container thành công. **Chạy Docker bằng `.env.production`** vì `.env` nguồn vẫn thiếu các biến runtime, URL DB và hai khóa đã được bổ sung trong file production. Đối chiếu như sau, không đăng secret vào tài liệu:

| Biến hiện có | Biến production / xử lý |
| --- | --- |
| `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL` | `APP_ORIGIN=https://edu.115.org.vn` |
| `SSO_ISSUER` | Đã sửa thành `https://sso.115.org.vn/application/o/edu/`; discovery từ container PASS |
| `SSO_CLIENT_ID`, `SSO_CLIENT_SECRET` | Đã đồng bộ cặp mới sang production; xác thực confidential client PASS |
| `SSO_API_TOKEN` | Đã đồng bộ sang production; API human users và events PASS |
| `SSO_WEBHOOK_SECRET` | Đã đồng bộ sang production; chỉ secret sau `Bearer `, cần nghiệm thu webhook thực tế |
| `PG_HOST`, `PG_PORT`, `PG_DB`, `PG_USER`, `PG_PASS` | Tạo `DATABASE_URL` trỏ `cap-cuu-115-db:5432/edu`, user `edu_user`; URL-encode password. Code không tự ghép các biến PG_* thành URL |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Giữ thông tin tài khoản đã cấp; bổ sung `SMTP_SECURE=true` vì dùng cổng `465` |
| Chưa có | `AUTH_MODE=sso`, `NODE_ENV=production`, `TRUST_PROXY=true`, `PRIVATE_UPLOAD_DIR=/data/uploads`, `APP_ORIGIN`, `DATABASE_POOL_MAX=10`, hai khóa ngẫu nhiên riêng 64 hex, `DB_NETWORK`/`PROXY_NETWORK`, `RELEASE_TAG` |

`PG_PORT` hiện có khoảng trắng cuối dòng; chuẩn hóa thành `5432` trong file mới. Dùng `RELEASE_TAG=latest` cho cả `.env.production` và file mẫu; Compose cũng mặc định `latest` nếu bỏ trống biến. `latest` là tag được build lại từ code trên máy, không tự tải code mới hoặc tự khởi động lại container. Ghi lại commit/image ID nếu cần truy lại bản đã chạy.

Đã kiểm tra credential và quyền SSO/DB như bên dưới. HTTPS/DNS/chứng thư, trang công khai, static assets và chuyển hướng bắt đầu SSO đã được kiểm tra sau khi khởi chạy. Còn cần nghiệm thu đăng nhập tương tác, callback/logout/webhook và gửi email thực tế. Kết quả triển khai hiện tại ở bên dưới.

### Trạng thái chuẩn bị env và Docker ở phiên làm việc này

Đã tạo `.env.production` tại checkout từ credential bạn điền trong `.env`, cả hai file có quyền `600` và được Git/Docker ignore. File mới dùng `SSO_API_TOKEN` theo `.env` vừa cập nhật, ghép `DATABASE_URL` từ `PG_*` với password URL-encode, bỏ khoảng trắng dư ở PG_PORT, thêm `APP_ORIGIN`, runtime flags, `SMTP_SECURE=true` và hai khóa ngẫu nhiên riêng 64 hex. Giữ nguyên các credential đã nhập, không lấy Client ID mẫu ghi đè. Tạo khóa một lần; giữ file này khi nâng cấp.

Sau lần cập nhật mới nhất của bạn, đã đồng bộ `SSO_ISSUER`, `SSO_CLIENT_ID`, `SSO_CLIENT_SECRET`, `SSO_API_TOKEN`, `SSO_WEBHOOK_SECRET` từ `.env` sang `.env.production`, giữ nguyên khóa OTP/mã hóa đã sinh. Issuer hiện là `https://sso.115.org.vn/application/o/edu/`. Compose parse file thật thành công và đối chiếu credential sau parse mà không in giá trị.

File `.env.production` trong checkout là bản chuẩn bị hiện tại; trước vận hành nên chuyển nguyên file này ra `$HOME/.config/edu/.env.production` như bước 2, không tạo file mới từ mẫu đè mất các khóa/credential vừa chuẩn bị. Khi kiểm tra tại checkout, dùng rõ đường dẫn file và Compose production:

```bash
EDU_ENV_FILE="$PWD/.env.production"
prod() {
  docker compose --parallel 1 --env-file "$EDU_ENV_FILE" \
    -f docker-compose.production.yml "$@"
}
prod config --quiet
prod --profile tools build edu-app ops
# Sau khi image build xong, chỉ kiểm tra cấu hình, chưa kết nối/migrate DB:
prod run --rm ops ./node_modules/.bin/tsx scripts/check-production.ts --config-only
```

Kết quả chuẩn bị thực tế:

- Đã build thành công `learning-web:0.2.0` và `learning-ops:0.2.0`. Next build/TypeScript, kiểm tra trace loại bí mật và standalone smoke (login, JS/CSS, redirect xác thực, 404) đều PASS.
- `scripts/check-production.ts --config-only` bằng `.env.production` đã PASS. Lệnh này chỉ kiểm tra hình dạng cấu hình, không xác thực issuer/credential từ xa.
- Đăng nhập PostgreSQL bằng password thật của `edu_user` qua TCP đã PASS: DB `edu`, PostgreSQL 16.6, role không có SUPERUSER/CREATEDB/CREATEROLE. Trước migration đã xác nhận public có 0 bảng và chưa có `_prisma_migrations`; sau backup đã áp dụng đủ 9 migration.
- SMTP TLS và đăng nhập đã PASS, không gửi email.
- Kiểm tra từ image ops trên mạng production đã PASS: discovery/kiểm tra endpoint cùng origin, xác thực confidential client bằng introspection với token thử không hợp lệ, đọc API human users và events. Kiểm tra không tạo phiên đăng nhập người dùng hoặc sửa cấu hình Authentik.
- Quyền DB `CONNECT`/`CREATE` và schema `public` `USAGE`/`CREATE` bằng credential ứng dụng đã PASS; sẵn sàng cho bước migration được mô tả ở dưới.
- `ops --config-only` đã khởi tạo volume riêng `learning-production_uploads`; volume này hiện được web sử dụng. Trạng thái khởi chạy mới nhất ở bên dưới.

**Trạng thái hiện tại:** edu đã chạy tại **https://edu.115.org.vn**; `edu-app` và `email-worker` đều healthy. Backup, 11 migration và preflight đầy đủ đã hoàn tất; phân quyền tự do đã triển khai theo mục dưới. Phiên mới hỗ trợ refresh token, không khóa theo 5 phút nhàn rỗi; hạn tuyệt đối 8 giờ. Đã nhập 297 tài khoản người dùng, admin `nlhson` active. Theo xác nhận của bạn, tạm bỏ qua SSO ID 4 bị trùng email với SSO ID 295, không tự gộp tài khoản. File production là snapshot: chỉnh `.env` nguồn không tự cập nhật `.env.production`; đồng bộ có chủ đích và giữ nguyên hai khóa đã sinh.

### Kết quả backup, migration và preflight đã thực hiện

Thực hiện ngày 07/11/2026, backup bắt đầu **11:12:15 UTC (18:12:15 giờ Việt Nam)**. Chỉ dùng Compose production, project `learning-production`, role `edu_user`, DB `edu`/schema `public` và volume `learning-production_uploads`.

- Backup ngoài repository: `/home/vuongpham/private-backups/edu/20261107-111215-UTC/`. Có `edu.dump` (custom format, no-owner/no-acl), `uploads.tar`, `manifest.json` chứa SHA-256/kích thước, `edu.dump.list`, snapshot container trước/sau và `deployment-check.json` ghi kết quả. Thư mục quyền `700`, các file `600`.
- Đã kiểm tra `pg_restore --list` đọc được dump, đọc được danh sách tar và xác nhận DB vẫn trống ngay trước backup. Chưa thử phục hồi lên một DB khác; không restore lên DB đang dùng. Archive này là trạng thái **trước migration**, không chứa các bảng vừa tạo.
- `prisma migrate deploy`: áp dụng thành công **9/9 migration**. `prisma migrate status` sau đó báo **Database schema is up to date**. Không chạy seed/demo/reset/db push, không tạo lại DB hoặc đổi role dùng chung.
- Preflight đầy đủ **PASS**: cấu hình production; SSO discovery, confidential client và API users/events; PostgreSQL 16/role hạn chế; 9 migration khớp checksum; quyền các bảng; ghi/đọc/xóa file kiểm tra trong private uploads bằng runtime user.
- Đối chiếu **18 container hiện có** trước/sau: cùng ID, `StartedAt`, `RestartCount` và trạng thái running; không có container báo unhealthy hoặc health starting. Không dừng/restart/tạo lại container khác, không sửa/reload nginx, không thay đổi mạng hay publish cổng host.

### Kết quả đồng bộ SSO và khởi chạy đã thực hiện

- Đã sửa `src/lib/sso-directory.ts`: phân trang đồng bộ từ 100 xuống **25 user/request** sau khi request trang lớn gặp timeout 5 giây. Giữ nguyên timeout chung và các kiểm tra pagination, định danh/xung đột, quyền truy cập. Dry-run thực tế đọc đủ 299 tài khoản; bản mới build/TypeScript/standalone trace và JS/CSS smoke đều PASS. Đã đọc hướng dẫn self-hosting của đúng Next.js trong image trước khi sửa code.
- Lần apply nhập **297 người**, bỏ qua **1 service account**, báo **1 xung đột email**: SSO ID **4** trùng email với SSO ID **295**. Bạn đã chọn **tạm bỏ qua ID 4 và tiếp tục**. Không sửa user/email trên SSO, không gộp local account. ID 4 chưa có tài khoản edu; xử lý email/định danh trên SSO rồi chạy đồng bộ lại có chủ đích. Dry-run không ghi DB và không dự đoán đầy đủ xung đột giữa các tài khoản khi apply.
- `nlhson`: role **ADMIN**, `active=true`, `ssoActive=true`, `appAccessGranted=true`. Các tài khoản khác cần admin cấp quyền edu theo nhu cầu; không tự cấp ADMIN hàng loạt.
- Hai image đã build lại chứa thay đổi phân trang; tag vận hành hiện dùng `learning-web:latest`/`learning-ops:latest` theo yêu cầu của bạn, trỏ tới cùng nội dung image đã kiểm tra. Chỉ chạy `docker compose --env-file .env.production -f docker-compose.production.yml up -d --no-build --wait --wait-timeout 180 edu-app email-worker`. Cả hai container **healthy**, không publish cổng host, web dùng `13081` trên mạng Docker.
- Nginx hiện có sẵn virtual host edu và upstream `edu-app:13081`; không chỉnh file hay reload proxy trong lượt khởi chạy này.
- HTTPS `edu.115.org.vn` đã qua kiểm tra chứng thư, trả 200 cho `/hocsocapcuu` trên **cả hai IP DNS `118.69.55.1` và `14.161.17.30`**. JS/CSS tải thành công; `/api/health/ready` và `/uploads/...` public trả 404 như thiết kế.
- `/login` chuyển tới route SSO; route này chuyển đúng `sso.115.org.vn/application/o/authorize/`, callback `https://edu.115.org.vn/api/auth/callback/authentik`, PKCE S256. Endpoint authorize của Authentik chấp nhận request (302). Đây là kiểm tra bắt đầu luồng, chưa thay thế đăng nhập tương tác bằng tài khoản thật.
- Preflight đầy đủ trên image mới **PASS** sau khởi động. Đối chiếu lại **18 container cũ**: ID, StartedAt, RestartCount và trạng thái running không đổi. Báo cáo riêng: `/home/vuongpham/private-backups/edu/20261107-111215-UTC/startup-check.json`.

**Việc còn cần nghiệm thu:** đăng nhập bằng `nlhson`, kiểm tra callback/logout/webhook, phân quyền tài khoản, gửi/nhận email có kiểm soát và luồng upload/đăng ký. Trước nhận đăng ký/thanh toán, vào `/settings` điền thông tin ngân hàng/người thụ hưởng thật như bước 9. Workspace đang có thay đổi source/config/docs chưa commit; lưu chúng thành commit phát hành để tái tạo đúng image, không stage env/backup/hồ sơ thật.

## 2. Lưu bí mật ngoài repository

Chốt/review đầy đủ mã nguồn, migration và docs vào commit/tag phát hành rồi checkout đúng phiên bản đó. Workspace chưa commit các tính năng mới thì clone từ Git chưa có những tính năng ấy; chọn các file source/docs/mẫu để stage, không thêm env/private data. Chỉ file mẫu `deploy/production.env.example` được đưa lên Git; giá trị trong đó là thông tin công khai và placeholder.

Tạo file thật **ngoài checkout**, không ghi đè file đã điền trước đó:

```bash
umask 077
EDU_ENV_DIR="$HOME/.config/edu"
EDU_ENV_FILE="$EDU_ENV_DIR/.env.production"
install -d -m 700 "$EDU_ENV_DIR"
if [ ! -e "$EDU_ENV_FILE" ]; then
  install -m 600 deploy/production.env.example "$EDU_ENV_FILE"
fi
chmod 600 "$EDU_ENV_FILE"
nano "$EDU_ENV_FILE"
```

Bảo đảm `$HOME/.config/edu` không nằm trong repository của bạn. Nếu có, chọn một thư mục riêng ngoài checkout. Chỉ quản trị viên được đọc file này hoặc dùng Docker. Không `source` file, không `cat`/chụp nội dung gửi chat/issue, không đưa mật khẩu/token trực tiếp vào lệnh hoặc lịch sử shell.

File mẫu đã có domain, Client ID, issuer, SMTP, host/port/mạng. Điền các bí mật sau bằng editor trên máy chủ:

- Mật khẩu thật của `edu_user` trong `DATABASE_URL` (tối thiểu 20 ký tự theo preflight); URL-encode ký tự đặc biệt trong mật khẩu, như `@` → `%40`, `#` → `%23`, `$` → `%24`.
- `SMTP_PASS`, `SSO_CLIENT_SECRET` của Confidential client edu.
- `SSO_API_TOKEN`: service account có quyền đọc toàn bộ human users và đọc events, không dùng Client Secret hay Bearer webhook thay cho token này.
- `SSO_WEBHOOK_SECRET`: đúng phần bí mật sau `Bearer ` trong header webhook đang cấu hình, ít nhất 32 ký tự. Không ghi tiền tố `Bearer ` vào biến.
- Hai khóa 64 hex **khác nhau**: `LOOKUP_OTP_SECRET` và `SSO_TOKEN_ENCRYPTION_KEY`.
- `RELEASE_TAG=latest`: tag cố định cho quy trình build/cập nhật trên máy; giữ nguyên khi đổi phiên bản package, ghi lại commit/image ID tương ứng để quay lại khi cần.

Kết nối mặc định của bản này:

```dotenv
PG_HOST=cap-cuu-115-db
PG_PORT=5432
DB_NETWORK=cap-cuu-115_private
PROXY_NETWORK=cap-cuu-115_private
DATABASE_URL=postgresql://edu_user:REPLACE_WITH_DB_PASSWORD@${PG_HOST}:${PG_PORT}/edu?schema=public
MIGRATION_DATABASE_URL=
```

`MIGRATION_DATABASE_URL` để trống nghĩa là dùng chính `edu_user` để tạo/cập nhật schema. Nếu DBA cấp một role DDL riêng, điền URL của role đó, vẫn trỏ đúng **edu**; chỉ ops nhận credential này. Bản mặc định không yêu cầu tạo thêm tài khoản `learning_owner` hoặc database khác.

Compose mở rộng `${PG_HOST}`/`${PG_PORT}` trong URL; không dùng `docker run --env-file` hoặc dotenv riêng thay thế luồng Compose này. Với các secret khác có `$`, có thể bao giá trị trong nháy đơn; riêng URL đang tham chiếu PG_HOST/PG_PORT cần giữ nội suy và URL-encode mật khẩu. Xem [Compose interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/).

Có thể tạo hai khóa trực tiếp vào file riêng, không in giá trị và không đổi khóa đã điền:

```bash
python3 - "$EDU_ENV_FILE" <<'PY'
from pathlib import Path
import secrets, sys
path = Path(sys.argv[1])
lines = path.read_text().splitlines()
for key in ("LOOKUP_OTP_SECRET", "SSO_TOKEN_ENCRYPTION_KEY"):
    for index, line in enumerate(lines):
        if line.startswith(key + "="):
            value = line.split("=", 1)[1].strip().strip("\"'")
            if not value or value.startswith("REPLACE_"):
                lines[index] = key + "=" + secrets.token_hex(32)
            break
    else:
        lines.append(key + "=" + secrets.token_hex(32))
path.write_text("\n".join(lines) + "\n")
path.chmod(0o600)
PY
```

## 3. Chọn đúng Compose và kiểm tra mạng

Trong cùng phiên terminal, khai báo hàm dùng xuyên suốt các bước:

```bash
prod() {
  docker compose --env-file "$EDU_ENV_FILE" \
    -f docker-compose.production.yml "$@"
}
prod config --quiet
docker network inspect cap-cuu-115_private --format '{{.Name}}'
```

Chỉ dùng `config --quiet`: `config`/`config --environment` đầy đủ hoặc `docker inspect ...Config.Env` có thể in cả bí mật. Không xuất/chia sẻ những nội dung đó. Kiểm tra bằng DBA/quản trị Docker rằng PostgreSQL có DNS `cap-cuu-115-db` và Nginx cùng ở mạng `cap-cuu-115_private`; không tạo một mạng rỗng cùng tên để vượt qua lỗi kết nối.

Nếu mở terminal mới, đặt lại `EDU_ENV_FILE="$HOME/.config/edu/.env.production"` và định nghĩa lại `prod`. Biến môi trường export sẵn trong shell có thể ghi đè file env: tránh dùng shell đang export cấu hình local.

## 4. Xác nhận quyền cho edu_user

DBA mở psql **vào database edu**, dùng tài khoản quản trị PostgreSQL đã có. Không đặt mật khẩu quản trị trong tài liệu/lệnh. Tên container PostgreSQL có thể khác DNS; chọn đúng container đang phục vụ `cap-cuu-115-db`:

```bash
PG_CONTAINER=cap-cuu-115-db
read -r -p "Tên quản trị PostgreSQL hiện có: " PG_ADMIN_USER
docker exec -it "$PG_CONTAINER" psql -U "$PG_ADMIN_USER" -d edu
```

Chạy trong psql:

```sql
SELECT current_database();
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole
FROM pg_roles WHERE rolname = 'edu_user';
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

GRANT CONNECT, CREATE ON DATABASE edu TO edu_user;
GRANT USAGE, CREATE ON SCHEMA public TO edu_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO edu_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO edu_user;
```

- `edu_user` cần LOGIN và mật khẩu đúng; không dùng superuser/CREATEDB/CREATEROLE cho ứng dụng. Nếu đang có các quyền toàn cục này, DBA điều chỉnh role riêng của edu trước khi chạy preflight.
- Với DB mới, quyền CREATE ở database/schema cho phép Prisma tạo object dưới `edu_user`; các object mới do chính role này sở hữu. GRANT không chuyển ownership của bảng đã có. Nếu schema đã có dữ liệu/phần mềm khác hoặc object thuộc role khác, dừng và kiểm tra lịch sử/ownership trước migration.
- Nếu dùng role DDL riêng, DBA phải cấp cho `edu_user` quyền sử dụng schema, CRUD các bảng, USAGE/SELECT sequences sau migration và default privileges cho object role DDL tạo sau này. Không cấp quyền sang các DB của ứng dụng khác.

Các lệnh quyền chỉ áp dụng DB/schema đã chỉ định; không đổi password, không tạo/xóa database. Tham khảo [PostgreSQL 16 GRANT](https://www.postgresql.org/docs/16/sql-grant.html).

## 5. Build và sao lưu trước migration

```bash
prod --profile tools build edu-app ops
prod run --rm ops ./node_modules/.bin/tsx scripts/check-production.ts --config-only
```

Bước config-only phải đạt sau khi điền bí mật. Nếu đây là nâng cấp bản đang chạy, đặt cửa sổ bảo trì và dừng **app/worker edu** trước khi lấy bộ backup nhất quán; không dừng PostgreSQL/Nginx dùng chung:

```bash
# Chỉ cần khi đã có bản edu đang phục vụ:
prod stop edu-app email-worker
```

Lưu bản dump **ngoài repo** bằng công cụ PostgreSQL 16 từ container hiện có. Cách bên dưới dùng kết nối Unix socket; nếu yêu cầu password, DBA dùng cơ chế credential riêng được bảo vệ, không ghi password lên dòng lệnh và không tiếp tục nếu dump lỗi.

```bash
EDU_BACKUP_DIR="$HOME/private-backups/edu/$(date +%Y%m%d-%H%M%S)"
install -d -m 700 "$EDU_BACKUP_DIR"
docker exec "$PG_CONTAINER" pg_dump -U edu_user -d edu \
  -Fc --no-owner --no-acl > "$EDU_BACKUP_DIR/edu.dump" &&
chmod 600 "$EDU_BACKUP_DIR/edu.dump" &&
docker exec -i "$PG_CONTAINER" pg_restore --list \
  < "$EDU_BACKUP_DIR/edu.dump" > /dev/null

prod run --rm --no-deps -T --entrypoint tar ops \
  -C /data/uploads -cf - . > "$EDU_BACKUP_DIR/uploads.tar" &&
chmod 600 "$EDU_BACKUP_DIR/uploads.tar"
```

`pg_restore --list` chỉ kiểm tra đọc được archive, không thay thế phục hồi thử. Nếu đã có dữ liệu, cần phục hồi DB/uploads vào môi trường tạm riêng và đối chiếu trước nâng cấp; không thử restore đè lên edu. Bản đầu tiên uploads có thể rỗng. Bảo vệ backup vì có thể chứa hồ sơ cá nhân; sao lưu định kỳ/mã hóa/giữ ngoài máy chủ sau khi vận hành.

## 6. Áp dụng migration và preflight

```bash
prod run --rm ops ./node_modules/.bin/prisma migrate status
prod run --rm ops ./node_modules/.bin/prisma migrate deploy
prod run --rm ops ./node_modules/.bin/prisma migrate status
prod run --rm ops
```

DB mới sẽ báo pending ở lần status đầu; chỉ tiếp tục khi đúng DB **edu** và lỗi chỉ là migration chưa áp dụng. Lỗi kết nối/quyền, schema không khớp hoặc migration thất bại phải được xử lý trước; không reset, db push, tự resolve/baseline để bỏ lỗi. Sau deploy, status phải đồng bộ; hiện có 11 migration trong repo, số thật phụ thuộc phiên bản checkout.

Preflight đầy đủ phải PASS: cấu hình, SSO discovery/client/API users-events, PostgreSQL 16, role, checksum migration, quyền bảng và ghi private uploads. Nếu role DDL khác edu_user, DBA cấp quyền runtime trước khi chạy preflight. Health/preflight không chứng minh email đã tới hộp thư hoặc mọi app đã logout thật.

## 7. Đồng bộ tài khoản SSO lần đầu

Provider edu cần Confidential client đúng Client ID/Secret, scope `openid profile email offline_access`, Subject mode Hashed user ID (hoặc User ID); các URL strict:

- Callback: `https://edu.115.org.vn/api/auth/callback/authentik`.
- Post-logout return: `https://edu.115.org.vn/da-dang-xuat`.
- Back-channel POST: `https://edu.115.org.vn/api/auth/backchannel-logout`.
- Webhook POST: `https://edu.115.org.vn/api/auth/webhook/authentik`, body chỉ `{"eventId":"<UUID>"}`, header `Authorization: Bearer <secret>` trùng biến riêng trên máy chủ.

Đặt **Invalidation Flow = default-invalidation-flow** có User Logout stage để logout edu kết thúc phiên SSO và các app tham gia SLO; default-provider-invalidation-flow chỉ thoát riêng provider. Các thiết bị có phiên SSO độc lập theo chính sách SSO. Xem [Authentik Single Logout](https://docs.goauthentik.io/add-secure-apps/providers/single-logout/).

```bash
# Chưa ghi dữ liệu:
prod run --rm ops ./node_modules/.bin/tsx scripts/sync-sso-users.ts
# Đồng bộ human users sau khi dry-run đúng:
prod run --rm ops ./node_modules/.bin/tsx scripts/sync-sso-users.ts --apply
```

Tài khoản **nlhson** phải tồn tại/active trong SSO; lần tạo qua đồng bộ được cấp ADMIN edu. Người mới khác chờ admin edu cấp quyền. Active edu = SSO active AND được cấp quyền edu. Đồng bộ giữ quyền đã phân, không sao chép mật khẩu và không tự nối local account/email trùng; nếu có conflicts, xử lý xung đột có chủ đích trước khi tiếp tục. Không chạy setup-admin, prisma seed hoặc demo:seed trên production.

## 8. Chạy app/worker và nối Nginx

```bash
prod up -d edu-app email-worker
prod ps
prod exec -T edu-app node -e "fetch('http://127.0.0.1:13081/api/health/live').then(r=>{console.log(r.status);process.exit(r.ok?0:1)})"
prod exec -T edu-app node -e "fetch('http://127.0.0.1:13081/api/health/ready').then(r=>{console.log(r.status);process.exit(r.ok?0:1)})"
```

App và worker phải healthy. Worker xử lý OTP học viên và retry, không phải hệ thống password nhân sự. Nếu worker báo lỗi, kiểm tra log riêng trên server, không chia sẻ nguyên log chứa dữ liệu.

Nginx hiện tại là container **`proxy`**, bind mount thư mục host **`/home/vuongpham/code/cap-cuu-115/nginx/conf` → `/etc/nginx/conf.d`**. File cần thêm là `/home/vuongpham/code/cap-cuu-115/nginx/conf/default.conf`; không thay toàn bộ nội dung vì file đang phục vụ nhiều domain khác. Đã xác nhận proxy và PostgreSQL cùng mạng `cap-cuu-115_private`, không cần `docker network connect` hay tạo mạng mới.

[Mẫu Nginx](../deploy/nginx.production.conf.example) là một đoạn **đầy đủ để nối cuối `default.conf`**, ngoài mọi `server {}`: gồm hai rate-limit zones ở `http` context, server HTTP redirect và server HTTPS riêng cho `edu.115.org.vn`, upstream `edu-app:13081`. Mẫu dùng đúng đường dẫn cert/key đang mount trong proxy:

```text
/etc/letsencrypt/live/_.115.org.vn/fullchain.crt
/etc/letsencrypt/live/_.115.org.vn/privatekey.key
```

Mẫu chặn `/uploads/` và `/api/health/` public, giữ Authorization/body cho webhook/back-channel, ghi đè forwarded headers và tắt access log của virtual host edu để tránh ghi query callback. App không mở port host. Nên nạp sau khi app healthy để truy cập được ngay; nếu host đã có server edu do người khác thêm sau lần kiểm tra, chỉnh block đó, không thêm lần nữa.

### Những chỗ cần thêm theo `default.conf` bạn cung cấp

1. Nối **toàn bộ** nội dung `deploy/nginx.production.conf.example` vào cuối file, ngay sau `### QLVC END ###` nếu bạn đã thêm marker kết thúc QLVC, hoặc sau dấu `}` cuối cùng của server `my.115.org.vn`. Hai dòng `limit_req_zone` phải ở ngoài mọi `server`/`location`; file `conf.d/*.conf` đã được include trong `http`, không bọc thêm `http {}`.
2. Giữ `upstream nextjs_upstream { server app:3000; }` cho hệ thống hiện có. Không thêm edu vào upstream này vì sẽ phân phối nhầm request của các website cũ sang LearningPage.
3. Compose production đã đổi **tên service `app` → `edu-app`**: Compose tự đăng ký tên service vào DNS mạng dùng chung, nên tên `app` cũ có thể trùng backend hiện tại. Chỉ đổi alias mà giữ tên service `app` không giải quyết được xung đột. Từ đây dùng `prod ... edu-app` theo các lệnh trong tài liệu. Nếu đã triển khai một bản edu cũ bằng service `app`, dừng riêng service đó bằng file Compose phiên bản cũ trước khi đổi; không dùng `--remove-orphans` hoặc xóa container của stack khác tùy tiện.
4. Nginx edu dùng cổng nội bộ `13081`, HTTP redirect về HTTPS, chứng thư wildcard hiện có, upload body 6 MiB (file ứng dụng tối đa 5 MiB), không cache, giới hạn `/search` và `/api/upload`, chặn uploads/health public. Các route SSO callback/webhook/back-channel đi qua `location /`; không thêm Basic Auth hay chặn POST cho các route này.
5. Không cần thêm edu vào CORS map của Directus: LearningPage hiện không dùng Directus. Không sửa các block SSO, QLVC, APPTEST hay `proxy_cache_path STATIC` để triển khai edu.
6. Ngoài Nginx: trỏ DNS edu về máy này; `APP_ORIGIN=https://edu.115.org.vn`; điền file production riêng theo bảng `.env` ở đầu tài liệu; xác nhận provider edu/callback trong Authentik, DB `edu` và SMTP. Nginx không cần biết password DB hay secret SSO.

Lưu ý từ nội dung bạn gửi: block QLVC đang chứa một giá trị `X-QLVC-Proxy-Key` thật đã được chia sẻ trong chat. Cần thay khóa qua quy trình của QLVC, đồng bộ cả backend QLVC và proxy; không sao chép giá trị này sang edu hoặc commit vào LearningPage. Lần điều chỉnh này không tự thay khóa hay cấu hình của QLVC.

Các lệnh sau dành cho bạn chạy sau khi review mẫu. Backup nằm ngoài `conf.d` để Nginx không vô tình load bản sao. Đoạn Bash kiểm tra marker/domain để tránh nạp lặp, chỉ reload khi `nginx -t` thành công; nếu kiểm tra lỗi, khôi phục file cũ, không reload:

```bash
(
  set -e
  NGINX_CONTAINER=proxy
  NGINX_CONF=/home/vuongpham/code/cap-cuu-115/nginx/conf/default.conf
  NGINX_BACKUP_DIR="$HOME/private-backups/nginx/$(date +%Y%m%d-%H%M%S)"
  install -d -m 700 "$NGINX_BACKUP_DIR"
  sudo test -f "$NGINX_CONF"
  if sudo grep -Eq 'BEGIN LEARNINGPAGE EDU|server_name[[:space:]][^;]*edu[.]115[.]org[.]vn' "$NGINX_CONF"; then
    echo 'Da co cau hinh edu; review/chinh block hien co, khong append lan nua.'
    exit 1
  fi
  sudo cp -p "$NGINX_CONF" "$NGINX_BACKUP_DIR/default.conf.before-edu"
  sudo tee -a "$NGINX_CONF" < deploy/nginx.production.conf.example > /dev/null
  if docker exec "$NGINX_CONTAINER" nginx -t; then
    docker exec "$NGINX_CONTAINER" nginx -s reload
  else
    sudo cp -p "$NGINX_BACKUP_DIR/default.conf.before-edu" "$NGINX_CONF"
    echo 'nginx -t loi; da khoi phuc file cu, chua reload.'
    exit 1
  fi
)
```

Không dùng `docker cp` để thay nguyên `default.conf`, không restart proxy. Mẫu edu mới dùng `resolver 127.0.0.11 valid=10s ipv6=off` và `proxy_pass $learning_edu_backend` để tự phân giải lại IP khi tạo lại container; không cần reload proxy chỉ vì đổi IP edu. Khi edu tắt/chưa chạy, request tới edu có thể trả 502, còn riêng block edu không làm `nginx -t` thất bại do không tìm thấy DNS edu. Các upstream tĩnh của domain khác vẫn cần khả dụng theo cấu hình hiện có. Nghiệm thu HTTPS edu và các domain cũ sau reload. Tham khảo [Nginx proxy_pass](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass) và [resolver](https://nginx.org/en/docs/http/ngx_http_core_module.html#resolver).

### Kiểm tra hiện tượng giật khi kiểm tra phiên người dùng

Đã rà soát `SsoSessionGuard`, endpoint `/api/auth/session` và `validSsoSession`. Trình duyệt poll mỗi **20 giây** khi tab hiển thị; server giữ lease xác minh SSO **30 giây**. Lease hết hạn mới gọi introspection và API user; không phải mọi request đều gọi SSO. Chu kỳ này và kiểm tra quyền ở server được giữ nguyên.

Đo nhẹ 3 lượt từ container: truy vấn DB phiên khoảng **1–12 ms**; introspection thử với token không hợp lệ khoảng **66–107 ms**; đọc user SSO khoảng **90–291 ms**, tổng hai API nối tiếp **156–360 ms**. Đây là đo các dependency, không phải benchmark trang quản trị với phiên đăng nhập thật. Tại thời điểm đo, container web edu khoảng 108.5 MiB RAM và CPU 0.01%, không thấy dấu hiệu quá tải riêng edu.

Đã tái hiện bằng Chromium cô lập: guard cũ gọi `cover()` cho mọi `focus`/`pageshow`, làm hiện màn che toàn trang dù phiên vẫn hợp lệ. Đã sửa:

- Focus cửa sổ đang hiển thị kiểm tra phiên nền, không đổi UI sang màn che trước mỗi request.
- Khi tab ẩn hoặc `pagehide`, che nội dung ngay; quay lại tab và BFCache phải kiểm tra xong mới bỏ màn che, không hiển thị dữ liệu cũ trong lúc chưa xác minh.
- Khi có 401, sự kiện logout từ BroadcastChannel hoặc lỗi kiểm tra, lập tức che/chặn tương tác; phiên thực sự hết hạn đi qua route dọn cookie rồi về trang đào tạo, không còn màn thông báo kết thúc phiên. Lỗi mạng/xác minh hiển thị nút thử lại.
- Giữ nguyên kiểm tra 20 giây/lease 30 giây, timeout, gộp request đang chạy, kiểm tra quyền và cơ chế thu hồi phiên phía server.

Đã thêm `tests/session-guard.browser.ts`, chạy bằng `pnpm test:session-guard` khi máy có Playwright Chromium (hoặc đặt `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` tới Chromium hệ thống). Fixture dùng component thật, API phiên giả và Chromium, không cần DB/SSO hoặc credential production. **9 ca PASS**: kiểm tra ban đầu, focus không chớp và gộp 20 sự kiện, trở lại tab, BFCache, 401, lỗi xác minh/thử lại, logout qua BroadcastChannel, poll nền, để yên 5 phút vẫn không khóa khi phiên hợp lệ. Bản cũ thất bại ca focus không chớp; bản sửa đạt cả 9 ca.

Thay đổi chỉ xử lý màn che kiểm tra phiên. Khi quay lại tab đã bị ẩn, màn che ngắn vẫn được giữ để xác minh trước khi hiện nội dung. Cần refresh trang một lần sau cập nhật để tải JavaScript guard mới.

Đã build/TypeScript/standalone smoke PASS và cập nhật riêng hai container edu sang image `latest` chứa bản sửa; cả hai healthy. Đã so sánh kín cấu hình runtime trước cập nhật: khóa phiên/OTP, issuer/client, DB và origin không đổi. HTTPS sau cập nhật: trang công khai 200, `/api/auth/session` không cookie trả 401 với `no-store`, health public 404. 18 container khác giữ nguyên ID/StartedAt/RestartCount/trạng thái. Không migrate DB hoặc sửa/reload nginx trong đợt sửa này. Đã giữ image trước sửa bằng tag rollback; báo cáo và tên tag tại `/home/vuongpham/private-backups/edu/20261107-111215-UTC/session-guard-check.json`. Chưa đo trình duyệt của người dùng đang đăng nhập thật; kiểm thử hồi quy dùng fixture cô lập, không lấy cookie/token phiên production.

### Bỏ màn kết thúc phiên và xử lý token 5 phút

Yêu cầu đã chốt: **không tự khóa do không thao tác 5 phút**. Code trước đây không có timer idle-lock; nguyên nhân mốc 5 phút là provider edu cấp access token `minutes=5`, còn phiên app lấy luôn hạn token làm `expiresAt`. Không tăng thời hạn access token của SSO.

Đã triển khai:

- Bỏ toàn bộ màn “Phiên làm việc đã kết thúc / Hãy đăng nhập lại qua SSO để tiếp tục / Đăng nhập qua SSO”. Route `/da-dang-xuat` vẫn là callback đã đăng ký với Authentik: tiêu thụ logout state, xóa cookie app rồi redirect thẳng `/hocsocapcuu`, không tự mở lại SSO trong lúc tab khác đang logout.
- Provider **edu, ID 10** đã được thêm mapping `offline_access`; giữ nguyên toàn bộ mapping cũ, secret, flow, thời hạn access token 5 phút và refresh token 30 ngày. Không sửa provider ứng dụng khác. Theo [tài liệu Authentik](https://docs.goauthentik.io/add-secure-apps/providers/oauth2/), refresh token cần được request và cho phép bằng scope này.
- Login xin `openid profile email offline_access`; callback chỉ tạo phiên mới khi nhận được refresh token hợp lệ. App có hạn phiên tuyệt đối **8 giờ**, không có timer khóa theo idle. Cần đăng nhập một lần sau cập nhật để nhận phiên mới có refresh token; không kéo dài/hồi sinh các phiên cũ đã hết hạn.
- Migration mới `20261107000200_sso_refresh_sessions` chỉ thêm hai cột nullable vào bảng `Session` của DB edu: `ssoAccessTokenExpiresAt`, `ssoRefreshToken`. Tổng cộng **10 migration**, checksum/preflight PASS. Không đổi khóa mã hóa, không sửa tài khoản hay các DB khác.
- Token gia hạn được mã hóa AES-GCM trong DB, không đưa ra trình duyệt/localStorage. Server gia hạn khi access token gần hết hạn, ghi nhận token rotation; dùng advisory lock theo phiên để tránh refresh trùng giữa process. Logout có thể xóa phiên ngay trong lúc refresh chờ mạng; các cập nhật `updateMany` không tạo lại phiên đã xóa. Refresh không gia hạn mốc tuyệt đối 8 giờ.
- Giữ kiểm tra trạng thái/quyền SSO, back-channel, webhook và fail-closed. Refresh bị từ chối, danh tính không khớp, SSO thu hồi phiên hoặc app hết hạn tuyệt đối đều không được bỏ qua. Để tab ẩn lâu rồi quay lại vẫn có bước xác minh ngắn trước khi hiện dữ liệu; đó không phải khóa idle 5 phút.

Tối ưu tiếp nhận/phản hồi:

- Sau callback đã xác thực grant/profile/quyền, dùng lease 30 giây cho lần render và poll đầu; bỏ một lượt introspection và một lượt directory lookup bị lặp. Luồng đăng nhập ấm trong fixture còn 1 code grant + 1 user-info + 1 directory request, không thêm introspection ngay sau đó (không tính discovery/JWKS khi khởi động lạnh).
- Khi cần xác minh lại, introspection và đọc user là hai request độc lập chạy song song. Request đến lệch nhịp đọc lại lease mới nhất, không gọi lại SSO chỉ vì đã giữ snapshot cũ. Các request cùng phiên đang kiểm tra được gộp lại; không bỏ qua xác minh/quyền.
- Kiểm thử HTTP thực qua app/HTTPS SSO giả và PostgreSQL riêng: **20 request phiên đồng thời, 20 phản hồi 200 trong 373 ms, chỉ 1 introspection + 1 directory lookup**. Đây là số đo fixture cô lập, không phải SLA hoặc tải tối đa của production.
- Kiểm thử SSO integration PASS: token 5 phút, phiên app 8 giờ, rotation mã hóa, 20 refresh checks gộp một, stale snapshot, refresh bị từ chối/đổi danh tính, hết hạn tuyệt đối, logout race, back-channel/webhook. **6 ca E2E Chromium** login/logout/phân quyền/burst PASS; **9 ca guard** gồm 5 phút idle vẫn mở PASS. Môi trường kiểm thử không dùng token/DB production; PostgreSQL tạm đã dừng và xóa tmpfs.

Backup trước migration và báo cáo triển khai tại `/home/vuongpham/private-backups/edu/20261107-121321-UTC-refresh/`: DB/uploads, checksum, scope edu trước/sau, tag image rollback, preflight và `refresh-verification.json`. Hai service edu healthy; HTTPS trang công khai 200, session không cookie 401, health public 404, logout return 307 về trang đào tạo. Authorization thật đã kiểm tra có `offline_access`, callback đúng và PKCE S256; chưa đăng nhập/gia hạn thay người dùng thật. **18 container khác không đổi ID/StartedAt/RestartCount/trạng thái; không sửa/reload nginx.**

### Phân quyền tùy chỉnh, không chọn nghiệp vụ và không khóa ô quyền

Theo yêu cầu mới, tạo vai trò chỉ nhập **Tên vai trò** và chọn các quyền; đã bỏ trường **Nghiệp vụ**. Không còn nhãn/giới hạn **Bảo vệ**, **Ngoài phạm vi**, **Luôn có**. Mọi quyền, kể cả quyền của vai trò **Quản trị**, đều được bật/tắt độc lập. Có **Chọn tất cả / Bỏ chọn tất cả**; không tự bật quyền phụ thuộc hoặc tự cấp quyền Tổng quan.

Phía server đọc đúng các quyền đã lưu, không tự loại quyền theo nhãn Quản lý lớp/Kế toán hay tự cho ADMIN toàn quyền bất kể thiết lập. Menu, trang quản trị, server actions, quyền xem CCCD/tài liệu, sửa hồ sơ, điểm danh, chứng từ và Excel đều dựa trên quyền cụ thể. Chỉ tài khoản có quyền quản lý tài khoản/phân quyền/cài đặt tương ứng mới được vào các chức năng đó. Quyền chưa cấp vẫn bị từ chối; vai trò rỗng không tự nhận lại quyền mặc định. Việc cấp/thu hồi có hiệu lực ở yêu cầu tiếp theo và vẫn kiểm tra lại trong transaction khi ghi.

Hai quyền tách rõ hành vi trước đây ẩn trong tên vai trò:

- **Truy cập tất cả lớp học** (`classes.all`): bật để truy cập mọi lớp; tắt để giới hạn ở các lớp được phân công. Phân công có thể chọn nhân sự đang hoạt động, không bắt buộc nhãn Quản lý lớp.
- **Xem thống kê truy cập toàn hệ thống** (`dashboard.analytics`): cho phép xem phần thống kê toàn hệ thống trên Tổng quan, không cấp tự động cho mọi người có quyền mở Tổng quan.

Các quyền xem và thao tác được chọn độc lập; nếu cần dùng thao tác trong một trang, chọn thêm quyền mở trang tương ứng. Vai trò chỉ được cấp quyền quản trị vẫn có thể vào thẳng trang quản trị tương ứng mà không bắt buộc có quyền Tổng quan. Quyền phân công lớp có giao diện riêng khi người dùng không được sửa các thông tin lớp khác.

Migration `20261107000300_configurable_permissions` bỏ constraint khóa policy ADMIN và chuyển quyền ngầm sang quyền lưu rõ ràng; tổng **11 migration**. Quyền/phạm vi đang dùng được giữ nguyên khi chuyển đổi: ADMIN ban đầu nhận đầy đủ 28 quyền như quyền toàn phần cũ; Kế toán và custom role cũ theo Kế toán được thêm `classes.all` để giữ phạm vi toàn hệ thống; các custom role cũ theo Quản lý lớp giữ phạm vi phân công. Version tăng ở các cấu hình đã thay đổi để draft cũ không ghi đè âm thầm. Không tự cấp quyền quản trị cho các vai trò còn lại. Trường `baseRole` cũ được giữ nội bộ để tương thích gán tài khoản, không còn là lựa chọn hay trần quyền của role mới.

Kiểm thử trên PostgreSQL tạm/Chromium, không dùng dữ liệu production: RBAC/migration giữ quyền cũ, ủy quyền quản trị, vai trò rỗng, từ chối giả mạo/khóa không xác định, cập nhật đồng thời/version và thu hồi quyền; account access, quản lý học viên/Excel, bảo mật, học viên, điểm danh, danh sách đăng ký và SSO đều PASS. **3 ca E2E phân quyền PASS**: chỉnh/lưu quyền ADMIN; tạo/gán role không nghiệp vụ; mọi checkbox có thể bật/tắt; chọn tất cả/xóa tất cả; role tùy chỉnh được cấp quyền quản trị dùng được menu và trang tương ứng. Các test nguồn và cấu hình Chromium đã được cập nhật theo quyền độc lập, không còn giả định tắt quyền xem sẽ tự tắt các quyền khác.

Đã triển khai riêng edu sau backup DB/uploads tại `/home/vuongpham/private-backups/edu/20261107-125010-UTC-permissions/`. Có `roles-before.json`/`roles-after.json` đối chiếu quyền/phạm vi thực tế, checksum archive, log migration/preflight, tag image rollback và `permissions-verification.json`. Migration/preflight PASS, cả web/worker healthy; admin hiện có vẫn đủ 28 quyền và mở được quản lý tài khoản/phân quyền/cài đặt theo dữ liệu quyền mới. HTTPS công khai 200; người chưa đăng nhập vào `/permissions` được chuyển tới đăng nhập. 18 container khác không đổi ID/StartedAt/RestartCount/trạng thái; không sửa/reload nginx. PostgreSQL kiểm thử riêng đã dừng. Tải lại trang Phân quyền để nhận UI mới; không cần đổi env hoặc khóa phiên.

### Cập nhật code với tag latest

`.env.production` dùng `RELEASE_TAG='latest'`. Sau khi cập nhật code trong checkout, nếu không có migration/schema mới, chạy từ repository:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml \
  up -d --build --wait --wait-timeout 180 edu-app email-worker
```

Lệnh build lại web và image operations mà worker dùng, rồi tạo lại riêng các container edu khi image/cấu hình đổi. Không dùng `docker compose restart` để lấy code mới: container hiện tại vẫn giữ image cũ. Không chạy Compose local mặc định hoặc dùng `--remove-orphans` cho quy trình cập nhật này. Không cần đổi tag theo version package và không cần reload nginx khi IP app đổi vì upstream edu dùng Docker DNS động.

Nếu code mới có migration, dùng quy trình backup ở bước 5; build trước, đặt bảo trì/dừng riêng edu nếu schema thay đổi cần tránh ghi đồng thời, rồi migrate/preflight trước khi mở ứng dụng theo bước 6. Các lệnh chính dùng hàm `prod` đã khai báo:

```bash
prod --profile tools build edu-app ops
prod run --rm ops ./node_modules/.bin/prisma migrate deploy
prod run --rm ops
prod up -d --no-build --wait --wait-timeout 180 edu-app email-worker
```

Tag `latest` sẽ bị ghi đè mỗi lần build; nó không cung cấp lịch sử rollback. Backup DB/uploads và commit/image ID giúp xác định bản cũ khi cần phục hồi.

## 9. Nghiệm thu trước khi mở sử dụng

- HTTPS/domain/redirect HTTP đúng; đăng nhập nlhson qua SSO. Tới **/settings** điền/lưu ngân hàng, người thụ hưởng và số tài khoản thật; không để thông tin mẫu trước khi nhận đăng ký/thanh toán.
- Cấp quyền một tài khoản đã đồng bộ; kiểm tra người chờ quyền không vào được, role/class scope đúng.
- Logout từ edu, SSO và app SLO khác; tab cũ/request mới bị chặn; webhook khóa/mở khóa user phản ánh đúng. Không coi flow SSO giả lập local là nghiệm thu provider thật.
- Kiểm tra một luồng đăng ký/OTP có kiểm soát, thư tới hộp thư, upload/download theo quyền và camera điện thoại qua HTTPS. Không chạy stress test production.
- Theo dõi DB/dung lượng/uploads, outbox FAILED, 5xx/SSO, hết hạn chứng thư và backup; thử phục hồi trên môi trường riêng.

Khi nâng cấp: lưu commit/tag và bộ DB/uploads backup, làm migration theo thứ tự, kiểm tra image cũ tương thích schema mới nếu cần rollback. Không xóa volume hoặc hạ schema/restore đè một cách tự động.

## 10. Kiểm tra trước khi đưa thay đổi lên Git

Chạy trong repository, không đọc/in giá trị secret:

```bash
git check-ignore .env .env.production backups/edu.dump secrets/credentials.key
git ls-files -- '.env' '.env.*' '.local/*' 'backups/*' 'secrets/*' '*.dump' '*.backup' '*.key' '*.pem' '*.p12' '*.pfx' '.pgpass' 'public/uploads/*'
git diff --cached --name-only
```

- Lệnh `git ls-files` không được liệt kê file bí mật/hồ sơ thật. Tài liệu này, Compose và `deploy/production.env.example` chỉ chứa thông tin công khai/placeholder và có thể commit. Xem lại thay đổi trước commit bằng công cụ nội bộ, không đăng nội dung riêng lên PR.
- `.gitignore`/`.dockerignore` đã loại `.env*`, `.local`, uploads riêng, backups/secrets và các đuôi dump/key. Không dùng `git add -f` cho chúng. File env thật và backup vẫn nên nằm ngoài checkout như hướng dẫn.
- Gitignore không gỡ file đã từng được Git theo dõi. Nếu phát hiện đã lộ secret, dừng phát hành/chia sẻ, thay hoặc thu hồi secret trước, xử lý tracking/lịch sử theo quy trình của repo; chỉ thêm ignore hoặc xóa file hiện tại không xóa bí mật khỏi commit cũ. Tham khảo [Git gitignore](https://git-scm.com/docs/gitignore).
- Quyền Docker có thể đọc môi trường container; chỉ cấp cho quản trị viên. Không chia sẻ `prod config` đầy đủ, inspect Env, file env hay dump.

Kiểm tra đã đạt trong lần rà soát: `docker compose config` với credential giả xác nhận ba service production, cổng `13081`, không publish host, mạng external và pool worker; `git diff --check` không báo lỗi. Mẫu Nginx đã qua `nginx -t` bằng image `nginx:stable-alpine` có sẵn, trong container tạm `--network none`, mount cấu hình/cert chỉ đọc, không khai báo DNS/hosts cho `edu-app`. Kiểm tra này xác nhận cú pháp và khả năng đọc cert/key, chưa chứng minh DNS/upstream thật, TLS hostname hay việc ghép với toàn bộ `default.conf`; vẫn phải chạy `nginx -t` trên proxy thật theo bước 8 sau khi app healthy.

Lần rà soát này đã đối chiếu source/cấu hình với container, cổng, mạng và mount Nginx thực tế trên máy. Đã build lại image sau điều chỉnh phân trang SSO, backup DB/uploads, áp dụng 11 migration (gồm refresh phiên và phân quyền tự do), đồng bộ tài khoản theo lựa chọn bỏ qua ID 4 và chạy web/worker healthy. Preflight và kiểm tra HTTPS/SSO redirect đã PASS. Không sửa/reload proxy hoặc restart các container cũ. Checkout chưa có `node_modules`; dependencies và tài liệu Next.js được đọc trong Docker. Còn cần nghiệm thu đăng nhập tương tác, logout/webhook, gửi email thực tế và nghiệp vụ trước sử dụng rộng rãi.
