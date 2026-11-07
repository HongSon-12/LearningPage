import {redirect} from "next/navigation";
import {ssoEnabled} from "@/lib/auth-mode";
import Link from "next/link";
import ResetForm from "./ResetForm";
export default function ForgotPasswordPage(){
  if(ssoEnabled()) redirect("https://sso.115.org.vn/if/user/");return <main className="auth-shell flex min-h-dvh items-center justify-center bg-background p-4"><section className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8"><h1 className="text-2xl font-semibold">Quên mật khẩu</h1><p className="text-sm text-muted-foreground">Nhận mã qua email khôi phục đã lưu trong tài khoản.</p><ResetForm/><Link href="/login" className="inline-flex min-h-11 items-center text-sm text-primary underline">Về đăng nhập</Link></section></main>;}

export const dynamic = "force-dynamic";
