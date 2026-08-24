import React, { Suspense } from "react";
import Navbar from "./components/Navbar";
import FloatingCall from "./components/FloatingCall";
import TrackingProvider from "./components/TrackingProvider";

export default function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)] text-[var(--color-foreground)] relative">
      {/* Background glow effects for Light Theme */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-100 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 pointer-events-none"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-rose-50 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 pointer-events-none"></div>

      <Navbar />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <Suspense fallback={<div>Loading...</div>}>
          <TrackingProvider>
            {children}
          </TrackingProvider>
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="glass border-t border-[var(--color-border)] py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-gray-500 font-medium">
          <div className="text-center md:text-left">
            <h4 className="text-lg font-bold text-gray-900 mb-2">Trung tâm Cấp cứu 115 TP.HCM</h4>
            <p>266A Lý Thường Kiệt, P.14, Quận 10, TP.HCM</p>
            <p className="mt-1">Hotline đào tạo: 0387 644 522 (BS Vĩnh Lộc)</p>
          </div>
          <div className="text-center md:text-right">
            <p>© 2026 Bản quyền thuộc về TTCC 115 TP.HCM.</p>
            <p className="mt-1">Hệ thống Quản lý Đào tạo.</p>
          </div>
        </div>
      </footer>

      <FloatingCall />
    </div>
  );
}
