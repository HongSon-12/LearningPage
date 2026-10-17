"use client";
import { SelectOption } from "@/components/forms/select-field";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";
import type { Class } from "@prisma/client";
import { programs, type ProgramType } from "@/lib/programs";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  ControlledSelectField,
  ControlledDateTimeField,
} from "./controlled-fields";
import { TextField } from "./text-field";

const courseTypes = [
  "COMMUNITY_FIRST_AID",
  "CME_ABCDE",
  "AMBULANCE_DRIVER",
  "CPR_ADVANCED",
  "CPR_BASIC",
] as const;
const audiences = [
  { value: "DOCTOR", label: "Bác sĩ" },
  { value: "NURSE", label: "Điều dưỡng" },
  { value: "PHYSICIAN", label: "Y sĩ" },
  { value: "DRIVER", label: "Nhân viên lái xe" },
  { value: "COMMUNITY", label: "Cộng đồng" },
];
const schema = z.object({
  code: z.string().min(1, "Nhập mã lớp."),
  name: z.string().min(1, "Nhập tên lớp."),
  courseType: z.enum(courseTypes),
  courseBatch: z.string(),
  fee: z
    .string()
    .min(1, "Nhập học phí.")
    .refine(
      (value) => Number.isFinite(Number(value)) && Number(value) >= 0,
      "Học phí không hợp lệ.",
    ),
  location: z.string().min(1, "Nhập địa điểm học."),
  startDate: z.string().min(1, "Chọn ngày bắt đầu."),
  endDate: z.string().min(1, "Chọn ngày kết thúc."),
  startTime: z.string().min(1, "Chọn giờ bắt đầu."),
  endTime: z.string().min(1, "Chọn giờ kết thúc."),
  registrationDeadline: z.string(),
  totalLessons: z.string(),
  capacity: z
    .string()
    .refine(
      (value) => Number.isInteger(Number(value)) && Number(value) >= 1,
      "Sĩ số phải là số nguyên từ 1 trở lên.",
    ),
  targetAudiences: z.array(z.string()),
  certificateType: z.enum(["CERTIFICATE", "CONFIRMATION"]),
  status: z.enum(["OPEN", "FULL", "DONE"]),
});
type Values = z.infer<typeof schema>;
const dateValue = (date: Date | null | undefined) =>
  date ? new Date(date).toISOString().slice(0, 10) : "";

