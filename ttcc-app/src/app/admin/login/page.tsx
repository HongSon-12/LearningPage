import React from "react";
import LoginForm from "./LoginForm";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-100 rounded-full mix-blend-multiply filter blur-[150px] opacity-70 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-rose-50 rounded-full mix-blend-multiply filter blur-[150px] opacity-70 pointer-events-none"></div>
      
      <div className="z-10 w-full max-w-md p-4">
        <div className="glass-card p-10 rounded-3xl shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <Image 
              src="/Logo/logo TTCC115 goc trong suot 500x500.png" 
              alt="Logo 115" 
              width={80} 
              height={80} 
              className="mb-4 drop-shadow-md"
            />
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Đăng nhập Quản trị</h1>
            <p className="text-gray-500 text-sm mt-2 font-medium">Hệ thống đào tạo TTCC 115</p>
          </div>
          
          <LoginForm />
          
        </div>
      </div>
    </div>
  );
}
