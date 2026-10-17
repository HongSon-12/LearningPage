# 10. Thu hồi phiên, khóa tài khoản và đăng xuất toàn bộ

## 1. Ba thao tác phải phân biệt

| Thao tác | Mục đích | Cần tác động |
|---|---|---|
| Đăng xuất app | Rời một ứng dụng | Cookie + AppSession của app |
| Đăng xuất SSO/SLO | Kết thúc phiên SSO và thông báo các app | IdP + các RP có hỗ trợ |
| Khóa tài khoản | Ngăn người dùng tiếp tục sử dụng | Trạng thái SSO + app access + các phiên còn tồn tại |

Global logout của một phiên/trình duyệt không mặc nhiên là “đăng xuất tất cả thiết bị”.
Phải xác định phạm vi: phiên SSO hiện tại, mọi phiên của user hay toàn bộ quyền user.

Không đồng nhất `NextAuth.signOut()` với global logout.
Không đồng nhất access token hết hạn với AppSession hết hạn.

## 2. Baseline ở tài liệu 07 giải quyết được gì?

Mỗi request được bảo vệ kiểm tra `AppSession.revokedAt`, `expiresAt`, `User.isActive`, `User.appAccess`.
Do đó, khi cập nhật trạng thái **trong DB app**, request tiếp theo bị chặn theo code guard.

Nhưng nếu chỉ khóa ở SSO mà DB app không nhận được thay đổi, trạng thái app có thể còn hợp lệ.
Đây là giới hạn đã biết của baseline, không phải lỗi được sửa chỉ bằng `maxAge`.

Với app cần cam kết khóa tập trung tối đa 5 phút, bổ sung kênh thu hồi và đối soát trước production.

## 3. Thiết kế đề xuất: push + đối soát + thời hạn tuyệt đối

**Push:** SSO gửi back-channel, app xác minh rồi thu hồi.

**Đối soát trạng thái tài khoản:** dịch vụ quản trị đồng bộ active/group/app entitlement vào app với thời hạn độ mới.
Không thành công thì không kéo dài thời hạn bản ghi cũ.

**Giới hạn phiên:** app có absolute expiry; không để việc đọc session gia hạn vô hạn.

Mô hình độ mới đề xuất:
```text
Chu kỳ đối soát: 60 giây.
Lease trạng thái active/quyền app: tối đa 5 phút sau lần xác nhận thành công.
Mỗi request: kiểm tra lease còn hạn, allowed=true, user/app session còn hợp lệ.
Hết lease mà không xác nhận được: trả lỗi/đòi xác thực lại theo thiết kế, không mặc định cho qua.
```

Đây là mô hình kỹ thuật cần xây dựng, không phải một checkbox sẵn của NextAuth.
Một app kiểm tra trạng thái “user còn active” chưa đủ để biết phiên SSO cụ thể đã logout. Cam kết SLO khi mất thông báo còn cần đối soát phiên/tokens tương ứng hoặc cơ chế giao nhận sự kiện đáng tin cậy.

## 4. Bản ghi lease tham khảo

```text
SsoAccessLease:
  issuer
  subject
  clientId
  allowed
  observedAt
  validUntil
  revision/eventId
  source
```

Chỉ dịch vụ backend tin cậy được cập nhật.
Không lấy `allowed`, `validUntil` hoặc role từ trình duyệt.

Dịch vụ đối soát có thể tập trung, dùng API chính thức với quyền tối thiểu và gọi API quản trị của app có xác thực máy-máy.
Không dùng DB SSO như API, không cấp superuser token cho mọi app.
Nếu quyền SSO phụ thuộc nhiều policy hơn membership group, dịch vụ phải phản ánh đúng quy tắc đã chốt; không suy ra allowed chỉ từ một group khi còn điều kiện khác.

Ghi riêng thời gian phát hiện, gửi, nhận, xử lý và bị chặn để đo mục tiêu 5 phút.
Lúc không có cơ chế này, tài liệu vận hành phải ghi rõ mức bảo đảm thấp hơn và quy trình khóa thủ công trên cả hai app.

## 5. Thu hồi phía app

Ví dụ logic trong một **hàm quản trị phía server đã kiểm tra quyền**, không phải endpoint public:

```typescript
await prisma.$transaction([
  prisma.user.update({
    where: { id: targetUserId },
    data: { isActive: false },
  }),
  prisma.appSession.updateMany({
    where: { userId: targetUserId, revokedAt: null },
    data: {
      revokedAt: new Date(),
      revokeReason: "ADMIN_DISABLED",
    },
  }),
]);
```

Vẫn ghi audit riêng về người thực hiện, lý do, phiếu yêu cầu; không chỉ lưu chuỗi lý do trong session.
Không xóa user vì còn lịch sử nghiệp vụ.

## 6. Back-channel endpoint

