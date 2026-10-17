import { pageUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import Link from "next/link";
import Image from "next/image";
import React from "react";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const actor = await pageUser();
  return (
    <div className="flex h-screen bg-[var(--color-background)] overflow-hidden text-[var(--color-foreground)]">
      {/* Sidebar */}
      <aside className="w-64 glass flex-shrink-0 flex flex-col z-20">
        <div className="h-20 flex items-center justify-center border-b border-[var(--color-border)] px-4">
          <Link href="/" className="flex items-center space-x-2">
            <Image 
              src="/Logo/logo TTCC115 goc trong suot 500x500.png" 
              alt="Logo TTCC 115" 
              width={40} 
              height={40} 
              className="object-contain"
            />
            <span className="text-xl font-bold text-gradient">115 Admin</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 font-medium text-gray-700">
          <Link
            href="/"
            className="block px-4 py-2.5 rounded-lg hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-600)] transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/courses"
            className="block px-4 py-2.5 rounded-lg hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-600)] transition-colors"
          >
            Khóa Học
          </Link>
          <Link
            href="/registrations"
            className="block px-4 py-2.5 rounded-lg hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-600)] transition-colors"
          >
            Kiểm tra đăng ký
          </Link>
          {actor.role === "ADMIN" && <Link
            href="/settings"
            className="block px-4 py-2.5 rounded-lg hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-600)] transition-colors"
          >
            Cài Đặt
          </Link>}
          {actor.role === "ADMIN" && <Link href="/users" className="block px-4 py-2.5 rounded-lg hover:bg-blue-50">Tài khoản & Phân quyền</Link>}
          <Link href="/course-links" className="block px-4 py-2.5 rounded-lg hover:bg-blue-50">Link khóa học</Link>
        </nav>
        <div className="p-4 border-t border-[var(--color-border)]">
          <form action={logout}><button className="w-full px-4 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-lg font-bold transition-colors">
            Đăng xuất
          </button></form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-20 glass flex items-center justify-between px-8 border-b border-[var(--color-border)] z-10">
          <h2 className="text-xl font-bold text-gray-800">Hệ thống Quản trị</h2>
          <div className="flex items-center space-x-4"><span className="text-sm">{actor.username} · {actor.role === "ADMIN" ? "Quản trị" : actor.role === "CLASS_MANAGER" ? "Quản lý lớp" : "Kế toán"}</span>
            <div className="w-10 h-10 rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-700)] font-bold border border-[var(--color-brand-200)] flex items-center justify-center shadow-sm">
              {actor.username.slice(0,2).toUpperCase()}
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          {/* Subtle background glow effect */}
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-100 rounded-full mix-blend-multiply filter blur-[150px] opacity-40 pointer-events-none"></div>
          
          <div className="relative z-10">{children}</div>
        </div>
      </main>
    </div>
  );
}
