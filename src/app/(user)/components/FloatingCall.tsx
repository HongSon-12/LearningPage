"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { PhoneCall } from "lucide-react";

export default function FloatingCall() {
  const pathname = usePathname();
  if (pathname.startsWith("/register/")) return null;
  return (
    <a 
      href="tel:0387644522" 
      className="fixed bottom-6 right-6 z-[60] w-16 h-16 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-700 transition-colors group"
    >
      {/* Pulse animation circles */}
      <span className="absolute w-full h-full rounded-full bg-rose-600 opacity-40 animate-ping" style={{ animationDuration: '2s' }}></span>
      <span className="absolute w-12 h-12 rounded-full bg-rose-500 opacity-60 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.2s' }}></span>
      
      <PhoneCall size={28} className="relative z-10" />

      {/* Tooltip on hover */}
      <div className="absolute right-[80px] top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm font-bold px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
        Gọi Tư vấn: 0387 644 522
        {/* Triangle arrow */}
        <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-l-[6px] border-l-gray-900"></div>
      </div>
    </a>
  );
}