export function ClassForm({
  course,
  onSave,
  onCancel,
}: {
  course?: Class | null;
  onSave: (form: FormData) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: course?.code ?? "",
      name: course?.name ?? "",
      courseType: course?.courseType ?? "COMMUNITY_FIRST_AID",
      courseBatch: course?.courseBatch ?? "",
      fee: String(course?.fee ?? 0),
      location: course?.location ?? "TTCC115, Quận 10",
      startDate: dateValue(course?.startDate),
      endDate: dateValue(course?.endDate),
      startTime: course?.startTime ?? "",
      endTime: course?.endTime ?? "",
      registrationDeadline: dateValue(course?.registrationDeadline),
      totalLessons: String(course?.totalLessons ?? 0),
      capacity: String(course?.capacity ?? 40),
      targetAudiences: course?.targetAudiences ?? [],
      certificateType: course?.certificateType ?? "CERTIFICATE",
      status: course?.status ?? "OPEN",
    },
  });
  async function submit(values: Values) {
    const form = new FormData();
    for (const [key, value] of Object.entries(values)) {
      if (key === "targetAudiences") continue;
      form.set(key, String(value));
    }
    values.targetAudiences.forEach((value) =>
      form.append("targetAudiences", value),
    );
    try {
      const result = await onSave(form);
      if (!result.success)
        setError("root", { message: result.error || "Không thể lưu lớp học." });
    } catch {
      setError("root", {
        message: "Không thể lưu lớp học. Thông tin đã nhập vẫn được giữ.",
      });
    }
  }
  const textFields: {
    name: keyof Omit<
      Values,
      "targetAudiences" | "courseType" | "certificateType" | "status"
    >;
    label: string;
    type?: string;
    required?: boolean;
    min?: number;
    step?: string;
  }[] = [
    { name: "code", label: "Mã lớp", required: true },
    { name: "name", label: "Tên lớp", required: true },
    { name: "courseBatch", label: "Khóa (VD: K1, K2)" },
    {
      name: "fee",
      label: "Học phí (VNĐ)",
      type: "number",
      required: true,
      min: 0,
      step: "any",
    },
    { name: "location", label: "Địa điểm học", required: true },
    { name: "startDate", label: "Ngày bắt đầu", type: "date", required: true },
    { name: "endDate", label: "Ngày kết thúc", type: "date", required: true },
    { name: "startTime", label: "Giờ bắt đầu", type: "time", required: true },
    { name: "endTime", label: "Giờ kết thúc", type: "time", required: true },
    { name: "registrationDeadline", label: "Hạn chót đăng ký", type: "date" },
    {
      name: "capacity",
      label: "Sĩ số tối đa",
      type: "number",
      required: true,
      min: 1,
    },
    { name: "totalLessons", label: "Tổng số tiết", type: "number" },
  ];
  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="space-y-6"
      aria-busy={isSubmitting}
    >
      {errors.root && (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          {errors.root.message}
        </p>
      )}
      <fieldset disabled={isSubmitting} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="gap-2">
            <FieldLabel htmlFor="class-courseType">Loại khóa học</FieldLabel>
            <ControlledSelectField
              id="class-courseType"
              name="courseType"
              control={control}
              aria-invalid={Boolean(errors.courseType)}
            >
              {courseTypes.map((type) => (
                <SelectOption key={type} value={type}>
                  {programs[type as ProgramType].name}
                </SelectOption>
              ))}
            </ControlledSelectField>
            <FieldError errors={[errors.courseType]} />
          </Field>
          {textFields.map(({ name, label, ...props }) =>
            props.type === "date" || props.type === "time" ? (
              <ControlledDateTimeField
                key={name}
                name={name}
                control={control}
                id={`class-${name}`}
                label={label}
                mode={props.type}
                required={props.required}
              />
            ) : (
              <TextField
                key={name}
                id={`class-${name}`}
                label={label}
                {...props}
                {...register(name)}
                error={errors[name]?.message}
              />
            ),
          )}
          <Field className="gap-2">
            <FieldLabel htmlFor="class-certificateType">
              Loại chứng chỉ
            </FieldLabel>
            <ControlledSelectField
              id="class-certificateType"
              name="certificateType"
              control={control}
            >
              <SelectOption value="CERTIFICATE">Giấy chứng nhận</SelectOption>
              <SelectOption value="CONFIRMATION">Giấy xác nhận</SelectOption>
            </ControlledSelectField>
            <FieldError errors={[errors.certificateType]} />
          </Field>
          {course && (
            <Field className="gap-2">
              <FieldLabel htmlFor="class-status">Trạng thái lớp học</FieldLabel>
              <ControlledSelectField
                id="class-status"
                name="status"
                control={control}
              >
                <SelectOption value="OPEN">Đang mở (OPEN)</SelectOption>
                <SelectOption value="FULL">Đã đầy (FULL)</SelectOption>
                <SelectOption value="DONE">Đã kết thúc (DONE)</SelectOption>
              </ControlledSelectField>
              <FieldError errors={[errors.status]} />
            </Field>
          )}
        </div>
        <fieldset className="rounded-xl border p-4">
          <legend className="px-1 text-sm font-medium">
            Đối tượng đăng ký
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {audiences.map((item) => (
              <label
                key={item.value}
                className="flex min-h-11 items-center gap-3 text-sm"
              >
                <input
                  type="checkbox"
                  value={item.value}
                  {...register("targetAudiences")}
                  className="size-4 accent-blue-600"
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>
        <footer className="flex flex-wrap justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
            {isSubmitting
              ? "Đang lưu…"
              : course
                ? "Lưu thay đổi"
                : "Lưu Khóa Học"}
          </Button>
        </footer>
      </fieldset>
    </form>
  );
}
