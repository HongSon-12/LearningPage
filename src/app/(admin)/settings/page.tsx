import { pageUser } from "@/lib/auth";
import { Settings } from "lucide-react";
import { PageHeader } from "../components/AdminUI";
import prisma from "@/lib/prisma";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await pageUser(["ADMIN"]);
  let settings = await prisma.setting.findUnique({
    where: { id: 1 },
  });

  if (!settings) {
    settings = {
      id: 1,
      bankName: "Ngân hàng Thương mại Cổ phần Ngoại thương Việt Nam (Vietcombank)",
      accountName: "TRUNG TAM CAP CUU 115",
      accountNumber: "123456789",
      transferSyntax: "{CLASS_CODE} {NAME}",
      googleAnalyticsId: null,
      facebookPixelId: null,
      microsoftClarityId: null,
      updatedAt: new Date(),
    };
  }

  return <div className="w-full min-w-0 space-y-4"><PageHeader title="Cấu hình hệ thống" description="Quản lý thông tin thanh toán và nội dung chuyển khoản hiển thị cho học viên." icon={Settings}/><SettingsForm initialData={settings}/></div>;
}
