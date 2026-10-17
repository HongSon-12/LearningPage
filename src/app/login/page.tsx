import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="auth-shell grid min-h-dvh bg-background lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-blue-950 p-12 text-white lg:flex xl:p-16">
        <div
          aria-hidden="true"
          className="absolute -right-48 -top-32 size-[640px] rounded-full border border-white/10"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-72 -left-24 size-[640px] rounded-full border border-white/10"
        />
        <Link href="/hocsocapcuu" className="relative flex items-center gap-4">
          <Image
            src="/Logo/logo TTCC115 goc trong suot 500x500.png"
            alt="TTCC 115"
            width={56}
            height={56}
            className="rounded-full bg-white p-1"
          />
          <div>
            <p className="text-lg font-semibold">Trung tâm Cấp cứu 115</p>
            <p className="text-sm text-blue-200">Thành phố Hồ Chí Minh</p>
          </div>
        </Link>
        <div className="relative max-w-lg space-y-6 py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-blue-100">
            <GraduationCap className="size-4" />
            Quản lý đào tạo
          </span>
          <h2 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            Kết nối đào tạo.
            <br />
            Đồng hành cùng học viên.
          </h2>
          <p className="max-w-md text-base leading-7 text-blue-200">
            Theo dõi lớp học, tiếp nhận hồ sơ và quản lý học viên trong một
            không gian làm việc.
          </p>
        </div>
        <p className="relative text-xs text-blue-200">
          Hệ thống quản lý đào tạo · TTCC 115 TP.HCM
        </p>
      </section>
      <section className="flex items-center justify-center p-4 py-10 sm:p-8">
        <div className="w-full max-w-md">
          <Link
            href="/hocsocapcuu"
            className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            Về trang đào tạo
          </Link>
          <Card className="gap-0 shadow-sm">
            <CardHeader className="space-y-3 p-6 pb-7 sm:p-8">
              <Image
                src="/Logo/logo TTCC115 goc trong suot 500x500.png"
                alt="Logo 115"
                width={60}
                height={60}
                className="mb-2 lg:hidden"
              />
              <CardTitle>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Đăng nhập Quản trị
                </h1>
              </CardTitle>
              <CardDescription>
                Dành cho nhân sự được cấp quyền quản lý đào tạo.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
              <LoginForm />
            </CardContent>
          </Card>
          <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
            Cần hỗ trợ tài khoản? Liên hệ quản trị hệ thống.
          </p>
        </div>
      </section>
    </main>
  );
}
