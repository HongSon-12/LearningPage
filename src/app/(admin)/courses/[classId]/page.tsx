import { Users, CalendarDays, MapPin, CheckCircle, Clock, CreditCard } from "lucide-react";
import { PageHeader, StatCard } from "../../components/AdminUI";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { pageUser, classScope } from "@/lib/auth";
import { occupiedWhere } from "@/lib/admissions";
import { getRegistrations } from "@/app/actions/adminRegistration";
import RegistrationList from "../../registrations/RegistrationList";
export const dynamic = "force-dynamic";
export default async function ClassStudentsPage({params}:{params:Promise<{classId:string}>}) {
 const actor=await pageUser(); const {classId}=await params;
 const course=await prisma.class.findFirst({where:{id:classId,...classScope(actor)},include:{_count:{select:{registrations:{where:occupiedWhere}}}}});
 if(!course) notFound();
 const [result,courses]=await Promise.all([getRegistrations(classId),prisma.class.findMany({where:{...classScope(actor),courseType:course.courseType},orderBy:{startDate:"desc"}})]);
 if(!result.success||!result.data)return <p className="text-red-600">{result.error}</p>;
 const active=result.data.filter(reg=>reg.status!=="REJECTED"&&reg.paymentStatus!=="CANCELLED");
 return <div className="mx-auto max-w-7xl space-y-6 pb-6">
  <PageHeader title={`Học viên lớp ${course.code}`} description={course.name} icon={Users} parent={{href:"/courses",label:"Danh sách lớp học"}}/>
  <section className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600"><span className="inline-flex items-center gap-2"><CalendarDays size={16} className="text-slate-400"/>{new Date(course.startDate).toLocaleDateString("vi-VN")} – {new Date(course.endDate).toLocaleDateString("vi-VN")}</span><span className="inline-flex items-center gap-2"><MapPin size={16} className="text-slate-400"/>{course.location}</span>{course.courseBatch&&<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">Khóa {course.courseBatch}</span>}<span className="ml-auto rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{course.status==="OPEN"?"Đang mở":course.status==="FULL"?"Đã đầy":"Đã kết thúc"}</span></section>
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Sĩ số hiện tại" value={`${course._count.registrations}/${course.capacity}`} icon={Users} hint={`${Math.max(0,course.capacity-course._count.registrations)} chỗ còn lại`}/><StatCard label="Hồ sơ chờ duyệt" value={result.data.filter(reg=>reg.status==="PENDING").length} icon={Clock} tone="amber"/><StatCard label="Hồ sơ đã duyệt" value={result.data.filter(reg=>reg.status==="APPROVED").length} icon={CheckCircle} tone="green"/><StatCard label="Chờ thanh toán" value={active.filter(reg=>reg.paymentStatus==="PENDING").length} icon={CreditCard} tone="amber"/></div>
  <RegistrationList initialData={result.data} courses={courses} role={actor.role} mode="manage" fixedClassId={classId}/>
 </div>;
}
