import { z } from "zod";
import { validSsoWebhookAuthorization, processSsoWebhook } from "@/lib/sso-webhook";
import { boundedSsoBody, ssoNoStore } from "@/lib/sso-http";
import { ssoEnabled } from "@/lib/auth-mode";
export async function POST(request: Request) {
  if (!ssoEnabled()) return new Response(null, { status: 404 });
  if (!validSsoWebhookAuthorization(request.headers.get("authorization"))) return Response.json({ error: "Không được phép." }, { status: 401, headers: ssoNoStore });
  let eventId: string;
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw Error();
    eventId = z.object({ eventId: z.uuid() }).strict().parse(JSON.parse(await boundedSsoBody(request, 2048))).eventId;
  } catch { return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 400, headers: ssoNoStore }); }
  try { await processSsoWebhook(eventId); return Response.json({ success: true }, { headers: ssoNoStore }); }
  catch { console.error("SSO_WEBHOOK_RETRY_REQUIRED"); return Response.json({ error: "Chưa xử lý được. Vui lòng gửi lại." }, { status: 503, headers: { ...ssoNoStore, "Retry-After": "30" } }); }
}
