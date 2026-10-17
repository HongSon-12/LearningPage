"use client";
import { DateTimePicker } from "@/components/forms/date-time-picker";
import { SelectField, SelectOption } from "@/components/forms/select-field";
import {
  Plus,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  Save,
  Loader2,
} from "lucide-react";
import AdminDialog from "../components/AdminDialog";
import {
  fieldClass,
  primaryButton,
  secondaryButton,
} from "../components/AdminUI";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { createManualRegistration } from "@/app/actions/adminRegistration";
type Course = {
  id: string;
  code: string;
  name: string;
  courseType: string;
  status: string;
};
export default function RegistrationTools({
  courses,
  role,
  classId,
}: {
  courses: Course[];
  role: UserRole;
  classId: string;
}) {
  const [importOpen, setImportOpen] = useState(false);
  const router = useRouter();
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<
    { row: number; operation: string; fullName: string }[] | null
  >(null);
  const [selected, setSelected] = useState(
    courses.find((c) => c.id === classId && c.status === "OPEN")?.id ||
      courses.find((c) => c.status === "OPEN")?.id ||
      "",
  );
  const course = courses.find((c) => c.id === selected);
  const [uploads, setUploads] = useState<Record<string, string>>({});
  async function upload(file: File, key: string) {
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("classId", selected);
      form.set(
        "kind",
        key === "idPhotoUrl"
          ? "ID_PHOTO"
          : key === "degreeUrl"
            ? "DEGREE"
            : "RECEIPT",
      );
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      setUploads((v) => ({ ...v, [key]: result.url }));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không thể tải file.");
    } finally {
      setBusy(false);
    }
  }
  async function save(form: FormData) {
    setBusy(true);
    setMessage("");
    try {
      const result = await createManualRegistration(
        {
          classId: selected,
          fullName: String(form.get("fullName")),
          dob: new Date(String(form.get("dob"))),
          phone: String(form.get("phone")),
          cccd: String(form.get("cccd")),
          email: String(form.get("email") || ""),
          gender: String(form.get("gender")) as "MALE" | "FEMALE" | "OTHER",
          organization: String(form.get("organization") || ""),
          workplace: String(form.get("workplace") || ""),
          note: String(form.get("note") || ""),
          ...uploads,
        },
        String(form.get("method")) as "MANUAL" | "LATE",
      );
      if (!result.success) throw new Error(result.error);
      setManual(false);
      setUploads({});
      setMessage("Đã thêm học viên.");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không thể lưu.");
    } finally {
      setBusy(false);
    }
  }
  async function excel(mode: "preview" | "commit") {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("mode", mode);
      form.set("classId", classId);
      const res = await fetch("/api/admin/excel", {
        method: "POST",
        body: form,
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      if (mode === "preview") setPreview(result.report);
      else {
        setPreview(null);
        setFile(null);
        setMessage(`Đã lưu ${result.report.length} dòng.`);
        router.refresh();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không thể xử lý Excel.");
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Công cụ quản lý học viên
          </h2>
          <p className="mt-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-500">
            Thêm học viên hoặc cập nhật dữ liệu của lớp bằng Excel.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {role !== "ACCOUNTANT" && (
            <button
              disabled={busy || !courses.some((c) => c.status === "OPEN")}
              onClick={() => {
                setMessage("");
                setUploads({});
                setSelected(
                  courses.find((c) => c.id === classId && c.status === "OPEN")
                    ?.id ||
                    courses.find((c) => c.status === "OPEN")?.id ||
                    "",
                );
                setManual(true);
              }}
              className={primaryButton}
            >
              <Plus size={16} />
              Thêm học viên / Đăng ký vét
            </button>
          )}
          <a
            className={secondaryButton}
            href={`/api/admin/excel?classId=${encodeURIComponent(classId)}`}
          >
            <Download size={16} />
            Xuất Excel
          </a>
          <button
            aria-expanded={importOpen}
            onClick={() => setImportOpen(!importOpen)}
            className={secondaryButton}
          >
            <Upload size={16} />
            Nhập Excel
          </button>
        </div>
      </div>
      {message && !manual && (
        <p
          role="status"
          className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800"
        >
          {message}
        </p>
      )}
      {importOpen && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <FileSpreadsheet size={20} className="mt-0.5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Nhập dữ liệu từ Excel
                </h3>
                <p className="mt-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-500">
                  Chọn file .xlsx tối đa 5 MB. Kiểm tra file trước khi xác nhận
                  lưu vào lớp.
                </p>
              </div>
            </div>
            <a
              href="/api/admin/excel?template=1"
              className="inline-flex items-center gap-1.5 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-semibold text-blue-700 hover:underline"
            >
              <Download size={14} />
              Tải mẫu Excel
            </a>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-0 flex-1 space-y-2 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-medium text-slate-600">
              File dữ liệu
              <input
                disabled={busy}
                type="file"
                accept=".xlsx"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setPreview(null);
                }}
                className="block w-full rounded-xl border border-slate-200 bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-[length:var(--ui-caption-size,0.8125rem)] leading-5 file:font-semibold file:text-slate-600"
              />
            </label>
            <button
              disabled={!file || busy}
              onClick={() => excel("preview")}
              className={primaryButton}
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle size={16} />
              )}
              Kiểm tra file
            </button>
          </div>
          {preview && (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <p className="text-sm font-semibold text-emerald-800">
                File hợp lệ: {preview.length} dòng
              </p>
              <p className="text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-500">
                Dữ liệu chưa được lưu. Kiểm tra các dòng bên dưới trước khi xác
                nhận.
              </p>
              <ul className="max-h-40 divide-y divide-emerald-100 overflow-auto text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-600">
                {preview.map((row) => (
                  <li key={row.row} className="py-2">
                    Dòng {row.row} · {row.operation} ·{" "}
                    <span className="font-medium">{row.fullName}</span>
                  </li>
                ))}
              </ul>
              <button
                disabled={busy}
                onClick={() => excel("commit")}
                className={primaryButton}
              >
                <Save size={16} />
                Xác nhận lưu file
              </button>
            </div>
          )}
        </div>
      )}
      {manual && (
        <AdminDialog
          title="Thêm học viên thủ công / đăng ký vét"
          subtitle="Cung cấp thông tin và tài liệu như khi đăng ký trực tuyến."
          onClose={() => {
            if (!busy) setManual(false);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save(new FormData(e.currentTarget));
            }}
            className="space-y-6"
          >
            {message && (
              <p
                role="alert"
                className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800"
              >
                {message}
              </p>
            )}
            <section className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:grid-cols-2">
              <label className="space-y-2 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-medium text-slate-600">
                Lớp học
                <SelectField
                  required
                  value={selected}
                  onValueChange={(value) => {
                    setSelected(value);
                    setUploads({});
                  }}
                >
                  {courses
                    .filter((c) => c.status === "OPEN")
                    .map((c) => (
                      <SelectOption key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </SelectOption>
                    ))}
                </SelectField>
              </label>
              <label className="space-y-2 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-medium text-slate-600">
                Hình thức đăng ký
                <SelectField defaultValue="MANUAL" name="method">
                  <SelectOption value="MANUAL">Thủ công</SelectOption>
                  <SelectOption value="LATE">
                    Đăng ký vét (sau hạn, trong sĩ số)
                  </SelectOption>
                </SelectField>
              </label>
            </section>
            <section>
              <h3 className="mb-4 text-sm font-semibold text-slate-900">
                Thông tin học viên
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ["fullName", "Họ và tên", "text", true],
                  ["dob", "Ngày sinh", "date", true],
                  ["phone", "Số điện thoại", "tel", true],
                  ["cccd", "CCCD", "text", true],
                  ["email", "Email", "email", false],
                  ["organization", "Tổ chức", "text", false],
                  [
                    "workplace",
                    "Đơn vị công tác",
                    "text",
                    course?.courseType !== "COMMUNITY_FIRST_AID",
                  ],
                  ["note", "Ghi chú", "text", false],
                ].map(([key, label, type, required]) => (
                  <label
                    key={String(key)}
                    className="space-y-2 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-medium text-slate-600"
                  >
                    {label}
                    {required && <span className="ml-1 text-rose-500">*</span>}
                    {type === "date" ? (
                      <DateTimePicker
                        name={String(key)}
                        required={Boolean(required)}
                        calendarLabel={String(label)}
                      />
                    ) : (
                      <input
                        name={String(key)}
                        type={String(type)}
                        required={Boolean(required)}
                        className={fieldClass}
                      />
                    )}
                  </label>
                ))}
                <label className="space-y-2 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-medium text-slate-600">
                  Giới tính
                  <SelectField defaultValue="MALE" name="gender">
                    <SelectOption value="MALE">Nam</SelectOption>
                    <SelectOption value="FEMALE">Nữ</SelectOption>
                    <SelectOption value="OTHER">Khác</SelectOption>
                  </SelectField>
                </label>
              </div>
            </section>
            <section>
              <h3 className="mb-4 text-sm font-semibold text-slate-900">
                Tài liệu đính kèm
              </h3>
              <div className="grid gap-4 lg:grid-cols-3">
                {[
                  ["idPhotoUrl", "Ảnh mặt trước CCCD"],
                  [
                    "degreeUrl",
                    course?.courseType === "AMBULANCE_DRIVER"
                      ? "Bằng lái xe"
                      : "Bằng cấp",
                  ],
                  ["paymentReceiptUrl", "Biên lai"],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className="min-w-0 space-y-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-medium text-slate-600"
                  >
                    {label}
                    <input
                      disabled={busy}
                      type="file"
                      accept="image/*,application/pdf"
                      required={
                        key !== "paymentReceiptUrl" &&
                        course?.courseType !== "COMMUNITY_FIRST_AID" &&
                        !uploads[key]
                      }
                      onChange={(e) =>
                        e.target.files?.[0] && upload(e.target.files[0], key)
                      }
                      className="block w-full text-[length:var(--ui-caption-size,0.8125rem)] leading-5 file:mb-2 file:mr-2 file:rounded-lg file:border-0 file:bg-white file:px-2 file:py-2 file:text-[length:var(--ui-caption-size,0.8125rem)] leading-5 file:text-blue-700"
                    />
                    {uploads[key] && (
                      <span className="flex items-center gap-1 text-emerald-700">
                        <CheckCircle size={13} />
                        Đã tải lên
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </section>
            <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
              <p className="max-w-sm text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-500">
                Hồ sơ mới sẽ chờ duyệt và đối soát thanh toán. Đăng ký vét vẫn
                kiểm tra sĩ số.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setManual(false)}
                  className={secondaryButton}
                >
                  Hủy
                </button>
                <button disabled={busy} className={primaryButton}>
                  {busy ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Lưu học viên
                </button>
              </div>
            </footer>
          </form>
        </AdminDialog>
      )}
    </section>
  );
}
