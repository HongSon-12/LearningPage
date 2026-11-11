"use client";
import { useState, useTransition } from "react";
import { useEligibleManagers } from "@/components/forms/use-eligible-managers";
import { toast } from "sonner";
import { assignManager } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectField, SelectOption } from "@/components/forms/select-field";

export default function ClassAssignment({classId,managerId}:{classId:string;managerId:string|null}) {
  const [value,setValue]=useState(managerId||"");
  const [pending,startTransition]=useTransition();
  const query=useEligibleManagers(true,classId);
  const managers=query.data;
  return <div className="mt-5 space-y-3 border-t pt-5"><Label htmlFor="class-assignment">Người phụ trách</Label>
    {managers ? <SelectField id="class-assignment" value={value} disabled={pending} onValueChange={setValue}>
      <SelectOption value="">Chưa phân công</SelectOption>
      {managers.map(user=><SelectOption key={user.id} value={user.id}>{user.name || user.username}</SelectOption>)}
    </SelectField> : query.error ? <div role="alert"><p>{query.error}</p><Button type="button" onClick={query.retry}>Thử lại</Button></div> : <p role="status">Đang tải người phụ trách…</p>}
    <Button loading={pending} disabled={!managers||pending||value===(managerId||"")} onClick={()=>startTransition(async()=>{
      const result=await assignManager(classId,value);
      if(result.success){toast.success("Đã lưu phân công.");}else toast.error(result.error);
    })}>Lưu phân công</Button>
  </div>;
}
