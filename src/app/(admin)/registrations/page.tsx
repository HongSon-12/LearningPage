import { ClipboardCheck } from "lucide-react";
import { PageHeader } from "../components/AdminUI";
import prisma from "@/lib/prisma";
import { pageUser, classScope } from "@/lib/auth";
import { getRegistrations } from "@/app/actions/adminRegistration";
import RegistrationList from "./RegistrationList";
export const dynamic = "force-dynamic";
export default async function RegistrationsPage() {
 const actor=await pageUser();
 const [result,courses]=await Promise.all([getRegistrations(),prisma.class.findMany({where:classScope(actor),orderBy:{startDate:"desc"}})]);
 if(!result.success||!result.data)return <p className="text-red-600">{result.error}</p>;
 return <div className="w-full min-w-0 space-y-4"><PageHeader title="Kiểm tra thông tin đăng ký" description="Đối chiếu thông tin và tài liệu của học viên. Duyệt hồ sơ phù hợp hoặc ghi rõ lý do từ chối." icon={ClipboardCheck}/><RegistrationList initialData={result.data} courses={courses} role={actor.role} mode="review"/></div>;
}
