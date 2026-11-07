import { consumeSsoFlow } from "@/lib/sso-browser";
import { ssoNoStore } from "@/lib/sso-http";
export async function GET(request: Request) {
  const state = new URL(request.url).searchParams.get("state");
  if (state) { try { await consumeSsoFlow(state, "logout"); } catch { /* Generic page for an expired/invalid return state. */ } }
  return new Response(`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Phiên làm việc đã kết thúc</title><body style="margin:0;font-family:system-ui;background:#f8fafc;color:#0f172a"><main style="min-height:100dvh;display:grid;place-items:center;padding:0 24px"><section style="max-width:420px;border:1px solid #e2e8f0;border-radius:16px;background:white;padding:32px;text-align:center"><h1 style="font-size:24px">Phiên làm việc đã kết thúc</h1><p>Hãy đăng nhập lại qua SSO để tiếp tục.</p><p><a style="display:inline-block;padding:14px 20px;border-radius:8px;background:#2563eb;color:white;text-decoration:none" href="/api/auth/login/authentik">Đăng nhập qua SSO</a></p><a href="/hocsocapcuu">Về trang đào tạo</a></section></main></body></html>`, { headers: { ...ssoNoStore, "Content-Type": "text/html; charset=utf-8" } });
}
