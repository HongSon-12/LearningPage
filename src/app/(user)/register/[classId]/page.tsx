import React from "react";
import prisma from "@/lib/prisma";
import RegistrationWizard from "./RegistrationWizard";
import { notFound } from "next/navigation";

export default async function RegisterPage({ params }: { params: Promise<{ classId: string }> }) {
  const resolvedParams = await params;
  const { classId } = resolvedParams;

  // Lấy thông tin lớp học
  const classData = await prisma.class.findUnique({
    where: { id: classId },
  });

  if (!classData || classData.status !== "OPEN") {
    return notFound();
  }

  // Lấy cấu hình ngân hàng
  let settings = await prisma.setting.findFirst();
  if (!settings) {
    settings = {
      id: 1,
      bankName: "Ngân hàng Thương mại Cổ phần Ngoại thương Việt Nam (Vietcombank)",
      accountName: "TRUNG TAM CAP CUU 115",
      accountNumber: "123456789",
      transferSyntax: "[Mã Lớp] [Họ Tên]",
      googleAnalyticsId: null,
      facebookPixelId: null,
      microsoftClarityId: null,
      updatedAt: new Date(),
    };
  }

  return (
    <div className="py-12 px-4 max-w-4xl mx-auto min-h-screen">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
          Đăng ký <span className="text-[var(--color-brand-600)]">Tham gia</span>
        </h1>
        <p className="text-gray-600 mt-3 font-medium">
          Vui lòng hoàn thành 3 bước dưới đây để giữ chỗ cho khóa học.
        </p>
      </div>

      <div className="glass-card bg-white p-6 md:p-10 rounded-3xl shadow-xl border border-gray-100">
        <RegistrationWizard classData={classData} bankSettings={settings} />
      </div>
    </div>
  );
}
