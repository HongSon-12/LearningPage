"use client";

import React, { useState } from "react";
import { Lock, User, Loader2 } from "lucide-react";
import { login } from "@/app/actions/auth";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const result = await login(new FormData(e.currentTarget as HTMLFormElement));
      if (result.success) {router.replace("/");router.refresh();}
      else setError(result.error || "Đăng nhập thất bại.");
    } catch {setError("Không thể đăng nhập. Vui lòng thử lại.");}
    finally {setIsLoading(false);}
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Tên đăng nhập</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <User size={18} />
          </div>
          <input
            name="username" autoComplete="username" type="text"
            required
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 font-medium text-gray-800 shadow-sm"
            placeholder="admin"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Mật khẩu</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Lock size={18} />
          </div>
          <input
            name="password" autoComplete="current-password" type="password"
            required
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 font-medium text-gray-800 shadow-sm"
            placeholder="••••••••"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow transition-all flex justify-center items-center gap-2 disabled:opacity-70"
      >
        {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Đăng nhập hệ thống"}
      </button>
    </form>
  );
}
