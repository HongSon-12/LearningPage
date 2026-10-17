# 04. Kế hoạch SSO, danh tính, phiên và phân quyền

## 1. Hiện trạng cần phân biệt

Có hai nhóm ứng dụng:

### Nhóm A - Project đào tạo hiện tại
- đang có `User`/role/scope riêng;
- đăng nhập bằng bcrypt;
- phiên ngẫu nhiên lưu phía server, cookie HttpOnly;
- có thu hồi phiên khi khóa tài khoản;
- **không có NextAuth trong baseline hiện tại**.

### Nhóm B - Hai app Next.js khác
- đang dùng NextAuth v4 + JWT;
- tài liệu tích hợp NextAuth v4 đã được soạn riêng.

Không ép hai nhóm dùng cùng thư viện. Chuẩn hóa ở mức giao thức và mô hình:
- OIDC;
- `issuer + subject`;
- local app user;
- local authorization;
- revocable app session;
- logout/revocation.

## 2. Quyết định cho project đào tạo

**Không cài mới NextAuth v4.** Lý do:
- app chưa dùng NextAuth;
- v4 đang ở maintenance mode;
- Auth.js v5 hiện vẫn được tài liệu chính thức phát hành ở nhánh beta;
- chuyển auth library và SSO cùng lúc làm tăng rủi ro.

Đề xuất production hiện tại:
- Authentik làm IdP;
- dùng `openid-client` cho OIDC Authorization Code Flow + PKCE;
- giữ phiên tham chiếu phía server của ứng dụng;
- bọc toàn bộ qua `src/lib/auth` để sau này có thể thay library mà không đổi business code.

## 3. Mô hình danh tính

```text
Authentik User
    |
    | OIDC: iss + sub
    v
SsoIdentity
    |
    v
Local User
    |-- appAccess
    |-- role(s)
    |-- class assignments
    `-- business audit
