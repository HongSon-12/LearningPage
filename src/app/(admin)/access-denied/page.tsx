import { pageUser } from "@/lib/auth";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "../components/AdminUI";
export default async function NoAccessPage(){
  await pageUser();
  return <div className="space-y-4"><PageHeader title="Chưa được cấp quyền" description="SSO đã cho phép bạn vào EDU. Tài khoản đang chờ admin phân quyền sử dụng tính năng và module." icon={ShieldCheck}/><p className="rounded-xl border bg-card p-5">Bạn có thể xem thông tin tài khoản của mình. Liên hệ admin EDU để được phân quyền phù hợp.</p></div>;
}
