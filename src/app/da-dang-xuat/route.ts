import { consumeSsoFlow } from "@/lib/sso-browser";
import { ssoNoStore } from "@/lib/sso-http";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ssoConfig } from "@/lib/sso-config";
export async function GET(request: Request) {
  const state = new URL(request.url).searchParams.get("state");
  if (state) { try { await consumeSsoFlow(state, "logout"); } catch { /* An invalid return state must not restart authentication. */ } }
  (await cookies()).delete("ttcc_session");
  // Do not immediately re-enter SSO: another tab may still be completing global logout.
  return NextResponse.redirect(new URL("/hocsocapcuu", ssoConfig().origin), { headers: ssoNoStore });
}
