"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getClasses() {
  try {
    const classes = await prisma.class.findMany({
      orderBy: { date: "asc" },
      include: {
        _count: {
          select: { 
            registrations: {
              where: {
                paymentStatus: { in: ["PENDING", "PAID"] }
              }
            } 
          },
        },
      },
    });
    return { success: true, data: classes };
  } catch (error) {
    console.error("Lỗi lấy danh sách lớp:", error);
    return { success: false, error: "Không thể lấy danh sách lớp" };
  }
}

export async function createClass(formData: FormData) {
  try {
    const code = formData.get("code") as string;
    const name = formData.get("name") as string;
    const date = new Date(formData.get("date") as string);
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const capacity = parseInt(formData.get("capacity") as string) || 40;

    await prisma.class.create({
      data: {
        code,
        name,
        date,
        startTime,
        endTime,
        capacity,
      },
    });

    revalidatePath("/admin/courses");
    return { success: true };
  } catch (error) {
    console.error("Lỗi tạo lớp học:", error);
    return { success: false, error: "Mã lớp học đã tồn tại hoặc có lỗi xảy ra" };
  }
}

export async function deleteClass(id: string) {
  try {
    // Kiem tra xem co the xoa khong, Prisma se bao loi neu co khoa ngoai
    await prisma.class.delete({
      where: { id },
    });
    revalidatePath("/admin/courses");
    return { success: true };
  } catch (error) {
    console.error("Lỗi xóa lớp học:", error);
    return { success: false, error: "Không thể xóa lớp học này vì đã có học viên đăng ký." };
  }
}

export async function updateClass(id: string, formData: FormData) {
  try {
    const code = formData.get("code") as string;
    const name = formData.get("name") as string;
    const date = new Date(formData.get("date") as string);
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const capacity = parseInt(formData.get("capacity") as string) || 40;

    await prisma.class.update({
      where: { id },
      data: {
        code,
        name,
        date,
        startTime,
        endTime,
        capacity,
      },
    });

    revalidatePath("/admin/courses");
    return { success: true };
  } catch (error) {
    console.error("Lỗi cập nhật lớp học:", error);
    return { success: false, error: "Mã lớp học đã tồn tại hoặc có lỗi xảy ra" };
  }
}
