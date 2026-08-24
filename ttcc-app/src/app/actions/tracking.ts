"use server";

import prisma from "@/lib/prisma";

export async function trackEvent(sessionId: string, source: string | null, eventName: string) {
  try {
    const existing = await prisma.trackingEvent.findFirst({
      where: { sessionId, eventName }
    });

    if (!existing) {
      await prisma.trackingEvent.create({
        data: {
          sessionId,
          source: source || "direct",
          eventName,
        }
      });
    }
    return { success: true };
  } catch (error) {
    console.error("Lỗi tracking event:", error);
    return { success: false };
  }
}