```

Không link user bằng email thuần.

Schema tham khảo:
```prisma
model SsoIdentity {
  id        String   @id @default(uuid())
  issuer    String
  subject   String
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
  lastLoginAt DateTime?

  @@unique([issuer, subject])
  @@index([userId])
}
```

Nếu User hiện tại dùng kiểu ID khác thì giữ nguyên kiểu cũ.

## 4. Phiên ứng dụng

Giữ model session có khả năng thu hồi:
```text
AppSession
- id/sessionTokenHash
- userId
- identityId
- issuer
- subject
- ssoSid nullable
- createdAt
- lastSeenAt optional
- expiresAt absolute
- revokedAt
- revokeReason
```

Cookie chỉ chứa token ngẫu nhiên hoặc session id khó đoán:
- `Secure` production;
- `HttpOnly`;
- `SameSite=Lax` hoặc Strict tùy flow đã test;
- `Path=/`;
- không chứa role/CCCD/access token.

## 5. OIDC flow

### `/api/auth/sso/start`
1. tạo `state`;
2. tạo PKCE `code_verifier` + challenge S256;
3. tạo `nonce` nếu flow/library yêu cầu;
4. lưu state/verifier/nonce trong transient server state hoặc encrypted HttpOnly cookie ngắn hạn;
5. redirect tới Authentik.

### `/api/auth/sso/callback`
1. xác minh state/PKCE/nonce;
2. exchange authorization code;
3. xác minh issuer/subject qua thư viện;
4. tìm `SsoIdentity` bằng `(issuer, subject)`;
5. kiểm tra local User active/appAccess;
6. lấy role/scope từ DB local;
7. tạo AppSession;
8. set cookie;
9. redirect tới URL đã allowlist.

Không auto-provision chỉ vì email khớp.

## 6. Cấp user mới

Giai đoạn đầu dùng pre-provision:
1. tạo user ở Authentik;
2. add vào group ứng dụng phù hợp;
3. tạo/duyệt Local User;
4. link `issuer + subject`;
5. cấp role/phạm vi tối thiểu;
6. enroll MFA nếu policy yêu cầu;
7. login test.

JIT provisioning chỉ xem xét sau khi có quy tắc nguồn danh tính và quyền mặc định rõ ràng.

## 7. Authorization

SSO trả lời: **người này là ai**.  
App trả lời: **người này được làm gì với dữ liệu nào**.

Không lấy `isAdmin`, `classId`, `departmentId` từ request rồi tin trực tiếp.

Facade đề xuất:
```text
requirePrincipal()
requirePermission(principal, permission)
requireClassScope(principal, classId)
canViewRegistration(principal, registration)
canUpdatePayment(principal, registration)
```

Tất cả Server Actions, Route Handlers, Excel, upload/download đều gọi guard.

## 8. Login page sau SSO

`/login` trở thành:
- logo/tên hệ thống;
- nút “Đăng nhập bằng tài khoản Trung tâm”;
- mô tả tài khoản/mật khẩu được nhập tại SSO;
- thông báo lỗi chung;
- không có form mật khẩu local cho user thường.

Nếu giữ break-glass:
- chỉ 1-2 tài khoản;
- mật khẩu mạnh riêng;
- IP/VPN allowlist nếu có thể;
- không dùng hàng ngày;
- audit mỗi lần login;
- quy trình đổi mật khẩu định kỳ/niêm phong.

## 9. Logout phải tách 3 khái niệm

### Local logout
- revoke AppSession;
- xóa cookie app;
- không nhất thiết logout Authentik.

### SSO logout
- redirect theo `end_session_endpoint` đã discovery;
- `post_logout_redirect_uri` allowlist;
- không nhận `returnTo` tùy ý.

### Khóa tài khoản
- Authentik deactivation/group removal;
- local appAccess/isActive;
- revoke AppSession;
- nhận back-channel logout nếu cấu hình.

## 10. Back-channel logout

Endpoint:
```text
POST /api/sso/backchannel-logout
Content-Type: application/x-www-form-urlencoded
logout_token=...
```

Bắt buộc:
- chỉ nhận POST;
- giới hạn body;
- xác minh JWT bằng issuer/JWKS/audience cố định;
- kiểm tra `events`, `jti`, `iat`, `sid/sub`;
- chống replay bền vững;
- transaction lưu receipt + revoke session;
- không log raw token;
- lỗi DB/JWKS trả 503 để bên gửi có thể retry.

Không dùng ID token bình thường làm lệnh logout.

## 11. Mục tiêu thu hồi tập trung

Nếu yêu cầu “khóa user có hiệu lực trong <=5 phút”:
- bật back-channel;
- thêm đối soát quyền/active định kỳ khoảng 60 giây;
- local lease tối đa 5 phút;
- request admin nhạy cảm kiểm tra lease còn hiệu lực;
- hết lease mà không đối soát được: fail closed cho admin.

Public landing/register không phụ thuộc SSO, do đó SSO outage không nên làm website quảng bá/đăng ký công khai ngừng hoạt động.

## 12. MFA và reauthentication

MFA nên áp dụng tối thiểu cho:
- Quản trị;
- người có quyền phân quyền;
- người xuất dữ liệu nhạy cảm diện rộng.

Yêu cầu xác thực lại gần thời điểm thực hiện với:
- đổi quyền cao;
- link/unlink SSO identity;
- vô hiệu hóa user quản trị;
- hành động break-glass;
- thay cấu hình nhạy cảm.

## 13. Hai app NextAuth v4 khác

Giữ nguyên nguyên tắc tài liệu cũ:
- không upgrade v4 -> v5 trong cùng đợt SSO;
- dùng provider Authentik/OIDC;
- local `SsoIdentity` + AppSession/revocation;
- server guard không chỉ kiểm tra `session != null`;
- logout local khác global logout.

Sau khi SSO ổn định mới lập dự án riêng để đánh giá Auth.js v5 stable.

## 14. Cutover plan

1. Tạo client Authentik test.
2. Thêm schema identity/session cần thiết trên bản sao DB.
3. Tạo auth facade bao quanh cơ chế local hiện tại.
4. Viết OIDC start/callback trên nhánh riêng.
5. Pre-link 2-3 tài khoản test với đủ vai trò.
6. Test login, scope, revoke, logout, lock user.
7. Chạy song song local + SSO ở môi trường test.
8. Chuyển UI login sang SSO.
9. Giữ rollback flag trong một đợt ngắn.
10. Production client/secret riêng, không dùng lại test.
11. Sau ổn định mới tắt local login thường.

## 15. Test bắt buộc

- state sai bị từ chối;
- callback bị replay không tạo session mới;
- user SSO có nhưng chưa link local bị từ chối;
- local user inactive bị từ chối;
- role/scope local vẫn đúng;
- cookie cũ sau revoke bị từ chối;
- user bị khóa ở Authentik không tiếp tục dùng sau thời hạn cam kết;
- back-channel token sai issuer/aud/signature bị từ chối;
- back-channel replay idempotent;
- logout local không được mô tả sai thành global logout;
- SSO lỗi không làm public registration ngừng hoạt động.
