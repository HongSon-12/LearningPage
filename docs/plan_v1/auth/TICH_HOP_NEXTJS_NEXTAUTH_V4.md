# 07. Tích hợp Next.js đang dùng NextAuth v4 và JWT

## 1. Đọc trước khi dùng mã mẫu

Mẫu này dùng OIDC trực tiếp, NextAuth v4, TypeScript, Prisma và DB riêng của ứng dụng.
Nó minh họa **một app thử nghiệm hoặc nhánh tích hợp**; không phải bản vá tự động cho hai repo chưa được cung cấp.

Mẫu hỗ trợ:
- Đăng nhập bằng provider authentik.
- Chỉ cho người dùng đã được liên kết và cấp quyền.
- Tạo bản ghi `AppSession` để thu hồi phía app.
- Hết hạn tuyệt đối ngoài thời hạn JWT.
- Kiểm tra API trên server.
- Đăng xuất cục bộ.

Mẫu **chưa tự cung cấp** global logout, đối soát tài khoản tập trung hay lease 5 phút. Đây là phần phải bổ sung theo tài liệu 10 trước khi nhận cam kết thu hồi tập trung.

Nếu app đang có PrismaAdapter, Account/Session model hoặc Credentials provider, không xóa chúng bằng cách thay toàn bộ file. Đọc tài liệu 08 để hợp nhất cấu hình.

## 2. Khảo sát repo

Ghi nhận:
```text
Next.js version:
NextAuth v4 exact version:
App Router / Pages Router:
Node version:
Prisma version và cách khởi tạo client:
Vị trí authOptions:
Vị trí route NextAuth:
Có adapter hay không:
Nguồn tài khoản hiện tại:
Các API đang kiểm tra quyền:
Tên cookie/custom JWT hiện có:
```

Dùng package manager hiện có, giữ lockfile. Ví dụ dự án pnpm:

```bash
pnpm list next next-auth @prisma/client --depth 0
pnpm exec tsc --noEmit
```

Không dùng `pnpm add next-auth@latest` trong đợt tích hợp SSO vì có thể thay nhánh đang dùng.
Đánh giá bản vá v4 riêng trên nhánh thử nghiệm.
Mã mẫu dùng marker package `server-only`; xác nhận dependency này có trong dự án.
Nếu chưa có, thêm bằng package manager hiện hữu (`pnpm add server-only` với dự án pnpm),
kiểm tra phiên bản được chấp nhận và lưu lockfile.
Module verifier ở tài liệu 10 cần dependency `jose` trực tiếp, phiên bản tương thích runtime/ESM của repo; không dựa vào dependency bắc cầu.

## 3. Biến môi trường của App A

<!-- file: app.env.example -->
```dotenv
NEXTAUTH_URL=https://app-a.115.org.vn
NEXTAUTH_SECRET=CHANGE_ME_RANDOM_SECRET_FOR_APP_A
AUTHENTIK_ID=CHANGE_ME_CLIENT_ID_A
AUTHENTIK_SECRET=CHANGE_ME_CLIENT_SECRET_A

OIDC_DISCOVERY_URL=https://sso.115.org.vn/application/o/app-a/.well-known/openid-configuration
OIDC_ISSUER=https://sso.115.org.vn/application/o/app-a/
OIDC_JWKS_URI=CHANGE_ME_COPY_FROM_DISCOVERY
OIDC_END_SESSION_ENDPOINT=CHANGE_ME_COPY_FROM_DISCOVERY

```

Thay cả JWKS/end-session bằng giá trị discovery, không lấy đường dẫn từ app khác.
Secret ứng dụng sinh ngẫu nhiên, đủ mạnh và **riêng cho từng app**.
Không thêm `NEXT_PUBLIC_` cho bất kỳ secret hoặc token server nào.
Trong Docker, nạp vào môi trường runtime của container ứng dụng; không bake secret vào Dockerfile.

`OIDC_ISSUER` mẫu có slash cuối vì chế độ per-provider thường trả như vậy.
Dùng giá trị discovery thực tế, không dùng một hàm trim để “sửa lỗi”.

## 4. Mở rộng mô hình dữ liệu

Dưới đây là schema tham khảo. Nếu User hiện hữu đã có nhiều trường/quan hệ, chỉ thêm trường cần thiết.
Không tạo một bảng User mới để thay bảng có dữ liệu.
Mẫu dùng User ID dạng chuỗi. Khi repo đang dùng Int/UUID/native type khác, giữ nguyên kiểu cũ và
điều chỉnh mọi khóa ngoại/callback/guard tương ứng; không đổi User ID chỉ để giống ví dụ.

