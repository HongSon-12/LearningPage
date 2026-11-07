# Khởi tạo edu.115.org.vn trên máy chủ thật

Cập nhật 07/11/2026. Thực hiện trong Bash trên máy chủ Linux, từ thư mục repository `Learning`. Database và tài khoản PostgreSQL đã được tạo: **edu / edu_user**. Hướng dẫn không tạo lại PostgreSQL, database, user hoặc Nginx hiện có.

## 1. Thông tin triển khai

| Mục | Giá trị |
| --- | --- |
| Domain | https://edu.115.org.vn |
| PostgreSQL | 16-alpine, DNS `cap-cuu-115-db`, port `5432` |
| Database / user ứng dụng | `edu` / `edu_user` |
| DB_NETWORK / PROXY_NETWORK | `cap-cuu-115_private` / `cap-cuu-115_private` |
| Compose | `docker-compose.production.yml`, project `learning-production` |
| Nginx upstream | `http://edu-app:3000`, qua mạng Docker; app không publish port host |
| SSO | https://sso.115.org.vn/application/o/edu/ |
| SMTP | `pro66.emailserver.vn:465`, TLS, `edu@115.org.vn` |

Máy chủ cần Docker + Compose, Git, editor; Python 3 nếu dùng đoạn tạo khóa bên dưới. PostgreSQL/Nginx đã ở mạng nói trên và container app/ops có thể kết nối ra SSO/SMTP. Không dùng Compose local, `pnpm dev`, seed dữ liệu mẫu, `db push` hay `migrate reset` cho production. Dừng ở bước đang lỗi; không bỏ qua preflight để mở ứng dụng.

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
- `RELEASE_TAG`: nhãn bản phát hành; ghi lại commit tương ứng để quay lại khi cần.

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
prod --profile tools build app ops
prod run --rm ops ./node_modules/.bin/tsx scripts/check-production.ts --config-only
```

Bước config-only phải đạt sau khi điền bí mật. Nếu đây là nâng cấp bản đang chạy, đặt cửa sổ bảo trì và dừng **app/worker edu** trước khi lấy bộ backup nhất quán; không dừng PostgreSQL/Nginx dùng chung:

```bash
# Chỉ cần khi đã có bản edu đang phục vụ:
prod stop app email-worker
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

DB mới sẽ báo pending ở lần status đầu; chỉ tiếp tục khi đúng DB **edu** và lỗi chỉ là migration chưa áp dụng. Lỗi kết nối/quyền, schema không khớp hoặc migration thất bại phải được xử lý trước; không reset, db push, tự resolve/baseline để bỏ lỗi. Sau deploy, status phải đồng bộ; hiện có 9 migration trong repo, số thật phụ thuộc phiên bản checkout.

Preflight đầy đủ phải PASS: cấu hình, SSO discovery/client/API users-events, PostgreSQL 16, role, checksum migration, quyền bảng và ghi private uploads. Nếu role DDL khác edu_user, DBA cấp quyền runtime trước khi chạy preflight. Health/preflight không chứng minh email đã tới hộp thư hoặc mọi app đã logout thật.

## 7. Đồng bộ tài khoản SSO lần đầu

Provider edu cần Confidential client đúng Client ID/Secret, scope `openid profile email`, Subject mode Hashed user ID (hoặc User ID); các URL strict:

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
prod up -d app email-worker
prod ps
prod exec -T app node -e "fetch('http://127.0.0.1:3000/api/health/live').then(r=>{console.log(r.status);process.exit(r.ok?0:1)})"
prod exec -T app node -e "fetch('http://127.0.0.1:3000/api/health/ready').then(r=>{console.log(r.status);process.exit(r.ok?0:1)})"
```

App và worker phải healthy. Worker xử lý OTP học viên và retry, không phải hệ thống password nhân sự. Nếu worker báo lỗi, kiểm tra log riêng trên server, không chia sẻ nguyên log chứa dữ liệu.

Ghép [mẫu Nginx](../deploy/nginx.production.conf.example) vào server HTTPS đang có: upstream `edu-app:3000`; giữ chứng thư/domain, chặn `/uploads/` và `/api/health/` public, không cache nội dung riêng tư. Cho phép SSO POST webhook/back-channel, giữ Authorization/body và ghi đè các forwarded headers theo mẫu. Nginx phải ở PROXY_NETWORK; app không mở port host.

```bash
read -r -p "Tên container Nginx hiện có: " NGINX_CONTAINER
docker exec "$NGINX_CONTAINER" nginx -t &&
docker exec "$NGINX_CONTAINER" nginx -s reload
```

Chỉ reload sau khi app healthy; reload lại khi triển khai đổi IP container app. Tránh access log chứa query của callback/end-session, Authorization hoặc body webhook/token.

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

Hướng dẫn đã đối chiếu cấu hình/code và thử migration bằng role thường trên PostgreSQL 16 local. Kết nối DB/SSO/SMTP, chứng thư và tài khoản thật trên máy chủ vẫn do người triển khai nghiệm thu sau khi điền bí mật.
