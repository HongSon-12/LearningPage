import React from "react";
import SearchClient from "./SearchClient";

export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  title: "Tra cứu lịch sử học - TTCC115",
  description:
    "Xác thực email để xem hồ sơ và lịch sử học tại Trung tâm Cấp cứu 115",
};

export default function SearchPage() {
  return (
    <div className="py-12 flex flex-col items-center justify-start min-h-[70vh] space-y-12">
      <div className="text-center space-y-4 max-w-2xl px-4">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
          Tra cứu <span className="text-gradient">Hồ sơ & Chứng chỉ</span>
        </h1>
        <p className="text-gray-600 text-lg font-medium">
          Nhập số căn cước công dân, xác thực bằng mã gửi đến email trong hồ sơ
          học viên để xem lịch sử học.
        </p>
      </div>

      <div className="w-full px-4">
        <SearchClient />
      </div>
    </div>
  );
}
