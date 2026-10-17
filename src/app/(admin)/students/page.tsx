import prisma from "@/lib/prisma";
import { pageUser, classScope } from "@/lib/auth";
import { queryStudentDirectory } from "@/lib/student-directory";
import { defaultStudentFilter } from "@/lib/student-directory-input";
import { PageHeader } from "../components/AdminUI";
import { Users } from "lucide-react";
import StudentDirectory from "./StudentDirectory";
export const dynamic = "force-dynamic";
export default async function StudentsPage() {
  const actor = await pageUser();
  const [data, courses] = await Promise.all([
    queryStudentDirectory(actor, defaultStudentFilter),
    prisma.class.findMany({
      where: classScope(actor),
      select: { id: true, code: true, name: true },
      orderBy: { startDate: "desc" },
    }),
  ]);
  return (
    <div className="w-full min-w-0 space-y-4">
      <PageHeader
        title="Hồ sơ học viên"
        description="Tìm học viên, đối chiếu thông tin và mở lịch sử đăng ký theo từng lớp."
        icon={Users}
      />
      <StudentDirectory
        initialData={data}
        courses={courses}
        canSearchCccd={actor.role !== "ACCOUNTANT"}
      />
    </div>
  );
}
