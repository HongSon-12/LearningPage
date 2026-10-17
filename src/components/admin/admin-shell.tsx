"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { Actor } from "@/lib/permissions";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { PageTitleContext, type PageTitle } from "./page-heading";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/courses", label: "Lớp học", icon: BookOpen },
  { href: "/registrations", label: "Kiểm tra đăng ký", icon: ClipboardCheck },
  { href: "/students", label: "Hồ sơ học viên", icon: Users },
  { href: "/course-links", label: "Link khóa học", icon: Link2 },
  { href: "/users", label: "Tài khoản & Phân quyền", icon: Users, admin: true },
  { href: "/settings", label: "Cài Đặt", icon: Settings2, admin: true },
];
export function AdminShell({
  actor,
  children,
}: {
  actor: Actor;
  children: ReactNode;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [heading, setHeading] = useState<PageTitle | null>(null);
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    main.current?.scrollTo({ top: 0, left: 0 });
  }, [path]);
  const current = heading?.path === path ? heading : null;
  const routeTitle =
    path === "/"
      ? "Tổng quan hệ thống"
      : path.includes("/sessions/")
        ? "Điểm danh"
        : path.endsWith("/sessions")
          ? "Buổi học"
          : path.startsWith("/courses/")
            ? "Học viên của lớp"
            : path.startsWith("/students/")
              ? "Hồ sơ học viên"
              : links.find(
                  (link) =>
                    link.href !== "/" &&
                    (path === link.href || path.startsWith(link.href + "/")),
                )?.label || "Quản lý đào tạo";
  const title = current?.title || routeTitle;

  const role =
    actor.role === "ADMIN"
      ? "Quản trị"
      : actor.role === "CLASS_MANAGER"
        ? "Quản lý lớp"
        : "Kế toán";
  const navigation = (
    <nav aria-label="Điều hướng quản trị" className="space-y-1 p-3">
      {links
        .filter((link) => !link.admin || actor.role === "ADMIN")
        .map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? path === href
              : path === href || path.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-ring",
                active && "bg-blue-50 text-blue-700 hover:bg-blue-50",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
    </nav>
  );
  const exit = (
    <form action={logout}>
      <Button
        type="submit"
        variant="outline"
        className="w-full justify-start text-slate-600"
      >
        <LogOut aria-hidden="true" />
        Đăng xuất
      </Button>
    </form>
  );
  return (
    <PageTitleContext.Provider value={setHeading}>
      <div className="admin-shell flex h-dvh overflow-hidden bg-background text-foreground">
        <a
          href="#admin-main"
          className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-primary p-3 text-primary-foreground focus:not-sr-only"
        >
          Đến nội dung chính
        </a>
        <aside className="hidden w-64 shrink-0 flex-col border-r bg-white lg:flex">
          <Link href="/" className="flex h-16 items-center gap-3 border-b px-5">
            <Image
              src="/Logo/logo TTCC115 goc trong suot 500x500.png"
              alt="TTCC 115"
              width={42}
              height={42}
            />
            <span>
              <span className="block text-lg font-bold tracking-tight text-slate-900">
                115 Đào tạo
              </span>
              <span className="text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">
                Không gian quản trị
              </span>
            </span>
          </Link>
          <div className="flex-1 overflow-y-auto py-4">
            <p className="px-6 pb-2 text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
              Quản lý đào tạo
            </p>
            {navigation}
          </div>
          <div className="space-y-3 border-t p-3">
            <div className="flex items-center gap-2 px-3 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-500">
              <ShieldCheck className="size-4" />
              Trung tâm Cấp cứu 115 TP.HCM
            </div>
            {exit}
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header
            data-slot="admin-topbar"
            className="flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-white px-4 lg:px-5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="lg:hidden"
                    aria-label="Mở menu quản trị"
                  >
                    <Menu />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="admin-shell w-[min(320px,88vw)] gap-0 bg-white"
                >
                  <SheetHeader className="border-b p-5 pr-14">
                    <SheetTitle>115 Đào tạo</SheetTitle>
                    <SheetDescription>Điều hướng quản trị</SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-auto py-3">{navigation}</div>
                  <div className="border-t p-3">{exit}</div>
                </SheetContent>
              </Sheet>
              <div className="min-w-0">
                {current?.parent && (
                  <Link
                    href={current.parent.href}
                    className="mb-0.5 flex max-w-full items-center gap-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground hover:text-primary"
                  >
                    <ArrowLeft className="size-3 shrink-0" />
                    <span className="truncate">{current.parent.label}</span>
                  </Link>
                )}
                <h1
                  data-slot="admin-page-title"
                  title={title}
                  className="truncate text-base font-semibold tracking-tight sm:text-lg"
                >
                  {title}
                </h1>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden min-w-0 text-right sm:block">
                <p className="max-w-44 truncate text-sm font-medium">
                  {actor.username}
                </p>
                <p className="text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">{role}</p>
              </div>
              <span
                title={`${actor.username} · ${role}`}
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-bold text-blue-700"
              >
                {actor.username.slice(0, 2).toUpperCase()}
              </span>
            </div>
          </header>
          <main
            ref={main}
            id="admin-main"
            tabIndex={-1}
            className="min-w-0 flex-1 overflow-auto outline-none"
          >
            <div className="w-full min-w-0 p-4 lg:p-5">{children}</div>
          </main>
        </div>
        <Toaster position="top-right" />
      </div>
    </PageTitleContext.Provider>
  );
}
