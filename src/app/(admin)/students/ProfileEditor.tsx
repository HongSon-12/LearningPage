"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { confirmStudentProfile } from "@/app/actions/student";
import { DateTimePicker } from "@/components/forms/date-time-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
export default function ProfileEditor({
  student,
}: {
  student: {
    id: string;
    fullName: string;
    cccd: string | null;
    email: string | null;
    dob: string;
    phone: string;
  };
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await confirmStudentProfile(
        student.id,
        new FormData(event.currentTarget),
      );
      if (result.success) {
        setMessage(
          "Đã lưu hồ sơ học viên. Các mã tra cứu cũ đã được vô hiệu hóa.",
        );
        router.refresh();
      } else setMessage(result.error || "Không thể lưu hồ sơ.");
    } catch {
      setMessage("Không thể lưu hồ sơ. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      id="student-profile-editor"
      className="@container space-y-4 rounded-xl border bg-card p-4 sm:p-5"
    >
      <h2 className="text-base font-semibold">Thông tin hồ sơ học viên</h2>
      <p className="text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">
        Email dưới đây dùng để nhận mã tra cứu. Thông tin từng lần đăng ký được
        giữ làm lịch sử; đăng ký mới không tự ghi đè hồ sơ này.
      </p>
      <div className="grid gap-4 @md:grid-cols-2">
        {[
          ["fullName", "Họ và tên", "text", student.fullName],
          ["cccd", "CCCD", "text", student.cccd || ""],
          ["dob", "Ngày sinh", "date", student.dob],
          ["phone", "Điện thoại", "tel", student.phone],
          ["email", "Email nhận mã tra cứu", "email", student.email || ""],
        ].map(([key, label, type, value]) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={`profile-${key}`}>{label}</Label>
            {type === "date" ? (
              <DateTimePicker
                disabled={busy}
                id={`profile-${key}`}
                name={key}
                required
                defaultValue={value}
                calendarLabel={label}
              />
            ) : (
              <Input
                disabled={busy}
                id={`profile-${key}`}
                name={key}
                type={type}
                required={key !== "email"}
                maxLength={key === "cccd" ? 18 : 250}
                defaultValue={value}
              />
            )}
          </div>
        ))}
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="confirmed"
          required
          disabled={busy}
          className="mt-1 size-4 shrink-0"
        />
        Tôi đã đối chiếu thông tin định danh, email và các lần đăng ký trong hồ
        sơ với học viên.
      </label>
      {message && (
        <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm">
          {message}
        </p>
      )}
      <Button disabled={busy} type="submit">
        {busy ? "Đang lưu…" : "Lưu hồ sơ đã đối chiếu"}
      </Button>
    </form>
  );
}
