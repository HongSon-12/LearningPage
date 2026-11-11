import {ssoEnabled} from "@/lib/auth-mode";
import { Users } from "lucide-react";
import { PageHeader } from "../components/AdminUI";
import prisma from "@/lib/prisma";
import { pagePermission } from "@/lib/auth";
import UsersForm from "./UsersForm";
export default async function UsersPage() {
  const actor = await pagePermission("users.manage");
  const users = await prisma.user.findMany({ select: { id: true, username: true, name: true, role: true, active: true, email:true, customRoleId:true, ssoUserId:true, ssoActive:true, appAccessGranted:true, ssoAccessCheckedAt:true }, orderBy: { username: "asc" } });
  const customRoles=await prisma.customRole.findMany({select:{id:true,name:true,baseRole:true},orderBy:{name:"asc"}});
  return (
    <div className="w-full min-w-0 space-y-4">
      <PageHeader
        title="Tài khoản đăng nhập"
        description={ssoEnabled()?"SSO quản lý tài khoản, trạng thái active và quyền vào application EDU. Admin EDU phân quyền tính năng, module sau khi người dùng được phép vào.":"Tạo, chỉnh sửa, chọn vai trò và khóa tài khoản truy cập hệ thống."}
        icon={Users}
      />
      <UsersForm ssoMode={ssoEnabled()} customRoles={customRoles} users={ssoEnabled()?users.map(user=>({...user,active:Boolean(user.ssoUserId && user.ssoActive && user.appAccessGranted)})):users} currentUserId={actor.id} />
    </div>
  );
}
