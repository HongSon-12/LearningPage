import React from "react";
import prisma from "@/lib/prisma";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  let settings = await prisma.setting.findUnique({
    where: { id: 1 },
  });

  if (!settings) {
    settings = {
      id: 1,
      bankName: "Ngân hàng Thương mại Cổ phần Ngoại thương Việt Nam (Vietcombank)",
      accountName: "TRUNG TAM CAP CUU 115",
      accountNumber: "123456789",
      transferSyntax: "[Mã Lớp] [Họ Tên]",
      updatedAt: new Date(),
    };
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Cấu hình Hệ thống</h1>
      </div>
      
      <p className="text-gray-600">
        Thay đổi thông tin tài khoản ngân hàng bên dưới. 
        Mã QR thanh toán (VietQR) trên trang đăng ký sẽ tự động thay đổi theo các thông số này.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8">
        <SettingsForm initialData={settings} />
      </div>
    </div>
  );
}