Endpoint đề xuất:
```text
POST https://app-a.115.org.vn/api/sso/backchannel-logout
Content-Type: application/x-www-form-urlencoded

logout_token=<signed JWT>
```

Endpoint này:
- Không yêu cầu cookie trình duyệt.
- Không chuyển sang `/login`.
- Không dùng CSRF trình duyệt làm điều kiện nhận thông báo server.
- Xác thực bằng chữ ký và các claim của Logout Token.
- Có giới hạn kích thước, timeout, rate control phù hợp.
- Chỉ dùng issuer/JWKS/audience cố định trong cấu hình.
- Không tin `jku`, `x5u` hoặc issuer do request đưa vào để tự fetch khóa.

Không dùng access token hoặc ID token thông thường để gọi endpoint và coi như lệnh logout.

## 7. Mô-đun xác minh Logout Token

Đây là **mô-đun xác minh**, chưa phải endpoint hoàn chỉnh và chưa tạo bảng replay/transaction.
Dùng thư viện `jose` với phiên bản đã kiểm thử trong repo. Mẫu giả định provider ký RS256.

<!-- file: src/lib/verify-logout.ts -->
```typescript
import { createRemoteJWKSet, jwtVerify } from "jose";

export type LogoutNotice = {
  issuer: string;
  clientId: string;
  jti: string;
  issuedAt: number;
  subject?: string;
  sid?: string;
};

export function makeLogoutVerifier(config: {
  issuer: string;
  clientId: string;
  jwksUri: string;
}) {
  // Configuration is deployment-controlled, never taken from token headers/body.
  const jwksUrl = new URL(config.jwksUri);
  if (jwksUrl.protocol !== "https:") throw new Error("JWKS requires HTTPS");
  const keys = createRemoteJWKSet(jwksUrl);

  return async function verifyLogoutToken(raw: string): Promise<LogoutNotice> {
    if (Buffer.byteLength(raw, "utf8") > 16_384) throw new Error("Token too large");
    const { payload } = await jwtVerify(raw, keys, {
      issuer: config.issuer,
      audience: config.clientId,
      algorithms: ["RS256"],
      requiredClaims: ["iss", "aud", "iat", "jti"],
      maxTokenAge: "5m",
      clockTolerance: 30,
    });
    const eventName = "http://schemas.openid.net/event/backchannel-logout";
    const events = payload.events;
    if (!events || typeof events !== "object" || Array.isArray(events)) {
      throw new Error("Invalid logout events");
    }
    const event = (events as Record<string, unknown>)[eventName];
    if (!event || typeof event !== "object" || Array.isArray(event) ||
        Object.keys(event).length !== 0 || "nonce" in payload) {
      throw new Error("Not a logout token");
    }
    const sid = typeof payload.sid === "string" && payload.sid ? payload.sid : undefined;
    const subject = typeof payload.sub === "string" && payload.sub ? payload.sub : undefined;
    if ((!sid && !subject) || typeof payload.jti !== "string" ||
        !payload.jti || typeof payload.iat !== "number") {
      throw new Error("Missing logout identity");
    }
    return {
      issuer: config.issuer,
      clientId: config.clientId,
      jti: payload.jti,
      issuedAt: payload.iat,
      ...(sid ? { sid } : {}),
      ...(subject ? { subject } : {}),
    };
  };
}

```

`exp` không bị bắt buộc trong Logout Token theo mô hình này; `maxTokenAge` giới hạn theo `iat`. Nếu token có `exp`, thư viện vẫn kiểm tra.
Không tự lấy bộ giải mã JWT hiện có của app để đọc Logout Token; hai loại token có mục đích/khóa khác nhau.

## 8. Phần endpoint bắt buộc phải bổ sung

```text
1. Kiểm tra method, Content-Type, kích thước thực tế của body.
2. Parse đúng một logout_token.
3. Xác minh bằng mô-đun trên.
4. Trong cùng transaction:
   a. Kiểm tra (issuer, clientId, jti) đã xử lý chưa.
   b. Lưu receipt/tombstone nếu mới, kể cả chưa tìm được phiên.
   c. Thu hồi phiên khớp issuer + clientId + sid/sub.
5. Commit thành công mới trả HTTP 200.
6. Token hợp lệ được gửi lại: trả 200 idempotent.
7. DB/JWKS tạm lỗi: trả 503, không giả vờ đã xử lý.
8. Token sai: trả 400; không in raw token vào log.
```

Nếu token có cả `sid` và `sub`, phải khớp cả hai; không dùng OR để thu hồi sai đối tượng.
Nếu chỉ có `sub`, phạm vi rộng hơn: thu hồi các phiên tương ứng theo chính sách user.
Phải kiểm tra key rotation, đồng hồ và trường hợp JWKS không truy cập được.

### Chống race condition

Back-channel có thể tới trước khi callback login vừa tạo xong AppSession.
Chỉ `updateMany()` các phiên hiện có rồi quên sự kiện sẽ bỏ lọt phiên tạo muộn.

