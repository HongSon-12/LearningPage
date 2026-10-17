"use server";

import prisma from "@/lib/prisma";

export async function searchRegistrations(query: string) {
  try {
    const q = query.trim();
    if (!q) return { success: false, error: "Vui lòng nhập từ khóa tìm kiếm" };

    const results = await prisma.registration.findMany({
      where: {
        OR: [
          { phone: q },
          { cccd: q },
          { invoiceCode: q },
          { certificateCode: q },
          { confirmationNumber: q }
        ]
      },
      select: {
        id:true, fullName:true, phone:true, cccd:true, status:true, paymentStatus:true, invoiceCode:true, certificateCode:true, confirmationNumber:true,
        certificateDeliveredDirect:true, certificateSentByPost:true, 
        class: {
          select: {
            name: true,
            code: true,
            courseType: true,
            certificateType: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: results };
  } catch (error) {
    console.error("Search error:", error);
    return { success: false, error: "Đã xảy ra lỗi khi tìm kiếm. Vui lòng thử lại sau." };
  }
}
