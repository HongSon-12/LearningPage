"use server";
import { requireUser } from "@/lib/auth";
import { errorMessage } from "@/lib/admissions";
import { rateLimit } from "@/lib/security";
import {
  saveClassSession,
  setSessionClosed,
  findAttendanceCandidates,
  recordAttendance,
} from "@/lib/attendance";
import type { SessionInput } from "@/lib/session-input";
import { revalidatePath } from "next/cache";
export async function saveSession(
  classId: string,
  id: string | null,
  input: SessionInput,
) {
  try {
    const actor = await requireUser(["ADMIN", "CLASS_MANAGER"]);
    await rateLimit("session-save", actor.id, 60, 60000);
    await saveClassSession(actor, classId, id, input);
    revalidatePath(`/courses/${classId}/sessions`, "layout");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
export async function closeSession(sessionId: string, closed: boolean) {
  try {
    const actor = await requireUser(["ADMIN", "CLASS_MANAGER"]);
    const classId = await setSessionClosed(actor, sessionId, closed);
    revalidatePath(`/courses/${classId}/sessions`, "layout");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
export async function searchAttendance(
  sessionId: string,
  query: string,
  method: "QR" | "MANUAL",
) {
  try {
    const actor = await requireUser(["ADMIN", "CLASS_MANAGER"]);
    await rateLimit("attendance-search", actor.id, 120, 60000);
    return {
      success: true,
      data: await findAttendanceCandidates(actor, sessionId, query, method),
    };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
export async function confirmAttendance(
  sessionId: string,
  registrationId: string,
  present: boolean,
  method: "QR" | "MANUAL",
) {
  try {
    const actor = await requireUser(["ADMIN", "CLASS_MANAGER"]);
    await rateLimit("attendance-write", actor.id, 120, 60000);
    const classId = await recordAttendance(
      actor,
      sessionId,
      registrationId,
      present,
      method,
    );
    revalidatePath(`/courses/${classId}/sessions`, "layout");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
