"use server";

import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateSettings(formData: FormData) {
  try {
    await requireUser(["ADMIN"]);
    const bankName = formData.get("bankName") as string;
    const accountName = formData.get("accountName") as string;
    const accountNumber = formData.get("accountNumber") as string;
    const transferSyntax = formData.get("transferSyntax") as string;
    const googleAnalyticsId = formData.get("googleAnalyticsId") as string || null;
    const facebookPixelId = formData.get("facebookPixelId") as string || null;
    const microsoftClarityId = formData.get("microsoftClarityId") as string || null;

    const data = {
      bankName,
      accountName,
      accountNumber,
      transferSyntax,
      googleAnalyticsId,
      facebookPixelId,
      microsoftClarityId,
    };

    await prisma.setting.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });

    revalidatePath("/settings");
    revalidatePath("/register/[classId]", "page"); // Xóa cache trang đăng ký
    
    return { success: true };
  } catch (error) {
    console.error("Lỗi cập nhật cấu hình:", error);
    return { success: false, error: "Không thể lưu cấu hình. Vui lòng thử lại." };
  }
}
