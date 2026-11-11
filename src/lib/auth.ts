import {RequestError} from "@/lib/errors";
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import {ssoEnabled} from "./auth-mode";
import {validSsoSession, sessionUserSelect} from "./sso-session";
import { freshActor } from "./rbac";
import { can, landingPath, type Actor } from "./permissions";
import type { PermissionKey } from "./permission-catalog";
export const sessionCookie = "ttcc_session";
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const currentUser = cache(async function currentUser() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({where: {tokenHash: digest(token)}, include: {user: {select: sessionUserSelect}}});
  if (!session || session.expiresAt <= new Date() || !session.user.active) return null;
  if (ssoEnabled() && !await validSsoSession(session)) return null;
  try { return await freshActor({id:session.userId}); } catch { return null; }
});
export {classScope, assertClassAccess} from "./permissions";
export type {Actor} from "./permissions";
export async function requireUser(roles?: UserRole[]) {
  const user = await currentUser();
  if (!user || (roles && (!user.role || !roles.includes(user.role)))) throw new RequestError("Bạn không có quyền thực hiện thao tác này.");
  return user;
}
export async function pageUser(roles?: UserRole[]) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (roles && (!user.role || !roles.includes(user.role))) redirect(landingPath(user));
  return user;
}

export async function requirePermission(permission: PermissionKey) {
  const actor = await requireUser();
  if (!can(actor, permission)) throw new RequestError("Bạn không có quyền thực hiện thao tác này.");
  return actor;
}
export async function pagePermission(permission: PermissionKey): Promise<Actor> {
  const actor = await pageUser();
  if (!can(actor, permission)) redirect(landingPath(actor));
  return actor;
}

export function assertPagePermission(actor: Actor, permission: PermissionKey) {
  if (!can(actor, permission)) redirect(landingPath(actor));
}
