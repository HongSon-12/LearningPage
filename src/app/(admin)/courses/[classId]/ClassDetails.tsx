"use client";
import type { Class } from "@prisma/client";
import {useNavigationFeedback} from "@/components/navigation/navigation-feedback";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClassForm } from "@/components/forms/class-form";
import { updateClass } from "@/app/actions/class";
export default function ClassDetails({course,managers}:{course:Class;managers?:{id:string;username:string}[]}) {
  const router = useRouter();const navigation=useNavigationFeedback();
  return <section className="rounded-xl border bg-card p-4 sm:p-5"><h2 className="mb-4 font-semibold">Thông tin lớp</h2><ClassForm key={JSON.stringify(course)} course={course} managers={managers} onCancel={()=>navigation?navigation.navigate(`/courses/${course.id}?tab=students`,false):router.push(`/courses/${course.id}?tab=students`)} onSave={async form=>{
    const result=await updateClass(course.id,form);
    if(result.success){toast.success("Đã lưu lớp học.");router.refresh();}
    return result;
  }} /></section>;
}
