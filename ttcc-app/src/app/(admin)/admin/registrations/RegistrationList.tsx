"use client";

import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { updatePaymentStatus, deleteRegistration } from "@/app/actions/adminRegistration";

type RegistrationData = {
  id: string;
  fullName: string;
  phone: string;
  paymentStatus: string;
  createdAt: Date;
  class: {
    code: string;
    name: string;
  };
};

export default function RegistrationList({ initialData }: { initialData: RegistrationData[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleStatusChange = async (id: string, newStatus: "PENDING" | "PAID" | "CANCELLED") => {
    setLoadingId(id);
    const res = await updatePaymentStatus(id, newStatus);
    if (!res.success) alert(res.error);
    setLoadingId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa lượt đăng ký này? Dữ liệu không thể khôi phục.")) {
      setLoadingId(id);
      const res = await deleteRegistration(id);
      if (!res.success) alert(res.error);
      setLoadingId(null);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
              <th className="p-4">Học viên</th>
              <th className="p-4">Số điện thoại</th>
              <th className="p-4">Lớp học</th>
              <th className="p-4">Ngày đăng ký</th>
              <th className="p-4">Thanh toán</th>
              <th className="p-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-gray-800">
            {initialData.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500 font-medium">
                  Chưa có học viên nào đăng ký.
                </td>
              </tr>
            ) : (
              initialData.map((reg) => (
                <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-bold text-gray-900">{reg.fullName}</td>
                  <td className="p-4 font-medium">{reg.phone}</td>
                  <td className="p-4">
                    <span className="font-bold text-blue-700">{reg.class.code}</span>
                    <div className="text-xs text-gray-500 mt-1">{reg.class.name}</div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {new Date(reg.createdAt).toLocaleDateString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-4">
                    <select
                      disabled={loadingId === reg.id}
                      value={reg.paymentStatus}
                      onChange={(e) => handleStatusChange(reg.id, e.target.value as any)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold outline-none border-2 transition-colors ${
                        reg.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        reg.paymentStatus === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                        'bg-orange-50 text-orange-700 border-orange-200'
                      }`}
                    >
                      <option value="PENDING">CHỜ THANH TOÁN</option>
                      <option value="PAID">ĐÃ THANH TOÁN</option>
                      <option value="CANCELLED">ĐÃ HỦY</option>
                    </select>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      disabled={loadingId === reg.id}
                      onClick={() => handleDelete(reg.id)}
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-50 inline-flex"
                      title="Xóa lượt đăng ký"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
