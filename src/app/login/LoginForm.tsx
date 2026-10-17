"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { login } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/forms/text-field";

const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Nhập tên đăng nhập.")
    .max(100, "Tên đăng nhập tối đa 100 ký tự."),
  password: z
    .string()
    .min(1, "Nhập mật khẩu.")
    .max(200, "Mật khẩu tối đa 200 ký tự."),
});
type LoginValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });
  async function submit(values: LoginValues) {
    const form = new FormData();
    form.set("username", values.username);
    form.set("password", values.password);
    try {
      const result = await login(form);
      if (result.success) {
        router.replace("/");
        router.refresh();
      } else
        setError("root", { message: result.error || "Đăng nhập thất bại." });
    } catch {
      setError("root", { message: "Không thể đăng nhập. Vui lòng thử lại." });
    }
  }
  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="space-y-5"
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
      <fieldset disabled={isSubmitting} className="space-y-5">
        <TextField
          label="Tên đăng nhập"
          id="login-username"
          autoComplete="username"
          placeholder="Tên tài khoản của bạn"
          maxLength={100}
          required
          {...register("username")}
          error={errors.username?.message}
        />
        <TextField
          label="Mật khẩu"
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="Nhập mật khẩu"
          maxLength={200}
          required
          {...register("password")}
          error={errors.password?.message}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <ArrowRight />}{" "}
          {isSubmitting ? "Đang đăng nhập…" : "Đăng nhập hệ thống"}
        </Button>
      </fieldset>
    </form>
  );
}
