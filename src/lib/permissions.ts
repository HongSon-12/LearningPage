import {RequestError} from "@/lib/errors";
import type { UserRole } from "@prisma/client";
import { adminOnly, dependencies, defaultRolePermissions, type PermissionKey } from "./permission-catalog";
export type Actor = { id: string; username: string; role: UserRole; customRoleId?: string | null; roleName?: string; permissions?: readonly PermissionKey[] };
export function can(actor: Actor, permission: PermissionKey): boolean {
  if (actor.role === "ADMIN" || permission === "dashboard.view") return true;
  return !adminOnly(permission) && (actor.permissions ?? defaultRolePermissions[actor.role]).includes(permission) && dependencies(permission).every(key => can(actor, key));
}
export function assertPermission(actor: Actor, permission: PermissionKey) {
  if (!can(actor, permission)) throw new RequestError("Bạn không có quyền thực hiện thao tác này.");
}
export function classScope(user: Actor) { return user.role === "CLASS_MANAGER" ? { managerId: user.id } : {}; }
export function assertClassAccess(user: Actor, course: { managerId: string | null }) {
  if (user.role === "CLASS_MANAGER" && course.managerId !== user.id) throw new RequestError("Lớp không thuộc phạm vi được giao.");
}
export function landingPath(actor: Actor) {
  const routes: [PermissionKey, string][] = [["dashboard.view", "/"], ["registrations.view", "/registrations"], ["classes.view", "/courses"], ["students.view", "/students"], ["links.view", "/course-links"]];
  return routes.find(([key]) => can(actor, key))?.[1] ?? "/access-denied";
}
