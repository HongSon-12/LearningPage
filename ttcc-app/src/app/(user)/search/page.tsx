import React from "react";
import { Search } from "lucide-react";

export default function SearchPage() {
  return (
    <div className="py-12 flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="text-center space-y-4 max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
          Tra cứu <span className="text-gradient">Chứng chỉ</span>
        </h1>
        <p className="text-gray-600 text-lg font-medium">
          Nhập số CMND/CCCD hoặc Mã học viên để tra cứu thông tin chứng chỉ đào tạo của bạn.
        </p>
      </div>

      <div className="w-full max-w-xl">
        <div className="glass-card p-2 rounded-2xl flex items-center shadow-lg shadow-blue-500/10">
          <input 
            type="text" 
            placeholder="Nhập số CCCD / Mã chứng chỉ..." 
            className="flex-1 bg-transparent px-6 py-4 outline-none text-gray-800 font-medium placeholder:text-gray-400"
          />
          <button className="bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white p-4 rounded-xl transition-all">
            <Search size={24} />
          </button>
        </div>
      </div>
      
      <div className="text-center text-gray-500 font-medium mt-12 bg-white/50 px-8 py-4 rounded-xl border border-gray-100">
        Tính năng đang được phát triển và sẽ sớm ra mắt...
      </div>
    </div>
  );
}