<!-- file: schema.prisma.fragment -->
```prisma
// Merge into the existing schema. Do not replace the project's full schema.
model User {
  id         String        @id @default(cuid())
  name       String?
  email      String?
  isActive   Boolean       @default(true)
  appAccess  Boolean       @default(false)
  identities SsoIdentity[]
  sessions   AppSession[]
}

model SsoIdentity {
  id       String       @id @default(cuid())
  issuer   String
  subject  String
  userId   String
  user     User         @relation(fields: [userId], references: [id])
  sessions AppSession[]

  @@unique([issuer, subject])
  @@index([userId])
}

model AppSession {
  id          String       @id @default(uuid())
  userId      String
  identityId  String
  issuer      String
  subject     String
  clientId    String
  ssoSid      String?
  createdAt   DateTime     @default(now())
  expiresAt   DateTime
  revokedAt   DateTime?
  revokeReason String?

  user        User         @relation(fields: [userId], references: [id])
  identity    SsoIdentity  @relation(fields: [identityId], references: [id])

  @@index([userId, revokedAt])
  @@index([issuer, clientId, ssoSid])
  @@index([issuer, clientId, subject])
  @@index([expiresAt])
}

```

`appAccess=false` là mặc định từ chối của thiết kế.
Không bật true hàng loạt trước khi xác nhận nhóm người được phép sử dụng.
Dữ liệu quyền khoa/phòng, vai trò duyệt... vẫn nằm trong schema nghiệp vụ hiện có.

Migration thử ở bản sao DB, xem SQL rồi mới áp dụng production.
Với Prisma 7, giữ cơ chế config/driver adapter/generator của repo; bộ này không yêu cầu đổi về cấu hình Prisma cũ.
Dùng Prisma Client đã hoạt động tại `@/lib/prisma`.

Trước lần login đầu, quản trị tạo/duyệt `SsoIdentity` liên kết với User hiện hữu. Xem tài liệu 08.

## 5. Bổ sung kiểu TypeScript

Tạo `src/types/next-auth.d.ts` và bảo đảm tsconfig include:

<!-- file: src/types/next-auth.d.ts -->
```typescript
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
    appSessionId?: string;
    absoluteExpiresAt?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    localUserId?: string;
    appSessionId?: string;
    absoluteExpiresAt?: number;
  }
}

```

## 6. Cấu hình provider và callbacks

Tạo/hợp nhất vào `src/lib/auth-options.ts`:

<!-- file: src/lib/auth-options.ts -->
```typescript
import "server-only";
import { randomUUID } from "node:crypto";
import type { Account, NextAuthOptions } from "next-auth";
import AuthentikProvider from "next-auth/providers/authentik";
import { prisma } from "@/lib/prisma";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith("CHANGE_ME")) {
    throw new Error(`Missing configuration: ${name}`);
  }
  return value;
}

const issuer = required("OIDC_ISSUER");
const discovery = required("OIDC_DISCOVERY_URL");
const clientId = required("AUTHENTIK_ID");
const lifetimeSeconds = 8 * 60 * 60;

type IdentityClaims = { issuer: string; subject: string; sid?: string };

function getClaims(profile: unknown, account: Account | null): IdentityClaims {
  if (!account || account.provider !== "authentik" || !profile ||
      typeof profile !== "object") {
    throw new Error("Invalid SSO identity");
  }
  const p = profile as Record<string, unknown>;
  if (p.iss !== issuer || typeof p.sub !== "string" || p.sub.length === 0 ||
      p.sub !== account.providerAccountId) {
    throw new Error("Invalid SSO identity");
  }
  // The provider uses idToken:true, so this profile comes from the ID token
  // already validated by NextAuth/openid-client. This is NOT a raw jwt.decode.
  return {
    issuer,
    subject: p.sub,
    ...(typeof p.sid === "string" ? { sid: p.sid } : {}),
  };
}

async function findAllowedIdentity(claims: IdentityClaims) {
  const identity = await prisma.ssoIdentity.findUnique({
    where: { issuer_subject: { issuer: claims.issuer, subject: claims.subject } },
    include: { user: true },
  });
  if (!identity || !identity.user.isActive || !identity.user.appAccess) {
    return null;
  }
  return identity;
}

export const authOptions: NextAuthOptions = {
  secret: required("NEXTAUTH_SECRET"),
  debug: false,
  session: { strategy: "jwt", maxAge: lifetimeSeconds },
  pages: { signIn: "/login" },
  providers: [
    AuthentikProvider({
      clientId,
      clientSecret: required("AUTHENTIK_SECRET"),
      issuer,
      // Explicit discovery avoids ambiguity about the final slash of issuer.
      wellKnown: discovery,
      idToken: true,
      checks: ["pkce", "state", "nonce"],
      authorization: { params: { scope: "openid profile email" } },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      try {
        const claims = getClaims(profile, account);
        return Boolean(await findAllowedIdentity(claims));
      } catch {
        console.error("SSO_SIGNIN_REJECTED");
        return false;
      }
    },
    async jwt({ token, account, profile }) {
      if (account) {
        const claims = getClaims(profile, account);
        // Repeat the check at session creation; do not trust a browser-supplied ID.
        const identity = await findAllowedIdentity(claims);
        if (!identity) throw new Error("SSO access denied");

        const expiresAt = new Date(Date.now() + lifetimeSeconds * 1000);
        const row = await prisma.appSession.create({
          data: {
            id: randomUUID(),
            userId: identity.userId,
            identityId: identity.id,
            issuer: claims.issuer,
            subject: claims.subject,
            clientId,
            ssoSid: claims.sid,
            expiresAt,
          },
        });
        // Keep this token minimal; no IdP access/refresh token or CCCD.
        return {
          sub: identity.userId,
          name: identity.user.name,
          email: identity.user.email,
          localUserId: identity.userId,
          appSessionId: row.id,
          absoluteExpiresAt: Math.floor(expiresAt.getTime() / 1000),
        };
      }
      // Never accept localUserId/appSessionId from useSession().update() input.
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: typeof token.localUserId === "string" ? token.localUserId : "",
        name: session.user?.name ?? null,
        email: session.user?.email ?? null,
        image: null,
      };
      session.appSessionId =
        typeof token.appSessionId === "string" ? token.appSessionId : undefined;
      session.absoluteExpiresAt =
        typeof token.absoluteExpiresAt === "number" ? token.absoluteExpiresAt : undefined;
      return session;
    },
  },
  events: {
    async signOut(message) {
      if ("token" in message &&
          typeof message.token?.appSessionId === "string") {
        await prisma.appSession.updateMany({
          where: { id: message.token.appSessionId, revokedAt: null },
          data: { revokedAt: new Date(), revokeReason: "LOCAL_SIGNOUT" },
        });
      }
    },
  },
  logger: {
    error(code) { console.error("NEXTAUTH_ERROR", code); },
    warn(code) { console.warn("NEXTAUTH_WARN", code); },
    debug() {},
  },
};

```

