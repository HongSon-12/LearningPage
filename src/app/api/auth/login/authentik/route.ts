import { NextResponse } from "next/server";
import { beginSsoLogin } from "@/lib/sso-browser";
import { ssoConfig } from "@/lib/sso-config";
import { ssoEnabled } from "@/lib/auth-mode";
import { ssoNoStore } from "@/lib/sso-http";
import { rateLimit, requestIdentity } from "@/lib/security";
export async function GET(request: Request) {
  if (!ssoEnabled()) return new Response(null, { status: 404 });
  try {
    await rateLimit("sso-login", requestIdentity(request.headers), 30, 60000);
    return NextResponse.redirect(await beginSsoLogin(), { headers: ssoNoStore });
  } catch { return NextResponse.redirect(new URL("/login?error=sso-unavailable", ssoConfig().origin), { headers: ssoNoStore }); }
}
