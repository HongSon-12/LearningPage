"use client";

import React, { useState } from "react";
import { Search, FileText, CheckCircle, Clock, XCircle, Download } from "lucide-react";
import { searchRegistrations } from "@/app/actions/search";

export default function SearchClient() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError("");
    const res = await searchRegistrations(query);
    
    if (res.success) {
      setResults(res.data || []);
    } else {
      setError(res.error || "Có lỗi xảy ra");
    }
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-12">
      <form onSubmit={handleSearch} className="w-full max-w-xl mx-auto">
        <div className="glass-card p-2 rounded-2xl flex items-center shadow-lg shadow-blue-500/10 border border-gray-200/50 bg-white/80 backdrop-blur-xl">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập số CCCD, SĐT, hoặc Mã HĐĐT..." 
            className="flex-1 bg-transparent px-6 py-4 outline-none text-gray-800 font-medium placeholder:text-gray-400"
          />
          <button 
            type="submit"
            disabled={isLoading}
            className="bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white p-4 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <Search size={24} />}
          </button>
        </div>
        {error && <div className="text-rose-500 text-center mt-4 font-medium">{error}</div>}
      </form>

      {results !== null && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-4">Kết quả tra cứu ({results.length})</h2>
          
          {results.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 text-center text-gray-500 font-medium">
              Không tìm thấy thông tin đăng ký nào khớp với từ khóa của bạn.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {results.map((reg, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                  {/* Left Column */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-[var(--color-brand-700)]">{reg.class.name}</h3>
                      <div className="text-gray-500 font-medium">Mã lớp: {reg.class.code}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div>
                        <div className="text-xs text-gray-500 uppercase font-semibold">Học viên</div>
                        <div className="font-bold text-gray-900">{reg.fullName}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase font-semibold">CCCD / SĐT</div>
                        <div className="font-bold text-gray-900">{reg.cccd || reg.phone}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase font-semibold">Trạng thái Hồ sơ</div>
                        <div className={`font-bold flex items-center gap-1 ${
                          reg.status === "APPROVED" ? "text-emerald-600" : 
                          reg.status === "REJECTED" ? "text-rose-600" : "text-blue-600"
                        }`}>
                          {reg.status === "APPROVED" ? <><CheckCircle size={14}/> Đã duyệt</> : 
                           reg.status === "REJECTED" ? <><XCircle size={14}/> Bị từ chối</> : 
                           <><Clock size={14}/> Đang chờ xử lý</>}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase font-semibold">Thanh toán</div>
                        <div className={`font-bold flex items-center gap-1 ${
                          reg.paymentStatus === "PAID" ? "text-emerald-600" : 
                          reg.paymentStatus === "CANCELLED" ? "text-rose-600" : "text-orange-600"
                        }`}>
                          {reg.paymentStatus === "PAID" ? <><CheckCircle size={14}/> Đã T.Toán</> : 
                           reg.paymentStatus === "CANCELLED" ? <><XCircle size={14}/> Đã hủy</> : 
                           <><Clock size={14}/> Chờ T.Toán</>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {reg.confirmationNumber && <p className="font-bold">Số GXN: {reg.confirmationNumber}</p>}
                  {/* Right Column (Codes) */}
                  <div className="w-full md:w-64 space-y-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <div className="text-xs text-[var(--color-brand-600)] uppercase font-semibold mb-1 flex items-center gap-1"><FileText size={14}/> Mã HĐĐT</div>
                      {reg.invoiceCode ? (
                        <div className="font-bold text-gray-900 text-lg tracking-wide">{reg.invoiceCode}</div>
                      ) : (
                        <div className="text-gray-400 italic text-sm">Chưa phát hành</div>
                      )}
                    </div>

                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                      <div className="text-xs text-emerald-600 uppercase font-semibold mb-1 flex items-center gap-1"><CheckCircle size={14}/> Mã {reg.class.certificateType === "CERTIFICATE" ? "Chứng chỉ" : "Giấy XN"}</div>
                      {reg.certificateCode ? (
                        <div className="font-bold text-gray-900 text-lg tracking-wide">{reg.certificateCode}</div>
                      ) : (
                        <div className="text-gray-400 italic text-sm">Chưa cấp</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
