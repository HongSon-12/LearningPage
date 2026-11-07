import { pageUser } from "@/lib/auth";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "../components/AdminUI";
export default async function NoAccessPage(){
  await pageUser();
  return <div className="space-y-4"><PageHeader title="Chưa được cấp quyền" description="Tài khoản của bạn chưa có quyền truy cập các chức năng quản lý." icon={ShieldCheck}/><p className="rounded-xl border bg-card p-5">Liên hệ Quản trị để được cấp quyền phù hợp.</p></div>;
}
