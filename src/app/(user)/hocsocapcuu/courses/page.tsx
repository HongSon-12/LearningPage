import React from "react";
import { occupiedWhere } from "@/lib/admissions";
import prisma from "@/lib/prisma";
import CourseListUser, { type CourseData } from "./CourseListUser";

export const dynamic = "force-dynamic";

export default async function UserCoursesPage(props: { searchParams?: Promise<{ type?: string }> }) {
  const searchParams = await props.searchParams;
  let classes: CourseData[] = [];
  try {
    classes = await prisma.class.findMany({
      orderBy: { startDate: "asc" },
      include: {
        _count: {
          select: { registrations: {where: occupiedWhere} },
        },
      },
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách lớp cho User:", error);
  }

  return (
    <div className="py-8 space-y-12">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
          Danh sách <span className="text-gradient">Khóa học</span>
        </h1>
        <p className="text-gray-600 text-lg font-medium">
          Lựa chọn các chương trình đào tạo y khoa và cấp cứu chuyên nghiệp từ Trung tâm Cấp cứu 115.
        </p>
      </div>

      {classes.length === 0 ? (
        <div className="text-center py-20 text-gray-500 font-medium bg-white/50 rounded-2xl border border-gray-200 shadow-sm">
          Hiện tại chưa có khóa học nào được mở. Vui lòng quay lại sau!
        </div>
      ) : (
        <CourseListUser courses={classes} initialTab={searchParams?.type || "ALL"} />
      )}
    </div>
  );
}
