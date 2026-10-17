"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, ClipboardCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  sessionInput,
  sessionLocalTime,
  sessionTimeLabel,
  type SessionInput,
} from "@/lib/session-input";
import { saveSession } from "@/app/actions/attendance";
import { Button } from "@/components/ui/button";
import { ControlledDateTimeField } from "@/components/forms/controlled-fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import AdminDialog from "../../../components/AdminDialog";
type Session = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  closed: boolean;
  presentCount: number;
};
function SessionEditor({
  classId,
  session,
  onClose,
}: {
  classId: string;
  session: Session | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SessionInput>({
    resolver: zodResolver(sessionInput),
    defaultValues: {
      title: session?.title || "",
      location: session?.location || "",
      startsAt: session ? sessionLocalTime(session.startsAt) : "",
      endsAt: session ? sessionLocalTime(session.endsAt) : "",
    },
  });
  async function submit(input: SessionInput) {
    try {
      const result = await saveSession(classId, session?.id || null, input);
      if (!result.success) {
        setError("root", { message: result.error });
        return;
      }
      toast.success("Đã lưu buổi học.");
      onClose();
      router.refresh();
    } catch {
      setError("root", {
        message: "Không thể lưu buổi học. Vui lòng thử lại.",
      });
    }
  }
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Lịch học dùng giờ Việt Nam (UTC+7).
      </p>
      {errors.root && (
        <p role="alert" className="text-sm text-destructive">
          {errors.root.message}
        </p>
      )}
      {(
        [
          { name: "title", label: "Tên buổi học", type: "text" },
          { name: "startsAt", label: "Bắt đầu", type: "datetime-local" },
          { name: "endsAt", label: "Kết thúc", type: "datetime-local" },
          { name: "location", label: "Địa điểm", type: "text" },
        ] as const
      ).map((field) =>
        field.type === "datetime-local" ? (
          <ControlledDateTimeField
            key={field.name}
            name={field.name}
            control={control}
            id={`session-${field.name}`}
            label={field.label}
            mode="datetime-local"
            required
          />
        ) : (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={`session-${field.name}`}>{field.label}</Label>
            <Input
              id={`session-${field.name}`}
              type={field.type}
              {...register(field.name)}
            />
            {errors[field.name] && (
              <p role="alert" className="text-sm text-destructive">
                {errors[field.name]?.message}
              </p>
            )}
          </div>
        ),
      )}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onClose}
        >
          Hủy
        </Button>
        <Button disabled={isSubmitting}>
          {isSubmitting ? "Đang lưu…" : "Lưu buổi học"}
        </Button>
      </div>
    </form>
  );
}
export default function SessionList({
  classId,
  sessions,
}: {
  classId: string;
  sessions: Session[];
}) {
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
      <div className="grid gap-4 lg:grid-cols-2">
        {sessions.map((session) => (
          <article
            key={session.id}
            className="min-w-0 space-y-3 rounded-xl border bg-card p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words text-lg font-semibold">
                {session.title}
              </h2>
              <Badge variant="secondary">
                {session.closed ? "Đã chốt" : "Đang mở"}
              </Badge>
            </div>
            <p className="text-sm">
              {sessionTimeLabel(session.startsAt)} –{" "}
              {sessionTimeLabel(session.endsAt)}
            </p>
            <p className="break-words text-sm text-muted-foreground">
              {session.location || "Chưa có địa điểm"} · {session.presentCount}{" "}
              đã điểm danh
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/courses/${classId}/sessions/${session.id}`}>
                  <ClipboardCheck />
                  Điểm danh
                </Link>
              </Button>
              <Button
                id={`session-edit-${session.id}`}
                variant="outline"
                onClick={() => setEditing(session)}
              >
                <Pencil />
                Sửa buổi học
              </Button>
            </div>
          </article>
        ))}
      </div>
      {editing !== undefined && (
        <AdminDialog
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
          />
        </AdminDialog>
      )}
    </div>
  );
}
