import { ShieldCheck } from "lucide-react";
import { pageUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isPermission, type PermissionKey } from "@/lib/permission-catalog";
import { PageHeader } from "../components/AdminUI";
import PermissionEditor from "./PermissionEditor";
export default async function PermissionsPage() {
  await pageUser(["ADMIN"]);
  const rows = await prisma.rolePolicy.findMany({ include: { grants: true } });
  const policies = Object.fromEntries(rows.map(row=>[row.role,{version:row.version,permissions:row.grants.map(grant=>grant.permission).filter(isPermission)}])) as Record<"CLASS_MANAGER"|"ACCOUNTANT",{version:number;permissions:PermissionKey[]}>;
  const customRoles=await prisma.customRole.findMany({orderBy:{name:"asc"}});
  return <div className="space-y-4"><PageHeader title="Phân quyền vai trò" description="Tài khoản nhận quyền thông qua vai trò. Phân công lớp được quản lý tại mục Lớp học." icon={ShieldCheck} /><PermissionEditor customRoles={customRoles.map(item=>({...item,permissions:item.permissions.filter(isPermission)}))} policies={policies} /></div>;
}
