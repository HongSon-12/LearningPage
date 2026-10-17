"use server";
import { hash } from "bcryptjs";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { errorMessage } from "@/lib/admissions";
import { revalidatePath } from "next/cache";
export async function saveUser(form: FormData) {
  try {
    const actor = await requireUser(["ADMIN"]);
    const id = String(form.get("id") || ""); const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || ""); const role = String(form.get("role")) as UserRole;
    const active = form.get("active") === "on";
    if (!/^[a-zA-Z0-9_.-]{3,60}$/.test(username) || !Object.values(UserRole).includes(role)) throw new Error("Tên đăng nhập hoặc vai trò không hợp lệ.");
    if ((!id || password) && (password.length < 10 || password.length > 72)) throw new Error("Mật khẩu cần từ 10 đến 72 ký tự.");
    if (id === actor.id && (!active || role !== "ADMIN")) throw new Error("Không thể tự khóa hoặc hạ quyền tài khoản đang sử dụng.");
    const passwordHash = password ? await hash(password, 12) : undefined;
    if (id) {await prisma.user.update({where: {id}, data: {username, role, active, ...(passwordHash ? {passwordHash} : {})}}); await prisma.session.deleteMany({where: {userId: id}});}
    else await prisma.user.create({data: {username, role, active, passwordHash: passwordHash!}});
    revalidatePath("/users"); return {success: true};
  } catch(error) {return {success: false, error: errorMessage(error)};}
}
export async function assignManager(classId: string, managerId: string) {
  try {
    await requireUser(["ADMIN"]);
    if (managerId) {const manager = await prisma.user.findUnique({where: {id: managerId}}); if (!manager?.active || manager.role !== "CLASS_MANAGER") throw new Error("Tài khoản quản lý không hợp lệ.");}
    await prisma.class.update({where: {id: classId}, data: {managerId: managerId || null}});
    revalidatePath("/users"); return {success: true};
  } catch(error) {return {success: false, error: errorMessage(error)};}
}
