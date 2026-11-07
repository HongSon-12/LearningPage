"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { assignManager } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectField, SelectOption } from "@/components/forms/select-field";

export default function ClassAssignment({classId,managerId,managers}:{classId:string;managerId:string|null;managers:{id:string;username:string}[]}) {
  const [value,setValue]=useState(managerId||"");
  const [pending,startTransition]=useTransition();
  const router=useRouter();
  return <div className="mt-5 space-y-3 border-t pt-5"><Label htmlFor="class-assignment">Người phụ trách</Label>
    <SelectField id="class-assignment" value={value} disabled={pending} onValueChange={setValue}>
      <SelectOption value="">Chưa phân công</SelectOption>
      {managers.map(user=><SelectOption key={user.id} value={user.id}>{user.username}</SelectOption>)}
    </SelectField>
    <Button loading={pending} disabled={pending||value===(managerId||"")} onClick={()=>startTransition(async()=>{
      const result=await assignManager(classId,value);
      if(result.success){toast.success("Đã lưu phân công.");router.refresh();}else toast.error(result.error);
    })}>Lưu phân công</Button>
  </div>;
}
