import type { ReactNode } from "react";
import {PendingLink as Link} from "@/components/navigation/navigation-feedback";
import { Users, CalendarDays, MapPin, UserRound } from "lucide-react";
import { can } from "@/lib/permissions";
import { assertPagePermission, pageUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { classWorkspace } from "@/lib/class-workspace";
import { occupiedWhere } from "@/lib/admissions";
import { classStage, classStageLabels } from "@/lib/class-lifecycle";
import { PageHeader } from "../../components/AdminUI";
import { StatusBadge } from "@/components/admin/status-badge";
import ClassFrame from "./ClassFrame";
export const dynamic = "force-dynamic";
export default async function ClassLayout({children,params}:{children:ReactNode;params:Promise<{classId:string}>}) {
  const actor=await pageUser();
  assertPagePermission(actor,"classes.view");
  const {classId}=await params;
  const course=await classWorkspace(classId);
  const canRecords=can(actor,"registrations.view");
  const activeWhere={classId,...occupiedWhere};
  const [groups,invoiced,certified]=canRecords ? await Promise.all([
    prisma.registration.groupBy({by:["status","paymentStatus"],where:{classId},_count:true}),
    prisma.registration.count({where:{...activeWhere,invoiceCode:{not:null},NOT:{invoiceCode:""}}}),
    prisma.registration.count({where:{...activeWhere,...(course.certificateType === "CONFIRMATION" ? {confirmationNumber:{not:null},NOT:{confirmationNumber:""}} : {certificateCode:{not:null},NOT:{certificateCode:""}})}}),
  ]) : [[],0,0];
  const pending=groups.filter(row=>row.status === "PENDING").reduce((sum,row)=>sum+row._count,0);
  const activeCount=course._count.registrations;
  const unpaid=groups.filter(row=>row.status!=="REJECTED" && row.paymentStatus === "PENDING").reduce((sum,row)=>sum+row._count,0);
  const today=new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Ho_Chi_Minh"});
  const date=(value:Date)=>value.toLocaleDateString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"});
  const canSessions=can(actor,"sessions.manage");
  const metrics=[
    {label:"Học viên",value:`${course._count.registrations}/${course.capacity}`,hint:`${course._count.sessions} buổi học`,href:`/courses/${classId}`},
    {label:"Chờ duyệt",value:pending,hint:"Hồ sơ đăng ký",href:`/courses/${classId}`},
    {label:"Chờ thanh toán",value:unpaid,hint:"Học viên đang ghi nhận",href:`/courses/${classId}?tab=documents`},
    {label:"Chứng từ",value:`${invoiced}/${activeCount}`,hint:`Hóa đơn · ${certified}/${activeCount} ${course.certificateType === "CONFIRMATION" ? "GXN" : "GCN"}`,href:`/courses/${classId}?tab=documents`},
  ];

  return <ClassFrame classId={classId} canSessions={canSessions} canRecords={canRecords} header={<PageHeader title={`Lớp ${course.code}`} description={course.name} icon={Users} parent={{href:"/courses",label:"Lớp học"}} />} summary={<section className="overflow-hidden rounded-xl border bg-card" aria-label="Tổng quan lớp">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b px-4 py-3 text-sm text-muted-foreground">
        <span className="rounded-md bg-blue-50 px-2.5 py-1 font-medium text-blue-700">{classStageLabels[classStage(course,today)]}</span>
        <span className="inline-flex items-center gap-2"><CalendarDays className="size-4 shrink-0" />{date(course.startDate)}{date(course.endDate)!==date(course.startDate)?` – ${date(course.endDate)}`:""} · {course.startTime}–{course.endTime}</span>
        <span className="inline-flex items-center gap-2"><MapPin className="size-4 shrink-0" />{course.location || "Chưa có địa điểm"}</span>
        <span className="inline-flex items-center gap-2"><UserRound className="size-4 shrink-0" />{course.manager?.username || "Chưa có người phụ trách"}</span>
        <span className="ml-auto inline-flex items-center gap-2 text-xs">Đăng ký <StatusBadge kind="class" value={course.status} /></span>
      </div>
      {canRecords && <div className="grid grid-cols-2 divide-x divide-slate-200 md:grid-cols-4">{metrics.map(metric=><Link scroll={false} key={metric.label} href={metric.href} className="min-w-0 p-4 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-ring"><p className="text-sm text-muted-foreground">{metric.label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{metric.value}</p><p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p></Link>)}</div>}
    </section>}>{children}</ClassFrame>;
}
