"use server";
import { requirePermission } from "@/lib/auth";
import { persistRolePolicy, persistCustomRole } from "@/lib/role-management";
import { rateLimit } from "@/lib/security";
import { errorMessage } from "@/lib/admissions";
import { revalidatePath } from "next/cache";
export async function saveRolePolicy(input: unknown) {
  try {
    const actor = await requirePermission("roles.manage");
    await rateLimit("role-policy", actor.id, 20, 60000);
    const result = await persistRolePolicy(actor, input);
    revalidatePath("/", "layout");
    return { success: true as const, ...result };
  } catch (error) { return { success: false as const, error: errorMessage(error) }; }
}

export async function saveCustomRole(input:unknown) {
  try {
    const actor=await requirePermission("roles.manage");
    await rateLimit("role-policy",actor.id,20,60000);
    const result=await persistCustomRole(actor,input);
    revalidatePath("/","layout");
    return {success:true as const,...result};
  }catch(error){return {success:false as const,error:errorMessage(error)};}
}
