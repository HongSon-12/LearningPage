import React from "react";
import { getClasses } from "@/app/actions/class";
import ClassList from "./ClassList";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  const result = await getClasses();
  
  if (!result.success || !result.data) {
    return <div className="text-red-500">Lỗi tải dữ liệu. Vui lòng thử lại sau.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Quản lý Khóa học</h1>
      </div>

      <ClassList initialClasses={result.data} />
    </div>
  );
}
