import { receiveBackchannelLogout } from "@/lib/sso-logout";
import { boundedSsoBody, ssoNoStore } from "@/lib/sso-http";
import { ssoEnabled } from "@/lib/auth-mode";
export async function POST(request: Request) {
  if (!ssoEnabled()) return new Response(null, { status: 404 });
  try {
    if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) throw Error();
    const form = new URLSearchParams(await boundedSsoBody(request));
    if (form.getAll("logout_token").length !== 1) throw Error();
    await receiveBackchannelLogout(form.get("logout_token")!);
    return new Response(null, { status: 200, headers: ssoNoStore });
  } catch { return Response.json({ error: "Yêu cầu đăng xuất không hợp lệ." }, { status: 400, headers: ssoNoStore }); }
}
