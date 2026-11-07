import { z } from "zod";
import prisma from "./prisma";
import { rateLimit, RequestError } from "./security";
import { trackingEvents, trackingSources } from "./tracking-input";
const schema = z.object({ sessionId: z.uuid(), source: z.enum(trackingSources).nullable(), eventName: z.enum(trackingEvents) }).strict();
export async function persistTracking(input: unknown, identity: string) {
    const parsed = schema.safeParse(input);
    if (!parsed.success)
        throw new RequestError("Sự kiện không hợp lệ.");
    const { sessionId, source, eventName } = parsed.data;
    await rateLimit("tracking-ip", identity, 240, 60000);
    await rateLimit("tracking-session", sessionId, 60, 60000);
    return prisma.$transaction(async (tx) => {
        const key = `ttcc:${process.env.DATABASE_SCHEMA || "public"}:tracking:${sessionId}:${eventName}`;
        await tx.$queryRaw `SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${key}))`;
        const existing = await tx.trackingEvent.findFirst({ where: { sessionId, eventName }, select: { id: true } });
        if (!existing)
            await tx.trackingEvent.create({ data: { sessionId, source: source || "direct", eventName } });
        return { success: true as const };
    });
}
