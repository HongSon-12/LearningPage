import dynamicImport from "next/dynamic";
import TableLoading from "@/components/admin/table-loading";
import { BookOpen } from "lucide-react";
import { pageUser } from "@/lib/auth";
import { getClasses } from "@/app/actions/class";
import { PageHeader } from "../components/AdminUI";
const ClassList = dynamicImport(() => import("./ClassList"), {
  loading: () => <TableLoading />,
});
export const dynamic = "force-dynamic";
export default async function AdminCoursesPage() {
  const actor = await pageUser();
  const result = await getClasses();
  if (!result.success || !result.data)
    throw new Error("Không thể tải danh sách lớp.");
  return (
    <div className="w-full min-w-0 space-y-4">
      <PageHeader
        title="Quản lý Khóa học"
        description="Theo dõi lịch học, sĩ số và hồ sơ học viên của từng lớp."
        icon={BookOpen}
      />
      <ClassList
        initialClasses={result.data}
        canCreate={actor.role === "ADMIN"}
        canEdit={actor.role !== "ACCOUNTANT"}
      />
    </div>
  );
}
