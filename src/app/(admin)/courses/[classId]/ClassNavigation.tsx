"use client";
import { usePathname, useSearchParams } from "next/navigation";
import {PendingLink as Link,useNavigationFeedback} from "@/components/navigation/navigation-feedback";
import { Users, CalendarDays, ReceiptText, Settings2, LoaderCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
function TabLabel({icon:Icon,label}:{icon:LucideIcon;label:string}) {
  const navigation=useNavigationFeedback();const pending=!!navigation?.pending && navigation.target.includes(`tab=${label === "Buổi học" ? "sessions" : label === "Thông tin" ? "info" : label === "Chứng từ" ? "documents" : "students"}`);
  return <>{pending ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Icon aria-hidden="true" />}{label}{pending && <span role="status" className="sr-only">Đang mở {label}…</span>}</>;
}
export type ClassTab = "students" | "sessions" | "documents" | "info";
export default function ClassNavigation({classId,canSessions,canRecords}:{classId:string;canSessions:boolean;canRecords:boolean}) {
  const path=usePathname(); const query=useSearchParams();
  const active:ClassTab=(query.get("tab") === "sessions" || path.endsWith("/sessions")) ? "sessions" : query.get("tab") === "info" ? "info" : query.get("tab") === "documents" ? "documents" : "students";
  const items = [
    {key:"students",label:"Học viên",icon:Users,href:`/courses/${classId}?tab=students`},
    ...(canSessions ? [{key:"sessions",label:"Buổi học",icon:CalendarDays,href:`/courses/${classId}?tab=sessions`}] : []),
    {key:"documents",label:"Chứng từ",icon:ReceiptText,href:`/courses/${classId}?tab=documents`},
    {key:"info",label:"Thông tin",icon:Settings2,href:`/courses/${classId}?tab=info`},
  ];
  return <nav aria-label="Công việc của lớp" className="flex flex-wrap gap-2">{items.filter(item=>canRecords || item.key === "sessions").map(item=><Button key={item.key} asChild variant={active===item.key?"default":"outline"}><Link scroll={false} href={item.href} aria-current={active===item.key?"page":undefined}><TabLabel icon={item.icon} label={item.label} /></Link></Button>)}</nav>;
}
