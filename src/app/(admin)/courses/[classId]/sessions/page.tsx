
import {redirect} from "next/navigation";
import {pageUser,assertPagePermission} from "@/lib/auth";
import {classWorkspace} from "@/lib/class-workspace";
export default async function LegacySessions({params}:{params:Promise<{classId:string}>}){
 const actor=await pageUser();assertPagePermission(actor,"sessions.manage");
 const {classId}=await params;await classWorkspace(classId);
 redirect(`/courses/${classId}?tab=sessions`);
}
