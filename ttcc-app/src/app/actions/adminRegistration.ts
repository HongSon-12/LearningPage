"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getRegistrations() {
  try {
    const registrations = await prisma.registration.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        class: true, // Lấy luôn thông tin lớp học
      },
    });
    return { success: true, data: registrations };
  } catch (error) {
    console.error("Lỗi lấy danh sách đăng ký:", error);
    return { success: false, error: "Không thể lấy danh sách đăng ký" };
  }
}

export async function updatePaymentStatus(id: string, newStatus: "PENDING" | "PAID" | "CANCELLED") {
  try {
    await prisma.registration.update({
      where: { id },
      data: { paymentStatus: newStatus },
    });
    revalidatePath("/admin/registrations");
    return { success: true };
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái thanh toán:", error);
    return { success: false, error: "Không thể cập nhật trạng thái" };
  }
}

export async function deleteRegistration(id: string) {
  try {
    await prisma.registration.delete({
      where: { id },
    });
    revalidatePath("/admin/registrations");
    return { success: true };
  } catch (error) {
    console.error("Lỗi xóa đăng ký:", error);
    return { success: false, error: "Không thể xóa lượt đăng ký này" };
  }
}