Điểm quan trọng:
- `idToken: true` để profile xuất phát từ ID token đã qua kiểm tra của thư viện.
- `issuer` và `wellKnown` tách rõ.
- `signIn` không tự tạo người dùng từ email.
- `AppSession.expiresAt` được đặt khi tạo, không kéo dài theo mỗi lần gọi session.
- `session()` trả ID phiên không phải quyền truy cập độc lập; server vẫn phải kiểm tra cookie và DB.
- `events.signOut` thu hồi bản ghi app, không kết thúc phiên tại authentik.

Không thêm `allowDangerousEmailAccountLinking: true` để né lỗi ghép tài khoản.
Không dùng `jwt.decode` để thay cho xác minh chữ ký.
Không trả access token, refresh token, ID token vào `/api/auth/session`.

## 7. Đăng ký route NextAuth

### App Router

Tạo `src/app/api/auth/[...nextauth]/route.ts`:

<!-- file: src/app/api/auth/[...nextauth]/route.ts -->
```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const runtime = "nodejs";
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### Pages Router

Dùng **thay cho route App Router**, không tạo hai route trùng URL:

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

export default NextAuth(authOptions);
```

Đặt tại `pages/api/auth/[...nextauth].ts` hoặc `src/pages/...` theo repo.

## 8. Nút đăng nhập

Ví dụ `src/app/login/page.tsx`:

<!-- file: src/app/login/page.tsx -->
```tsx
"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <main>
      <h1>Đăng nhập bằng tài khoản Trung tâm</h1>
      <p>Tài khoản và mật khẩu được nhập tại hệ thống SSO.</p>
      <button onClick={() => signIn("authentik", { callbackUrl: "/" })}>
        Đăng nhập
      </button>
    </main>
  );
}
```

Đích `callbackUrl` phải cùng origin/allowlist đã duyệt, không lấy tùy ý từ query.
Giao diện thật cần thông báo lỗi dễ hiểu, không in profile hoặc token để debug.

Nếu dùng `useSession`, đặt SessionProvider theo kiến trúc hiện có. `signIn()` riêng không buộc viết lại toàn bộ layout.

## 9. Guard bắt buộc trên server

Tạo `src/lib/authz.ts`:

