import {z} from "zod";
export const accountInput=z.object({
 email:z.string().trim().toLowerCase().pipe(z.union([z.email("Email không hợp lệ.").max(254),z.literal("")])),
 newPassword:z.string().refine(value=>!value||(value.length>=10&&new TextEncoder().encode(value).length<=72),"Mật khẩu mới cần ít nhất 10 ký tự, tối đa 72 byte."),
 confirmPassword:z.string().max(200),
}).strict().refine(value=>value.newPassword===value.confirmPassword,{path:["confirmPassword"],message:"Mật khẩu nhập lại chưa khớp."});
export type AccountInput=z.infer<typeof accountInput>;
