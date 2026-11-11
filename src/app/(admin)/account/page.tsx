import {ssoEnabled} from "@/lib/auth-mode";
import {UserRound} from "lucide-react";
import {pageUser} from "@/lib/auth";
import prisma from "@/lib/prisma";
import {roleLabels} from "@/lib/user-input";
import {PageHeader} from "../components/AdminUI";
import AccountForm from "./AccountForm";
export default async function AccountPage(){
 const actor=await pageUser();
 const profile=await prisma.user.findUniqueOrThrow({where:{id:actor.id},select:{username:true,name:true,email:true}});
 return <div className="space-y-4"><PageHeader title="Tài khoản của tôi" description={ssoEnabled()?"Thông tin tài khoản được đồng bộ từ SSO 115. Vai trò do admin edu quản lý.":"Cập nhật email khôi phục và mật khẩu đăng nhập."} icon={UserRound}/><div className="max-w-3xl space-y-5 rounded-xl border bg-card p-5 sm:p-6"><dl className="grid gap-4 border-b pb-5 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">Tên người dùng</dt><dd className="mt-1 font-semibold">{profile.name || profile.username}</dd></div><div><dt className="text-sm text-muted-foreground">Tên đăng nhập</dt><dd className="mt-1 font-semibold">{profile.username}</dd></div><div><dt className="text-sm text-muted-foreground">Vai trò</dt><dd className="mt-1 font-medium">{actor.roleName||(actor.role ? roleLabels[actor.role] : "Chưa phân quyền")}</dd></div></dl><>{ssoEnabled()?<div className="space-y-3"><p>Email: {profile.email || "Chưa có"}</p><a href="https://sso.115.org.vn/if/user/#/settings" className="inline-flex min-h-11 items-center text-primary underline">Quản lý tài khoản và mật khẩu tại SSO</a></div>:<AccountForm email={profile.email||""}/>}</></div></div>;
}
