import { z } from "zod";
const localTime = z
  .string()
  .regex(/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Chọn ngày giờ hợp lệ.")
  .refine((value) => {
    const date = new Date(value + ":00+07:00");
    return (
      Number.isFinite(date.getTime()) &&
      new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 16) ===
        value
    );
  }, "Ngày giờ không hợp lệ.");
export const sessionInput = z
  .object({
    title: z.string().trim().min(1, "Nhập tên buổi học.").max(120),
    startsAt: localTime,
    endsAt: localTime,
    location: z.string().trim().max(250),
  })
  .refine((value) => value.endsAt > value.startsAt, {
    path: ["endsAt"],
    message: "Giờ kết thúc phải sau giờ bắt đầu.",
  })
  .refine(
    (value) =>
      new Date(value.endsAt).getTime() - new Date(value.startsAt).getTime() <=
      86400000,
    { path: ["endsAt"], message: "Một buổi học không quá 24 giờ." },
  );
export type SessionInput = z.infer<typeof sessionInput>;
export const sessionLocalTime = (value: Date | string) =>
  new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 16);
export const sessionTimeLabel = (value: Date | string) =>
  new Date(value).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  });
