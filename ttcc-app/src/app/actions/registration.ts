"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createRegistration(data: {
  classId: string;
  fullName: string;
  dob: Date;
  phone: string;
  email?: string;
  organization?: string;
  note?: string;
  sessionId?: string;
  source?: string;
}) {
  try {
    const classData = await prisma.class.findUnique({
      where: { id: data.classId },
      include: {
        _count: {
          select: {
            registrations: {
              where: { paymentStatus: { in: ["PENDING", "PAID"] } }
            }
          }
        }
      }
    });

    if (!classData) {
      return { success: false, error: "Lớp học không tồn tại." };
    }

    if (classData.status === "FULL" || classData.capacity - classData._count.registrations <= 0) {
      return { success: false, error: "Lớp học đã đủ số lượng, không thể đăng ký thêm." };
    }

    const reg = await prisma.registration.create({
      data: {
        classId: data.classId,
        fullName: data.fullName,
        dob: data.dob,
        phone: data.phone,
        email: data.email,
        organization: data.organization,
        note: data.note,
        sessionId: data.sessionId,
        source: data.source,
        paymentStatus: "PENDING",
      },
    });

    revalidatePath("/admin/courses");
    return { success: true, data: reg };
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    return { success: false, error: "Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại." };
  }
}
