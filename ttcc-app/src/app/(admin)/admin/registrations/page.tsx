import React from "react";
import { getRegistrations } from "@/app/actions/adminRegistration";
import RegistrationList from "./RegistrationList";

export const dynamic = "force-dynamic";

export default async function AdminRegistrationsPage() {
  const result = await getRegistrations();
  
  if (!result.success || !result.data) {
    return <div className="text-red-500 p-8 font-bold text-center">Lỗi tải dữ liệu. Vui lòng thử lại sau.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Quản lý Đăng ký Học viên</h1>
      </div>

      <RegistrationList initialData={result.data} />
    </div>
  );
}
