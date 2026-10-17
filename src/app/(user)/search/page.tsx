import React from "react";
import SearchClient from "./SearchClient";

export const metadata = {
  title: "Tra cứu chứng chỉ - TTCC115",
  description: "Tra cứu thông tin khóa học, hóa đơn và chứng chỉ của bạn tại Trung tâm Cấp cứu 115",
};

export default function SearchPage() {
  return (
    <div className="py-12 flex flex-col items-center justify-start min-h-[70vh] space-y-12">
      <div className="text-center space-y-4 max-w-2xl px-4">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
          Tra cứu <span className="text-gradient">Hồ sơ & Chứng chỉ</span>
        </h1>
        <p className="text-gray-600 text-lg font-medium">
          Nhập số điện thoại, số CCCD, Mã HĐĐT hoặc Số chứng chỉ để kiểm tra tình trạng hồ sơ của bạn.
        </p>
      </div>

      <div className="w-full px-4">
        <SearchClient />
      </div>
    </div>
  );
}
