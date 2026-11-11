import type { Prisma, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import {ssoEnabled} from "./auth-mode";
import { assertPermission, type Actor } from "./permissions";
import { isPermission, type PermissionKey } from "./permission-catalog";
import { RequestError } from "./security";
export async function rolePermissions(role: UserRole | null, tx: Prisma.TransactionClient = prisma, customRoleId?: string | null): Promise<PermissionKey[]> {
  if (!role) return [];
  if(customRoleId) {
    const custom=await tx.customRole.findUnique({where:{id:customRoleId},select:{baseRole:true,permissions:true}});
    if(!custom || custom.baseRole !== role) return [];
    return custom.permissions.filter((key):key is PermissionKey=>isPermission(key));
  }
  const policy = await tx.rolePolicy.findUnique({ where: { role }, select: { grants: { select: { permission: true } } } });
  // An absent or malformed policy does not restore a revoked default grant.
  return (policy?.grants ?? []).flatMap(({ permission }) => isPermission(permission) ? [permission] : []);
}
export async function freshActor(actor: Pick<Actor, "id">, tx: Prisma.TransactionClient = prisma): Promise<Actor & { permissions: PermissionKey[] }> {
  const user = await tx.user.findUnique({ where: { id: actor.id }, select: { id: true, username: true, name: true, role: true, active: true, customRoleId:true, ssoUserId:true, ssoActive:true, appAccessGranted:true, customRole:{select:{name:true,baseRole:true}} } });
  if (!user?.active || (ssoEnabled() && (!user.ssoUserId || !user.ssoActive || !user.appAccessGranted)) || (user.customRoleId && (!user.customRole || user.customRole.baseRole !== user.role || user.role === "ADMIN"))) throw new RequestError("Bạn không có quyền thực hiện thao tác này.", 403);
  return { id: user.id, username: user.username, name: user.name, role: user.role, customRoleId:user.customRoleId, roleName:user.customRole?.name, permissions: await rolePermissions(user.role, tx, user.customRoleId) };
}
export async function transactionPermission(tx: Prisma.TransactionClient, actor: Actor, permission: PermissionKey) {
  const current = await freshActor(actor, tx);
  assertPermission(current, permission);
  return current;
}
