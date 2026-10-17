import "server-only";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
export const sessionCookie = "ttcc_session";
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export async function currentUser() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({where: {tokenHash: digest(token)}, include: {user: true}});
  if (!session || session.expiresAt <= new Date() || !session.user.active) return null;
  const {id, username, role} = session.user;
  return {id, username, role};
}
export {classScope, assertClassAccess} from "./permissions";
export type {Actor} from "./permissions";
export async function requireUser(roles: UserRole[] = ["ADMIN", "CLASS_MANAGER", "ACCOUNTANT"]) {
  const user = await currentUser();
  if (!user || !roles.includes(user.role)) throw new Error("Bạn không có quyền thực hiện thao tác này.");
  return user;
}
export async function pageUser(roles: UserRole[] = ["ADMIN", "CLASS_MANAGER", "ACCOUNTANT"]) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect("/registrations");
  return user;
}
