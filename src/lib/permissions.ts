import {RequestError} from "@/lib/errors";
import type { UserRole } from "@prisma/client";
import { defaultRolePermissions, type PermissionKey } from "./permission-catalog";
export type Actor = { id: string; username: string; name?: string | null; role: UserRole | null; customRoleId?: string | null; roleName?: string; permissions?: readonly PermissionKey[] };
export function can(actor: Actor, permission: PermissionKey): boolean {
  if (!actor.role) return false;
  return (actor.permissions ?? defaultRolePermissions[actor.role]).includes(permission);
}
export function assertPermission(actor: Actor, permission: PermissionKey) {
  if (!can(actor, permission)) throw new RequestError("Bạn không có quyền thực hiện thao tác này.");
}
export function classScope(user: Actor) { return can(user, "classes.all") ? {} : { managerId: user.id }; }
export function assertClassAccess(user: Actor, course: { managerId: string | null }) {
  if (!can(user, "classes.all") && course.managerId !== user.id) throw new RequestError("Lớp không thuộc phạm vi được giao.");
}
export function landingPath(actor: Actor) {
  const routes: [PermissionKey, string][] = [["dashboard.view", "/"], ["registrations.view", "/registrations"], ["classes.view", "/courses"], ["students.view", "/students"], ["links.view", "/course-links"], ["users.manage", "/users"], ["roles.manage", "/permissions"], ["settings.manage", "/settings"]];
  return routes.find(([key]) => can(actor, key))?.[1] ?? "/access-denied";
}
