"use client";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { sessionInput, sessionLocalTime, type SessionInput } from "@/lib/session-input";
import { saveSession } from "@/app/actions/attendance";
import { Button } from "@/components/ui/button";
import { ControlledDateTimeField } from "@/components/forms/controlled-fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Session } from "./SessionList";
export default function SessionEditor({
  classId,
  session,
  onClose,
  onBusyChange,
}: {
  classId: string;
  session: Session | null;
  onClose: () => void;
  onBusyChange: (value:boolean)=>void;
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
    onBusyChange(true);
    try {
      const result = await saveSession(classId, session?.id || null, input);
      if (!result.success) {
        setError("root", { message: result.error });
        toast.error(result.error);
        return;
      }
      toast.success("Đã lưu buổi học.");
      onClose();
      router.refresh();
    } catch {
      toast.error("Không thể lưu buổi học. Vui lòng thử lại.");
      setError("root", {
        message: "Không thể lưu buổi học. Vui lòng thử lại.",
      });
    }finally{onBusyChange(false);}
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
        <Button loading={isSubmitting}>
          {isSubmitting ? "Đang lưu…" : "Lưu"}
        </Button>
      </div>
    </form>
  );
}
