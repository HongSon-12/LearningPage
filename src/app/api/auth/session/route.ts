import { currentUser } from "@/lib/auth";
import { ssoNoStore } from "@/lib/sso-http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await currentUser();
    return Response.json({ authenticated: Boolean(user) }, { status: user ? 200 : 401, headers: ssoNoStore });
  } catch { return Response.json({ authenticated: false }, { status: 503, headers: ssoNoStore }); }
}
