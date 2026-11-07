"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {PendingLink as Link} from "@/components/navigation/navigation-feedback";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  LayoutDashboard,
  Link2,
  Menu,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { can } from "@/lib/permissions";
import type { PermissionKey } from "@/lib/permission-catalog";
import type { Actor } from "@/lib/permissions";
import {NavigationProvider,NavigationContent} from "@/components/navigation/navigation-feedback";
import { AccountMenu } from "./account-menu";
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
  { href: "/registrations", label: "Đăng ký", icon: ClipboardCheck },
  { href: "/students", label: "Hồ sơ học viên", icon: Users },
  { href: "/course-links", label: "Liên kết", icon: Link2 },
  { href: "/users", label: "Tài khoản", icon: Users, admin: true },
  { href: "/permissions", label: "Phân quyền", icon: ShieldCheck, admin: true },
  { href: "/settings", label: "Cài đặt", icon: Settings2, admin: true },
];
export function AdminShell({
  actor,
  email = null,
  children,
  version,
}: {
  version: string;
  actor: Actor;
  email?: string | null;
  children: ReactNode;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [heading, setHeading] = useState<PageTitle | null>(null);
  const main = useRef<HTMLElement>(null);
  const previousPath = useRef(path);
  useEffect(() => {
    const classTabRoot=(value:string)=>value.match(/^\/courses\/([^/]+)(?:\/sessions)?$/)?.[1];
    const previous=classTabRoot(previousPath.current),next=classTabRoot(path);
    if(!previous || previous !== next){
      let anchor:HTMLElement|null=null;
      try{if(window.location.hash)anchor=document.getElementById(decodeURIComponent(window.location.hash.slice(1)));}catch{/* An invalid fragment must not interrupt navigation. */}
      if(anchor)anchor.scrollIntoView({block:"start"});else main.current?.scrollTo({top:0,left:0});
    }
    previousPath.current=path;
  }, [path]);
  const current = heading?.path === path ? heading : null;
  const routeTitle =
    path === "/help" ? "Hỗ trợ và phiên bản" : path === "/account" ? "Tài khoản của tôi" : path === "/"
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

  const role = actor.roleName || (
    actor.role === "ADMIN"
      ? "Quản trị"
      : actor.role === "CLASS_MANAGER"
        ? "Quản lý lớp"
        : "Kế toán");
  const menuPermissions: Record<string, PermissionKey> = { "/": "dashboard.view", "/courses": "classes.view", "/registrations": "registrations.view", "/students": "students.view", "/course-links": "links.view", "/users": "users.manage", "/permissions": "roles.manage", "/settings": "settings.manage" };
  const navigation = (
    <nav aria-label="Điều hướng quản trị" className="space-y-1 p-3">
      {links
        .filter((link) => can(actor, menuPermissions[link.href]))
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
  return (
    <NavigationProvider><PageTitleContext.Provider value={setHeading}>
      <div className="admin-shell flex h-dvh overflow-hidden bg-background text-foreground">
        <a
          href="#admin-main"
          className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-primary p-3 text-primary-foreground focus:not-sr-only"
        >
          Đến nội dung chính
        </a>
        <aside className="hidden w-64 shrink-0 flex-col border-r bg-white lg:flex">
          <Link href="/" className="flex h-20 items-center gap-3 border-b px-5">
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
            </span>
          </Link>
          <div className="flex-1 overflow-y-auto py-4">
            <p className="px-6 pb-2 text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
              Quản lý đào tạo
            </p>
            {navigation}
          </div>
          <div className="space-y-3 border-t p-3">
            <AccountMenu username={actor.username} email={email} role={role} onNavigate={()=>setOpen(false)}/>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header
            data-slot="admin-topbar"
            className="flex h-20 shrink-0 items-center justify-between gap-3 border-b bg-white px-4 lg:px-5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild><Button variant="outline" size="icon" className="lg:hidden" aria-label="Mở menu quản trị"><Menu/></Button></SheetTrigger>
                <SheetContent side="left" className="admin-shell w-[min(320px,88vw)] gap-0 bg-white">
                  <SheetHeader className="border-b p-5 pr-14"><SheetTitle>115 Đào tạo</SheetTitle><SheetDescription>Điều hướng quản trị</SheetDescription></SheetHeader>
                  <div className="flex-1 overflow-auto py-3">{navigation}</div>
                  <div className="border-t p-3"><AccountMenu username={actor.username} email={email} role={role} onNavigate={()=>setOpen(false)}/></div>
                </SheetContent>
              </Sheet>
              <div className="min-w-0">
                {current?.parent&&<Link href={current.parent.href} className="mb-1 flex max-w-full items-center gap-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground hover:text-primary"><ArrowLeft className="size-3 shrink-0"/><span className="truncate">{current.parent.label}</span></Link>}
                <h1 data-slot="admin-page-title" title={title} className="truncate text-base font-semibold tracking-tight sm:text-lg">{title}</h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-3"><Link href="/help#versions" aria-label={`Phiên bản ${version}`} className="rounded-md px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-muted">v{version}</Link><div className="lg:hidden"><AccountMenu username={actor.username} email={email} role={role} compact/></div></div>
          </header>
          <main
            ref={main}
            id="admin-main"
            tabIndex={-1}
            className="min-w-0 flex-1 overflow-auto outline-none [scrollbar-gutter:stable]"
          >
            <div className="w-full min-w-0 p-4 lg:p-5"><NavigationContent>{children}</NavigationContent></div>
          </main>
        </div>
        <Toaster position="top-right" />
      </div>
    </PageTitleContext.Provider></NavigationProvider>
  );
}
