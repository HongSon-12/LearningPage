import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import prisma from "./prisma";
import { ssoApi, directoryUserById, syncDirectoryUser, SsoNotFound } from "./sso-directory";
export function validSsoWebhookAuthorization(value: string | null) {
  const secret = process.env.SSO_WEBHOOK_SECRET;
  if (!secret || secret.length < 32 || !value || value.length > 1024) return false;
  const hash = (text: string) => createHash("sha256").update(text).digest();
  return timingSafeEqual(hash(value), hash(`Bearer ${secret}`));
}
export async function processSsoWebhook(eventId: string) {
  z.uuid().parse(eventId);
  const existing = await prisma.ssoWebhookEvent.findUnique({ where: { eventId } });
  if (existing?.processedAt) return;
  if (!existing) {
    try { await prisma.ssoWebhookEvent.create({ data: { eventId, leaseUntil: new Date(0) } }); }
    catch { if (!await prisma.ssoWebhookEvent.findUnique({ where: { eventId } })) throw Error("SSO_EVENT_STORAGE_UNAVAILABLE"); }
  }
  const claimed = await prisma.ssoWebhookEvent.updateMany({ where: { eventId, processedAt: null, leaseUntil: { lt: new Date() } }, data: { leaseUntil: new Date(Date.now() + 30000) } });
  if (!claimed.count) throw Error("SSO_EVENT_PROCESSING");
  try {
    const event = z.object({ pk: z.uuid(), action: z.string(), context: z.record(z.string(), z.unknown()) }).parse(await ssoApi(`events/events/${eventId}/`));
    if (event.pk !== eventId) throw Error("SSO_EVENT_INVALID");
    const model = z.object({ app: z.string(), model_name: z.string(), pk: z.union([z.string(), z.number().int()]) }).safeParse(event.context.model);
    // event.user is the ACTOR, never the account being changed.
    if (model.success && model.data.app === "authentik_core" && model.data.model_name === "user" && ["model_created", "model_updated", "model_deleted"].includes(event.action)) {
      const id = String(model.data.pk);
      try { await syncDirectoryUser(await directoryUserById(id)); }
      catch (error) {
        if (!(error instanceof SsoNotFound)) throw error;
        const user = await prisma.user.findUnique({ where: { ssoUserId: id } });
        if (user) await prisma.$transaction([prisma.user.update({ where: { id: user.id }, data: { ssoActive: false, active: false } }), prisma.session.deleteMany({ where: { userId: user.id } })]);
      }
    }
    await prisma.ssoWebhookEvent.update({ where: { eventId }, data: { processedAt: new Date() } });
  } catch (error) {
    await prisma.ssoWebhookEvent.updateMany({ where: { eventId, processedAt: null }, data: { leaseUntil: new Date(0) } });
    throw error;
  }
}
