import { Users } from "lucide-react";
import { PageHeader } from "../components/AdminUI";
import prisma from "@/lib/prisma";
import { pageUser } from "@/lib/auth";
import UsersForm from "./UsersForm";
export default async function UsersPage() {
 await pageUser(["ADMIN"]);
 const [users,courses]=await Promise.all([prisma.user.findMany({select:{id:true,username:true,role:true,active:true},orderBy:{username:"asc"}}),prisma.class.findMany({select:{id:true,code:true,name:true,managerId:true},orderBy:{startDate:"desc"}})]);
 return <div className="mx-auto max-w-7xl space-y-6 pb-6"><PageHeader title="Tài khoản và phân quyền" description="Quản lý tài khoản truy cập hệ thống và phân công người phụ trách từng lớp học." icon={Users}/><UsersForm users={users} courses={courses}/></div>;
}
