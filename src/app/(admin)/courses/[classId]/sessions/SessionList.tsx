"use client";
import {PendingLink as Link} from "@/components/navigation/navigation-feedback";
import { useState } from "react";
import dynamicImport from "next/dynamic";
import { Plus, Pencil, ClipboardCheck } from "lucide-react";
import { sessionTimeLabel } from "@/lib/session-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AdminDialog from "../../../components/AdminDialog";
const SessionEditor = dynamicImport(() => import("./SessionEditor"), {
  loading: () => <p role="status" className="py-4 text-sm text-muted-foreground">Đang mở biểu mẫu…</p>,
});
export type Session = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  closed: boolean;
  presentCount: number;
};
export default function SessionList({
  classId,
  sessions,
  canAttendance,
}: {
  classId: string;
  sessions: Session[];
  canAttendance: boolean;
}) {
  const [saving,setSaving]=useState(false);
  const [editing, setEditing] = useState<Session | null | undefined>();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {sessions.length} buổi học
        </p>
        <Button id="session-create" onClick={() => setEditing(null)}>
          <Plus />
          Tạo buổi học
        </Button>
      </div>
      {!sessions.length && (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          Chưa có buổi học. Tạo buổi học để bắt đầu điểm danh.
        </div>
      )}
      <div className="space-y-3">
        {sessions.map(session => <article key={session.id} className="grid items-center gap-3 rounded-xl border bg-card p-4 md:grid-cols-[minmax(0,1fr)_auto]" data-slot="session-row">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2"><h2 className="break-words text-base font-semibold">{session.title}</h2><Badge variant="secondary">{session.closed ? "Đã chốt" : "Đang mở"}</Badge></div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="tabular-nums text-foreground">{sessionTimeLabel(session.startsAt)} – {sessionTimeLabel(session.endsAt)}</span>
              <span>{session.location || "Chưa có địa điểm"}</span><span className="tabular-nums">{session.presentCount} đã điểm danh</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-nowrap gap-2">
            {canAttendance && <Button asChild><Link href={`/courses/${classId}/sessions/${session.id}`}><ClipboardCheck />Điểm danh</Link></Button>}
            <Button id={`session-edit-${session.id}`} variant="outline" onClick={() => setEditing(session)}><Pencil />Sửa</Button>
          </div>
        </article>)}
      </div>
      {editing !== undefined && (
        <AdminDialog
          busy={saving}
          title={editing ? "Sửa buổi học" : "Tạo buổi học"}
          subtitle="Mỗi buổi có một danh sách điểm danh riêng."
          returnFocusId={
            editing ? `session-edit-${editing.id}` : "session-create"
          }
          onClose={() => setEditing(undefined)}
        >
          <SessionEditor
            classId={classId}
            session={editing}
            onClose={() => setEditing(undefined)}
            onBusyChange={setSaving}
          />
        </AdminDialog>
      )}
    </div>
  );
}
