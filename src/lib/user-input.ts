import { z } from "zod";
export const roleLabels = {
  ADMIN: "Quản trị",
  CLASS_MANAGER: "Quản lý lớp",
  ACCOUNTANT: "Kế toán",
};
export const roleDescriptions = {
  ADMIN: "Quản lý toàn bộ hệ thống, tài khoản, phân quyền và cấu hình.",
  CLASS_MANAGER:
    "Quản lý lớp được phân công: học viên, hồ sơ, buổi học và điểm danh. Không quản lý tài khoản hoặc đối soát học phí.",
  ACCOUNTANT:
    "Đối soát học phí, biên lai và hóa đơn. Không sửa tài khoản, hồ sơ căn cước hoặc điểm danh.",
};
export const userInput = z
  .object({
    id: z.string(),
    username: z
      .string()
      .trim()
      .regex(
        /^[a-zA-Z0-9_.-]{3,60}$/,
        "Tên đăng nhập gồm 3–60 chữ, số, dấu chấm, gạch ngang hoặc gạch dưới.",
      ),
    password: z
      .string()
      .refine(
        (value) =>
          !value ||
          (value.length >= 10 && new TextEncoder().encode(value).length <= 72),
        "Mật khẩu cần ít nhất 10 ký tự và tối đa 72 byte (chữ có dấu chiếm nhiều byte).",
      ),
    email: z.union([z.email("Email không hợp lệ.").max(254), z.literal("")]).optional(),
    customRoleId: z.union([z.uuid(), z.literal("")]).optional(),
    role: z.enum(["ADMIN", "CLASS_MANAGER", "ACCOUNTANT"]),
    active: z.boolean(),
  })
  .refine((value) => value.id || value.password, {
    path: ["password"],
    message: "Nhập mật khẩu cho tài khoản mới.",
  });
export type UserInput = z.infer<typeof userInput>;

// Directory identity fields are displayed read-only; only role/access are submitted to the server.
export const ssoUserEditorInput = z.object({
  id:z.uuid(), username:z.string().min(1).max(150), password:z.string().max(0),
  email:z.string().optional(), customRoleId:z.union([z.uuid(),z.literal("")]).optional(),
  role:z.enum(["ADMIN","CLASS_MANAGER","ACCOUNTANT"]), active:z.boolean(),
});
