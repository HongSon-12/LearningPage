import { formatMoney } from "@/lib/money";
import ClassAssignment from "./ClassAssignment";
import ClassSessions from "./ClassSessions";
import dynamicImport from "next/dynamic";
import { classWorkspace } from "@/lib/class-workspace";
import { can } from "@/lib/permissions";
import { assertPagePermission, pageUser, classScope } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { queryRegistrationPage } from "@/lib/registration-page";
import { registrationFilter } from "@/lib/registration-filter";
import RegistrationList from "../../registrations/RegistrationList";
const ClassDetails = dynamicImport(() => import("./ClassDetails"));
export const dynamic = "force-dynamic";
export default async function ClassStudentsPage({params,searchParams}:{params:Promise<{classId:string}>;searchParams:Promise<{tab?:string}>}) {
  const actor=await pageUser();
  const [{classId},query]=await Promise.all([params,searchParams]);
  if(query.tab === "sessions")return <ClassSessions classId={classId}/>;
  const tab=query.tab === "info" ? "info" : query.tab === "documents" ? "documents" : "students";
  const course=await classWorkspace(classId);
  if(tab !== "info") {
    assertPagePermission(actor,"registrations.view");
    const [result,courses]=await Promise.all([
      queryRegistrationPage(actor,{...registrationFilter,classId}),
      can(actor,"registrations.transfer") ? prisma.class.findMany({where:{...classScope(actor),courseType:course.courseType},select:{id:true,code:true,name:true,courseType:true,courseBatch:true,status:true},orderBy:{startDate:"desc"}}) : Promise.resolve([{id:course.id,code:course.code,name:course.name,courseType:course.courseType,courseBatch:course.courseBatch,status:course.status}]),
    ]);
    return <RegistrationList key={tab} initialPage={result} courses={courses} role={actor.role} permissions={actor.permissions} mode="manage" fixedClassId={classId} view={tab} />;
  }
  const canAssign=can(actor,"classes.assign");
  const date=(value:Date)=>value.toLocaleDateString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"});
  return can(actor,"classes.edit") ? <ClassDetails course={course} canAssign={canAssign} /> : <section className="rounded-xl border bg-card p-5"><h2 className="mb-4 font-semibold">Thông tin lớp</h2><dl className="grid gap-5 sm:grid-cols-2">{[["Mã lớp",course.code],["Tên lớp",course.name],["Học phí",`${formatMoney(course.fee)} đồng`],["Người phụ trách",course.manager?.name || course.manager?.username || "Chưa phân công"],["Địa điểm",course.location],["Lịch học",`${date(course.startDate)} – ${date(course.endDate)}`],["Chứng nhận",course.certificateType === "CONFIRMATION" ? "Giấy xác nhận" : "Giấy chứng nhận"]].map(([label,value])=><div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value || "Chưa có"}</dd></div>)}</dl>{canAssign&&<ClassAssignment classId={course.id} managerId={course.managerId}/>}</section>;
}
