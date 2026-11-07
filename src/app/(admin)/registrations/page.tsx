import { assertPagePermission } from "@/lib/auth";
import { ClipboardCheck } from "lucide-react";
import { PageHeader } from "../components/AdminUI";
import prisma from "@/lib/prisma";
import { pageUser, classScope } from "@/lib/auth";
import { queryRegistrationPage } from "@/lib/registration-page";
import { registrationFilter } from "@/lib/registration-filter";
import RegistrationList from "./RegistrationList";
export const dynamic = "force-dynamic";
export default async function RegistrationsPage() {
 const actor=await pageUser();
  assertPagePermission(actor, "registrations.view");
 const [result,courses]=await Promise.all([queryRegistrationPage(actor,{...registrationFilter,state:"PENDING"}),prisma.class.findMany({where:classScope(actor),orderBy:{startDate:"desc"}})]);
 return <div className="w-full min-w-0 space-y-4"><PageHeader title="Kiểm tra thông tin đăng ký" description="Đối chiếu thông tin và tài liệu của học viên. Duyệt hồ sơ phù hợp hoặc ghi rõ lý do từ chối." icon={ClipboardCheck}/><RegistrationList initialPage={result} courses={courses} role={actor.role} permissions={actor.permissions} mode="review"/></div>;
}
