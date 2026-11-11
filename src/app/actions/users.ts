"use server";
import {ssoEnabled} from "@/lib/auth-mode";
import {persistSsoAccess} from "@/lib/sso-access";
import { requirePermission } from "@/lib/auth";
import { errorMessage } from "@/lib/admissions";
import { revalidatePath } from "next/cache";
import { persistUser, persistManagerAssignment } from "@/lib/user-management";
import { rateLimit } from "@/lib/security";
import type { UserInput } from "@/lib/user-input";
export async function saveUser(form: FormData) {
  try {
    const actor = await requirePermission("users.manage");
    await rateLimit("user-management", actor.id, 30, 60000);
    const result = ssoEnabled() ? await persistSsoAccess(actor, {
      id: String(form.get("id") || ""), role: form.get("role") ? String(form.get("role")) : null, customRoleId: String(form.get("customRoleId") || ""),
    }) : await persistUser(actor, {
      id: String(form.get("id") || ""),
      username: String(form.get("username") || ""),
      name: String(form.get("name") || ""),
      customRoleId: String(form.get("customRoleId") || ""),
      password: String(form.get("password") || ""),
      role: (form.get("role") ? String(form.get("role")) : null) as UserInput["role"],
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
    const actor = await requirePermission("classes.assign");
    await persistManagerAssignment(actor, classId, managerId);
    revalidatePath("/users");
    revalidatePath("/courses", "layout");
    return { success: true };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}
