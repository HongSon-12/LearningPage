"use client";

import React, { useState } from "react";
import { Save, Loader2, Info } from "lucide-react";
import { updateSettings } from "@/app/actions/settings";

type SettingData = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  transferSyntax: string;
  googleAnalyticsId: string | null;
  facebookPixelId: string | null;
  microsoftClarityId: string | null;
};

export default function SettingsForm({ initialData }: { initialData: SettingData }) {
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ show: boolean, msg: string, type: 'success' | 'error' }>({ show: false, msg: "", type: "success" });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setToast({ show: false, msg: "", type: "success" });
    
    const formData = new FormData(e.currentTarget);
    const res = await updateSettings(formData);
    
    setIsLoading(false);
    if (res.success) {
      setToast({ show: true, msg: "Cập nhật cấu hình thành công!", type: "success" });
    } else {
      setToast({ show: true, msg: res.error || "Đã xảy ra lỗi", type: "error" });
    }

    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {toast.show && (
        <div className={`p-4 rounded-xl text-sm font-bold border ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-2xl gap-6">
        <div className="space-y-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Thông tin Thanh toán VietQR</h3>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Ngân hàng thụ hưởng</label>
            <input 
              name="bankName" 
              defaultValue={initialData.bankName} 
              required 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-gray-800" 
              placeholder="VD: Vietcombank" 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Tên chủ tài khoản</label>
            <input 
              name="accountName" 
              defaultValue={initialData.accountName} 
              required 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-gray-800" 
              placeholder="VD: TRUNG TAM CAP CUU 115" 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Số tài khoản</label>
            <input 
              name="accountNumber" 
              defaultValue={initialData.accountNumber} 
              required 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-gray-800" 
              placeholder="VD: 123456789" 
            />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 flex justify-end">
        <button 
          type="submit" 
          disabled={isLoading} 
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition-colors flex justify-center items-center gap-2 disabled:opacity-70"
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          Lưu Cấu hình
        </button>
      </div>
    </form>
  );
}
