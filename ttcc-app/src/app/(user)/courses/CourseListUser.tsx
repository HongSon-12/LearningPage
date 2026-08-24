"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { trackEvent } from "@/app/actions/tracking";

type CourseData = {
  id: string;
  code: string;
  name: string;
  date: Date;
  startTime: string;
  endTime: string;
  capacity: number;
  status: string;
  _count: { registrations: number };
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function CourseListUser({ courses }: { courses: CourseData[] }) {
  useEffect(() => {
    try {
      const sessionId = sessionStorage.getItem("ttcc_session_id");
      const source = sessionStorage.getItem("ttcc_source") || "direct";
      if (sessionId) {
        trackEvent(sessionId, source, "view_courses");
      }
    } catch (e) {}
  }, []);

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
    >
      {courses.map((course) => {
        const remainingSlots = course.capacity - course._count.registrations;
        const isFull = course.status === "FULL" || remainingSlots <= 0;
        const isDone = course.status === "DONE";
        const canRegister = course.status === "OPEN" && !isFull && !isDone;
        const showFomo = canRegister && remainingSlots <= 5;

        return (
          <motion.div 
            key={course.id} 
            variants={item}
            whileHover={{ y: -8 }}
            className="glass-card rounded-3xl overflow-hidden flex flex-col shadow-lg border border-white/80"
          >
            <div className="p-6 flex-1 space-y-4 bg-white/40">
              <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
                <span className="px-3 py-1 bg-[var(--color-brand-100)] text-[var(--color-brand-700)] rounded-full text-xs font-bold tracking-wide">
                  MÃ: {course.code}
                </span>
                {isFull && <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold">ĐÃ KÍN CHỖ</span>}
                {isDone && <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-bold">ĐÃ KẾT THÚC</span>}
                {canRegister && !showFomo && <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">ĐANG MỞ</span>}
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">
                {course.name}
              </h3>
              
              <div className="space-y-3 pt-2 text-gray-700 font-medium">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Calendar size={16} />
                  </div>
                  <span>{new Date(course.date).toLocaleDateString("vi-VN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    <Clock size={16} />
                  </div>
                  <span>{course.startTime} - {course.endTime}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Users size={16} />
                  </div>
                  <span>
                    Đã đăng ký: <b>{course._count.registrations}</b> / {course.capacity}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-white/80 border-t border-gray-100 mt-auto">
              {showFomo && (
                <div className="mb-3 text-center text-sm font-bold text-orange-600 animate-pulse">
                  🔥 Chỉ còn {remainingSlots} chỗ trống!
                </div>
              )}
              {canRegister ? (
                <Link 
                  href={`/register/${course.id}`}
                  className="w-full py-4 px-6 bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white font-bold rounded-2xl transition-colors flex justify-between items-center group shadow-md shadow-blue-500/20"
                >
                  Đăng ký tham gia
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <button 
                  disabled
                  className="w-full py-4 px-6 bg-gray-200 text-gray-500 font-bold rounded-2xl flex justify-center items-center"
                >
                  {isFull ? "Đã đủ số lượng" : "Khóa học đã kết thúc"}
                </button>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
