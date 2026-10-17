"use server";
import { randomBytes } from "node:crypto";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { digest, sessionCookie } from "@/lib/auth";
export async function login(form: FormData) {
  const username = String(form.get("username") || "").trim();
  const password = String(form.get("password") || "");
  if (!username || username.length > 100 || password.length > 200) return {success: false, error: "Thông tin đăng nhập không hợp lệ."};
  const key = digest(username.toLowerCase());
  const attempt = await prisma.loginAttempt.findUnique({where: {key}});
  if (attempt?.blockedUntil && attempt.blockedUntil > new Date()) return {success: false, error: "Đăng nhập sai nhiều lần. Vui lòng thử lại sau 15 phút."};
  const user = await prisma.user.findUnique({where: {username}});
  const valid = await compare(password, user?.passwordHash || "$2b$12$mNXjqDfQFxURhhFGaECr2uEqYnNyxJNVlA4R9spUBRiXu49cb/i0q");
  if (!user?.active || !valid) {
    const row = await prisma.loginAttempt.upsert({where: {key}, create: {key, failures: 1}, update: {failures: {increment: 1}}});
    if (row.failures >= 5) await prisma.loginAttempt.update({where: {key}, data: {failures: 0, blockedUntil: new Date(Date.now()+15*60*1000)}});
    return {success: false, error: "Tên đăng nhập hoặc mật khẩu không đúng."};
  }
  await prisma.loginAttempt.deleteMany({where: {key}});
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now()+8*60*60*1000);
  await prisma.session.create({data: {tokenHash: digest(token), userId: user.id, expiresAt}});
  (await cookies()).set(sessionCookie, token, {httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", expires: expiresAt, path: "/"});
  return {success: true};
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get(sessionCookie)?.value;
  if (token) await prisma.session.deleteMany({where: {tokenHash: digest(token)}});
  jar.delete(sessionCookie);
  redirect("/login");
}
