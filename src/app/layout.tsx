import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trung Tâm Cấp Cứu 115 - Hệ Thống Đào Tạo",
  description:
    "Hệ thống quản lý khóa học và đào tạo của Trung Tâm Cấp Cứu 115 Thành phố Hồ Chí Minh.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth scroll-pt-24`}
      data-scroll-behavior="smooth"
    >
      {/* Third-party analytics remain paused until route/consent isolation is implemented. */}
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