<!-- file: src/lib/authz.ts -->
```typescript
import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export class AuthError extends Error {
  constructor(public readonly status: 401 | 403, message: string) {
    super(message);
  }
}

export async function requirePrincipal() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.appSessionId) {
    throw new AuthError(401, "Authentication required");
  }

  const row = await prisma.appSession.findUnique({
    where: { id: session.appSessionId },
    include: { user: true },
  });

  if (!row || row.userId !== session.user.id || row.revokedAt ||
      row.expiresAt.getTime() <= Date.now() ||
      row.issuer !== process.env.OIDC_ISSUER ||
      row.clientId !== process.env.AUTHENTIK_ID) {
    throw new AuthError(401, "Session is no longer valid");
  }
  if (!row.user.isActive || !row.user.appAccess) {
    throw new AuthError(403, "Access denied");
  }

  // Production with a <=5-minute central revocation target must also verify
  // a fresh SSO access-state lease here. See document 10.
  return { userId: row.userId, appSessionId: row.id };
}

```

Không dùng `if (session)` như điều kiện đủ. JWT cũ có thể vẫn giải mã được sau khi bản ghi phiên đã thu hồi.
Không coi dữ liệu `/api/auth/session` là bằng chứng quyền đang còn hiệu lực.

`requirePrincipal()` ở trên dùng App Router/server context.
Với Pages API, lấy phiên bằng `getServerSession(req, res, authOptions)` rồi chạy cùng kiểm tra DB; không copy nguyên lời gọi không có `req/res` vào môi trường không hỗ trợ.

## 10. Ví dụ API được bảo vệ

`src/app/api/me/route.ts`:

<!-- file: src/app/api/me/route.ts -->
```typescript
import { NextResponse } from "next/server";
import { AuthError, requirePrincipal } from "@/lib/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const principal = await requirePrincipal();
    return NextResponse.json(
      { userId: principal.userId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN" },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("AUTHORIZATION_SERVICE_UNAVAILABLE");
    return NextResponse.json(
      { error: "SERVICE_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

```

Đây chỉ là xác thực/cấp quyền vào app.
Khi đọc hồ sơ:
1. Lấy principal từ server.
2. Tra vai trò/phạm vi khoa/phòng hiện tại.
3. Thêm điều kiện phạm vi vào truy vấn DB.
4. Kiểm tra lại trước thao tác cập nhật/duyệt.
5. Không lấy `userId`, `departmentId`, `isAdmin` từ request rồi tin trực tiếp.

Server Actions, API export, upload, tải file, GraphQL và các đường dẫn cũ đều phải được bảo vệ.
WebSocket/stream dài cần kiểm tra lại định kỳ hoặc đóng khi phiên bị thu hồi.

## 11. Middleware và cache

Middleware chỉ hỗ trợ điều hướng, không thay server guard.
Không import Prisma/authOptions có DB vào Edge middleware không tương thích.
Không để middleware bảo vệ `/api/auth/*`, `/login` hoặc back-channel theo cách tạo vòng lặp.

Không cache public trang/API chứa dữ liệu theo người dùng.
`force-dynamic`/`no-store` trong ví dụ là chủ ý; vẫn rà CDN/reverse proxy thực tế.

## 12. Đăng xuất cục bộ

Dùng `signOut()` của NextAuth để giữ luồng POST/CSRF tiêu chuẩn:
```tsx
"use client";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/login" })}>
      Đăng xuất ứng dụng
    </button>
  );
}
```

Sau đó bấm đăng nhập có thể vào lại không hỏi mật khẩu vì phiên SSO còn tồn tại. Đây không phải lỗi.
Trên máy dùng chung cần nút/luồng “Đăng xuất toàn bộ” theo tài liệu 10.

## 13. Điều kiện chuyển từ mẫu sang production

- Hợp nhất với User/adapter/callback thật, không mất dữ liệu.
- Toàn bộ API có server guard và phân quyền nghiệp vụ.
- Chống CSRF cho thao tác thay đổi dữ liệu; NextAuth không tự bảo vệ mọi API tùy viết.
- Có thu hồi tập trung và đối soát nếu cam kết 5 phút.
- Xử lý đồng thời login/logout, retry, replay theo tài liệu 10.
- Kiểm thử cookie cũ, JWT cũ, tài khoản bị khóa và DB mất kết nối.
- Mã đã build/test trong đúng repo, đúng phiên bản Node/Next.js/Prisma.

## Nguồn đối chiếu

[NA01 — Provider authentik của NextAuth v4](https://next-auth.js.org/providers/authentik) · [NA02 — Mã provider authentik, nhánh v4](https://raw.githubusercontent.com/nextauthjs/next-auth/v4/packages/next-auth/src/providers/authentik.ts) · [NA03 — Callbacks NextAuth v4](https://next-auth.js.org/configuration/callbacks) · [NA04 — Options, cookies và JWT NextAuth v4](https://next-auth.js.org/configuration/options) · [NA05 — NextAuth v4: App Router và Pages Router](https://next-auth.js.org/configuration/initialization) · [NA06 — Kiểm tra phiên trên Next.js server](https://next-auth.js.org/configuration/nextjs) · [OIDC01 — OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
