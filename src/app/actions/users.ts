"use server";
import { requireUser } from "@/lib/auth";
import { errorMessage } from "@/lib/admissions";
import { revalidatePath } from "next/cache";
import { persistUser, persistManagerAssignment } from "@/lib/user-management";
import { rateLimit } from "@/lib/security";
import type { UserInput } from "@/lib/user-input";
export async function saveUser(form: FormData) {
  try {
    const actor = await requireUser(["ADMIN"]);
    await rateLimit("user-management", actor.id, 30, 60000);
    const result = await persistUser(actor, {
      id: String(form.get("id") || ""),
      username: String(form.get("username") || ""),
      password: String(form.get("password") || ""),
      role: String(form.get("role")) as UserInput["role"],
      active: form.get("active") === "on",
    });
    revalidatePath("/users");
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}
export async function assignManager(classId: string, managerId: string) {
  try {
    const actor = await requireUser(["ADMIN"]);
    await persistManagerAssignment(actor, classId, managerId);
    revalidatePath("/users");
    revalidatePath("/courses", "layout");
    return { success: true };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}
