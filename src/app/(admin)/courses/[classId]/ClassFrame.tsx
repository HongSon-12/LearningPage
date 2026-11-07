"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {NavigationContent} from "@/components/navigation/navigation-feedback";
import ClassNavigation from "./ClassNavigation";
export default function ClassFrame({classId,canSessions,canRecords,header,summary,children}:{classId:string;canSessions:boolean;canRecords:boolean;header:ReactNode;summary:ReactNode;children:ReactNode}) {
  const path=usePathname();
  // Attendance keeps its focused workspace; the four class sections share the same overview.
  if(path.startsWith(`/courses/${classId}/sessions/`)) return children;
  return <div className="w-full min-w-0 space-y-4">{header}<div data-slot="class-overview">{summary}</div><ClassNavigation classId={classId} canSessions={canSessions} canRecords={canRecords} /><div data-slot="class-content" className="min-w-0"><NavigationContent withinClass>{children}</NavigationContent></div></div>;
}
