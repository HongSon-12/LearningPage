import prisma from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { assertPagePermission } from "@/lib/auth";
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
  assertPagePermission(actor, "classes.view");
  const [result, managers] = await Promise.all([getClasses(), actor.role === "ADMIN" ? prisma.user.findMany({where:{role:"CLASS_MANAGER",active:true},select:{id:true,username:true},orderBy:{username:"asc"}}) : Promise.resolve(undefined)]);
  if (!result.success || !result.data)
    throw new Error("Không thể tải danh sách lớp.");
  return (
    <div className="w-full min-w-0 space-y-4">
      <PageHeader
        title="Lớp học"
        description="Theo dõi từ mở lớp, giảng dạy đến hoàn tất hồ sơ và chứng từ."
        icon={BookOpen}
      />
      <ClassList
        initialClasses={result.data}
        managers={managers}
        today={new Date().toLocaleDateString("sv-SE", {timeZone:"Asia/Ho_Chi_Minh"})}
        canCreate={actor.role === "ADMIN"}
        canEdit={actor.role !== "ACCOUNTANT" && can(actor, "classes.edit")}
        canSessions={actor.role !== "ACCOUNTANT" && can(actor, "sessions.manage")}
        canRegistrations={can(actor, "registrations.view")}
      />
    </div>
  );
}