Cần lưu dấu thu hồi bền vững:
```text
issuer + clientId + sid/sub + issuedAt + jti
```
Khi tạo/kiểm tra AppSession, đối chiếu dấu này.
Nếu có `sid`, phiên mang `sid` đã thu hồi không được hồi sinh.
Nếu chỉ có `sub`, dùng `auth_time`/mốc xác thực đã xác minh để không làm sống lại phiên cũ hoặc khóa nhầm lần đăng nhập mới.
Thiếu dữ liệu để phân định thì yêu cầu xác thực mới/đối soát, không mặc định cho phép.
Hai request đồng thời phải được kiểm thử; cache RAM của một instance không đủ.

Mẫu tài liệu 07 chưa có tombstone, vì vậy không được công bố endpoint production chỉ với vài dòng update.

## 9. Đăng xuất toàn bộ do người dùng yêu cầu

Luồng đề xuất:
1. Người dùng nhấn nút rõ ràng “Đăng xuất SSO trên trình duyệt này”.
2. App nhận POST có chống CSRF, xác minh phiên hiện tại.
3. Lấy ID token hint đã được lưu **server-side** nếu sử dụng.
4. Tạo state dùng một lần và URL/POST theo end-session endpoint đã cấu hình.
5. Thu hồi phiên app và xóa cookie qua cơ chế của thư viện.
6. Trình duyệt được chuyển tới SSO; invalidation flow kết thúc phiên SSO.
7. SSO gửi logout tới các app.
8. App kiểm tra state khi quay về, hiển thị kết quả đúng mức đã xác nhận.

Nếu lưu ID token cho logout, dùng kho server được mã hóa/giới hạn quyền, không đưa vào session JSON cho frontend.
Không gửi access/refresh token qua URL.
`id_token_hint` là tham số giao thức logout; khi đi qua trình duyệt phải hạn chế log query/referrer và chỉ gửi đến endpoint đã tin cậy.

`post_logout_redirect_uri` phải thuộc allowlist cố định; không nhận `returnTo` tùy ý.
Không đặt endpoint thay đổi trạng thái chỉ bằng GET không có bảo vệ.

Mẫu cơ bản chưa lưu ID token hint và chưa có route này. Giao lập trình viên bổ sung theo quy trình, không giả lập global logout bằng link xóa cookie của app.

## 10. Xác thực lại cho việc nhạy cảm

Với đổi email, đổi phương thức xác thực, cấp quyền cao hoặc phê duyệt nhạy cảm:
- Yêu cầu authentication mới bằng tham số/policy OIDC phù hợp.
- Kiểm tra `auth_time` và phương thức/assurance đáp ứng yêu cầu đã chốt.
- `prompt=login` hoặc `max_age=0` cần được test với flow thực tế.
- Chỉ đặt thời hạn AppSession 8h không chứng minh mật khẩu/MFA vừa được nhập lại.

## 11. Khi SSO mất kết nối

Phải chọn trước:
- **Chặt:** hết lease thì từ chối, bảo đảm mục tiêu khóa nhưng có thể gián đoạn khi SSO lỗi.
- **Duy trì tạm:** tiếp tục phiên trong cửa sổ được duyệt, nhưng không còn bảo đảm thu hồi 5 phút.

Không tuyên bố đồng thời cả hai lợi ích mà không có cơ chế bổ sung.
Nghiệp vụ 24/7 cần phương án khẩn cấp và dự phòng, không tự bỏ xác thực.

## 12. Checklist bảo mật

- [ ] Logout Token giả/sai issuer/sai audience bị từ chối.
- [ ] ID token hợp lệ không được dùng làm Logout Token.
- [ ] Replay có xử lý idempotent bền vững.
- [ ] Receipt và thu hồi session được commit nguyên tử.
- [ ] Logout đến trước callback không làm sống lại session.
- [ ] Khóa user và xóa group chặn mọi API trong thời hạn đã cam kết.
- [ ] Mất mạng/back-channel lỗi có cảnh báo và đối soát.
- [ ] Cửa sổ mất kết nối được mô tả trung thực.

## Nguồn đối chiếu

[OIDC02 — OIDC Back-Channel Logout 1.0](https://openid.net/specs/openid-connect-backchannel-1_0.html) · [OIDC03 — OIDC RP-Initiated Logout 1.0](https://openid.net/specs/openid-connect-rpinitiated-1_0.html) · [AK14 — Front-channel và back-channel logout](https://docs.goauthentik.io/add-secure-apps/providers/oauth2/frontchannel_and_backchannel_logout/) · [AK15 — Single Logout và invalidation flow](https://docs.goauthentik.io/add-secure-apps/providers/single-logout/) · [NA03 — Callbacks NextAuth v4](https://next-auth.js.org/configuration/callbacks) · [JS01 — jose: thư viện xác minh JWT/JWKS](https://github.com/panva/jose)
