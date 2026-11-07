"use server";
import { headers } from "next/headers";
import { persistTracking } from "@/lib/tracking";
import { requestIdentity } from "@/lib/security";
export async function trackEvent(sessionId: string, source: string | null, eventName: string) {
    try {
        return await persistTracking({ sessionId, source, eventName }, requestIdentity(await headers()));
    }
    catch {
        return { success: false as const };
    }
}
