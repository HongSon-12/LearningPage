"use server";
import { requireUser } from "@/lib/auth";
import {
  queryStudentDirectory,
  type StudentDirectoryFilter,
} from "@/lib/student-directory";
import { errorMessage } from "@/lib/admissions";
import { rateLimit } from "@/lib/security";
export async function searchStudentDirectory(input: StudentDirectoryFilter) {
  try {
    const actor = await requireUser();
    await rateLimit("student-directory", actor.id, 120, 60000);
    return {
      success: true as const,
      data: await queryStudentDirectory(actor, input),
    };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}
