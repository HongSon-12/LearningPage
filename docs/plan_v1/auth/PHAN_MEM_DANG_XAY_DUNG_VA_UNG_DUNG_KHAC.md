# 09. Ứng dụng đang xây dựng, ứng dụng mới và công nghệ khác

## 1. Đối với app Next.js đang xây dựng

Thiết kế SSO từ đầu nhưng vẫn tách người dùng nghiệp vụ khỏi danh tính bên ngoài.

Làm theo thứ tự:
1. Chốt User model, quyền, phạm vi dữ liệu.
2. Tạo client riêng trên SSO test.
3. Tạo bảng liên kết identity.
4. Tích hợp provider và server guard.
5. Thiết kế cấp tài khoản/cấp quyền.
6. Thêm phiên có thể thu hồi.
7. Thực hiện logout, reauthentication và kiểm thử.
8. Tạo client production khi chuẩn bị cắt chuyển.

Không xây thêm kho mật khẩu trong app mới nếu mọi người dùng đều thuộc SSO.
Không tạo một trang nhập mật khẩu rồi gọi API đăng nhập của authentik từ app.
Nút đăng nhập chuyển sang trang SSO là đúng mô hình.

## 2. Chọn thư viện cho app mới

Đối với hai app đang dùng NextAuth v4, giữ v4 trong lần chuyển đổi.
Đối với một repo hoàn toàn mới, đánh giá phiên bản thư viện còn được duy trì và phù hợp Next.js/Node tại thời điểm khởi tạo; không coi v4 là mặc định vĩnh viễn.

Giao ước OIDC, identity, session và phân quyền trong bộ này độc lập với thư viện.
Tạo lớp `auth` nội bộ để mã nghiệp vụ không phụ thuộc trực tiếp vào cấu trúc JWT của nhà cung cấp.

Không trộn ví dụ `auth()`/`AUTH_*` của phiên bản khác vào mã v4 dùng `getServerSession`/`NEXTAUTH_*`.

## 3. Cấu trúc code đề xuất

```text
src/lib/auth/
  config                 cấu hình provider, thông số bảo mật
  identity               đối chiếu issuer/subject → local user
  session                tạo/kiểm tra/thu hồi phiên
  authorization          kiểm tra quyền và phạm vi dữ liệu
  audit                  sự kiện có cấu trúc, không chứa token
  logout                 global logout/back-channel khi có
src/app/api/auth/         route thư viện
src/app/api/sso/          endpoint tích hợp đã xác minh
```

Không import chi tiết xác thực vào mọi file nghiệp vụ.
Mọi API gọi một lớp guard thống nhất; điều chỉnh logic thu hồi chỉ cần sửa một nơi.

## 4. Cấp người dùng mới

Phương án đề xuất cho giai đoạn đầu:
1. Quản trị tạo danh tính SSO.
2. Cấp group ứng dụng.
3. Tạo hồ sơ/người dùng nghiệp vụ từ danh sách đã duyệt.
4. Liên kết identity.
5. Cấp quyền tối thiểu.
6. Người dùng kích hoạt/enroll MFA và đăng nhập thử.

SSO có user mới không đồng nghĩa app tự tạo hồ sơ nhân sự hợp lệ.
JIT provisioning chỉ bật khi có quy tắc rõ: nguồn danh tính tin cậy, nhóm bắt buộc, mặc định không có quyền cao, xử lý trùng dữ liệu và kiểm toán.

## 5. Phần mềm không dùng Next.js

| Tình huống | Cách tích hợp |
|---|---|
| Web có backend hỗ trợ OIDC | Confidential client, code flow; thư viện OIDC của công nghệ đó |
| Phần mềm chỉ hỗ trợ SAML | Dùng SAML provider, metadata/certificate riêng; kiểm thử SLO |
| SPA thuần frontend | Public client + code/PKCE hoặc BFF; không nhúng client secret |
| Ứng dụng di động | Public client, PKCE, redirect/app link phù hợp |
| API máy-máy | Client riêng/service identity, audience/scope hẹp; không dùng tài khoản nhân viên |
| Phần mềm thương mại | Xác nhận SSO thuộc phiên bản/license nào và khả năng ánh xạ user |
| Phần mềm cũ không hỗ trợ giao thức | Đánh giá khả năng sửa hoặc proxy; không hứa tích hợp không cần đổi code |

Các hướng ngoài Next.js là tiêu chí thiết kế, không phải cấu hình cài hoàn chỉnh cho mọi sản phẩm.

## 6. Proxy bảo vệ ứng dụng cũ có thay được login không?

Proxy/outpost có thể chặn truy cập trước ứng dụng. Nhưng nếu app còn yêu cầu mật khẩu riêng, người dùng vẫn có thể phải đăng nhập lần hai.
Muốn header-based login:
- App phải hỗ trợ rõ.
- Chặn đường vào trực tiếp backend.
- Proxy xóa header do người dùng giả mạo rồi đặt lại.
- Dùng kết nối đáng tin cậy.
- App ánh xạ header vào người dùng/quyền, không auto-admin.

Không dùng proxy như bằng chứng đã thay toàn bộ cơ chế xác thực.
Không áp dụng hướng này cho app Next.js có thể tích hợp OIDC chuẩn mà không có lý do cụ thể.

## 7. API và dữ liệu giữa các app

SSO chỉ giải quyết danh tính; không tự làm A được phép gọi API B.

Một thiết kế API cần xác định:
```text
Resource/API audience:
Client được phép gọi:
User hay machine identity:
Scopes:
Loại token:
Cách xác minh:
TTL/thu hồi:
Nhật ký:
```

B không chấp nhận cookie JWT nội bộ của A.
API không chấp nhận ID token chỉ vì chữ ký hợp lệ.
Không lưu token vào URL, localStorage một cách mặc định hoặc log.
Khi chưa cần gọi API liên ứng dụng, không bật offline access/refresh token dài hạn.

## 8. Yêu cầu bàn giao cho nhà cung cấp

Yêu cầu nhà cung cấp mô tả:
- OIDC/SAML hỗ trợ, phiên bản và điều kiện license.
- Cách ánh xạ user hiện có, không mất dữ liệu.
- Callback/metadata, certificate rotation.
- Chặn user không được cấp quyền.
- Local logout, RP logout, back-channel/SAML SLO.
- Hành vi khi tài khoản khóa và SSO mất kết nối.
- Thời hạn phiên và khả năng thu hồi.
- Phân quyền nghiệp vụ riêng.
- Log và hướng dẫn khôi phục/quay lui.

Không nghiệm thu chỉ bằng việc thấy nút “SSO”.

## 9. Bộ hồ sơ một app mới

Dùng mẫu trong tài liệu 17; lưu theo app/môi trường.
Mỗi client có owner và người chịu trách nhiệm xử lý khi back-channel/secret/certificate lỗi.
Xóa hoặc vô hiệu hóa client không còn dùng sau khi kiểm tra các hệ thống phụ thuộc.

## Nguồn đối chiếu

[OIDC01 — OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html) · [NA01 — Provider authentik của NextAuth v4](https://next-auth.js.org/providers/authentik) · [NA05 — NextAuth v4: App Router và Pages Router](https://next-auth.js.org/configuration/initialization) · [AK10 — OIDC, issuer, endpoint và grant](https://docs.goauthentik.io/add-secure-apps/providers/oauth2/) · [AK11 — Tạo application/provider OIDC](https://docs.goauthentik.io/add-secure-apps/providers/oauth2/create-oauth2-provider/)
