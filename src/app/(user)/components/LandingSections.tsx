"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, HeartPulse, Clock, Users, Award, ChevronRight } from "lucide-react";
import Link from "next/link";
import { trackEvent } from "@/app/actions/tracking";

const heroImages = [
  "/Picture/2aOboQp6kKgibBimietxWlGZXTQSUy4RQSuDVNmi.jpg",
  "/Picture/f568454d-6f0c-4fde-8b80-ee1a83fb034f.jpg",
  "/Picture/images.jpg",
  "/Picture/p3-cprclass-ml0225-gi1405064013.jpg"
];

const fadeInUp: any = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

export default function LandingSections() {
  const [[page, direction], setPage] = useState([0, 0]);

  // We only have 4 images, so we use modulo to get the correct index
  const imageIndex = ((page % heroImages.length) + heroImages.length) % heroImages.length;

  useEffect(() => {
    const timer = setInterval(() => {
      setPage([page + 1, 1]);
    }, 6000); // Tăng thời gian chờ lên 6 giây
    return () => clearInterval(timer);
  }, [page]);

  const handleTrack = (eventName: string) => {
    try {
      const sessionId = sessionStorage.getItem("ttcc_session_id");
      const source = sessionStorage.getItem("ttcc_source") || "direct";
      if (sessionId) {
        trackEvent(sessionId, source, eventName);
      }
    } catch (error) {
      // Ignore if sessionStorage is not available
    }
  };

  const slideVariants = {
    enter: (direction: number) => {
      return {
        x: direction > 0 ? 500 : -500,
        opacity: 0
      };
    },
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => {
      return {
        zIndex: 0,
        x: direction < 0 ? 500 : -500,
        opacity: 0
      };
    }
  };

  return (
    <div className="space-y-32">
      
      {/* 1. HERO SECTION */}
      <section className="pt-12 pb-20 flex flex-col md:flex-row items-center gap-12">
        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
          onViewportEnter={() => handleTrack("view_hero")}
          className="flex-1 space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-brand-100)] text-[var(--color-brand-700)] rounded-full font-bold text-sm tracking-wide">
            <Award size={18} />
            ĐÀO TẠO CẤP GIẤY CHỨNG NHẬN
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-[1.15] tracking-tight">
            Khóa Sơ cấp cứu <br className="hidden md:block"/> Cộng đồng — <br />
            <span className="text-gradient">TT Cấp cứu 115 TP.HCM</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl">
            Học trực tiếp từ chính các bác sĩ, điều dưỡng đang làm việc tại Trung tâm Cấp cứu 115 TP.HCM. 
            Kỹ năng sơ cứu thực tế, có thể cứu mạng người thân ngay khi cần.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link href="/hocsocapcuu/courses" className="px-8 py-4 bg-[var(--color-accent)] hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-500/30 transition-all flex justify-center items-center gap-2 text-lg">
              📅 Xem Lịch & Đăng ký
            </Link>
            <Link href="#chuong-trinh" className="px-8 py-4 glass text-[var(--color-brand-900)] font-bold rounded-xl hover:bg-[var(--color-brand-50)] transition-all flex justify-center items-center text-lg">
              Tìm hiểu chương trình
            </Link>
          </div>

          <div className="flex flex-col gap-3 pt-6 text-gray-700 font-medium">
            <div className="flex items-center gap-3"><CheckCircle2 className="text-[var(--color-brand-500)]" size={20} /> Hơn 1.000 người đã hoàn thành khóa học</div>
            <div className="flex items-center gap-3"><CheckCircle2 className="text-[var(--color-brand-500)]" size={20} /> Giảng viên là bác sĩ, điều dưỡng TTCC115</div>
            <div className="flex items-center gap-3"><CheckCircle2 className="text-[var(--color-brand-500)]" size={20} /> Chương trình được Sở Y tế công nhận</div>
          </div>
        </motion.div>

        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
          className="flex-1 w-full max-w-lg relative"
        >
          <div className="absolute inset-0 bg-blue-100 rounded-full blur-[100px] opacity-60"></div>
          <div className="glass-card rounded-3xl relative z-10 aspect-square border-4 border-white shadow-2xl overflow-hidden bg-gray-100 flex items-center justify-center">
            <AnimatePresence initial={false} custom={direction}>
              <motion.img
                key={page}
                src={heroImages[imageIndex]}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 }
                }}
                alt="Thực hành sơ cấp cứu"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </AnimatePresence>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
              {heroImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const newDirection = idx > imageIndex ? 1 : -1;
                    if (idx !== imageIndex) {
                      setPage([page + (idx - imageIndex), newDirection]);
                    }
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === imageIndex ? "bg-white w-6" : "bg-white/50 hover:bg-white/80"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* 2. PROBLEM SECTION */}
      <section className="py-12">
        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp} 
          onViewportEnter={() => handleTrack("view_problem")}
          className="text-center max-w-3xl mx-auto mb-16 space-y-4"
        >
          <span className="text-[var(--color-accent)] font-bold tracking-widest uppercase text-sm">Vấn đề thực tế</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">Tai nạn không báo trước — và người ở bên cạnh thường không phải bác sĩ</h2>
          <p className="text-gray-600 text-lg">Trong những phút đầu tiên của một ca nguy cấp, người quyết định sự sống không phải bác sĩ — mà là người đang ở ngay đó. Rất có thể, đó là bạn.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: "🧒", title: "Trẻ hóc dị vật", desc: "Con bạn nghẹn một miếng thức ăn, mặt tím dần, không thể ho ra." },
            { icon: "🧓", title: "Người thân đột quỵ", desc: "Bố mẹ bỗng méo miệng, yếu liệt nửa người lúc nửa đêm." },
            { icon: "💼", title: "Đồng nghiệp ngã gục", desc: "Một người gục xuống tại văn phòng, ngừng thở khi chưa ai biết phải làm gì." }
          ].map((item, i) => (
            <motion.div 
              key={i} 
              initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={fadeInUp}
              className="glass-card p-8 rounded-2xl border-l-4 border-l-[var(--color-accent)] hover:-translate-y-2 transition-transform"
            >
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
              <p className="text-gray-600 font-medium leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3. AGITATE / STATS */}
      <section className="py-16 px-4 md:px-8 bg-blue-50/50 rounded-3xl border border-blue-100">
        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp} 
          onViewportEnter={() => handleTrack("view_consequences")}
          className="text-center max-w-3xl mx-auto mb-16 space-y-4"
        >
          <span className="text-[var(--color-brand-600)] font-bold tracking-widest uppercase text-sm">Hệ quả</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">Mỗi giây chậm trễ, cơ hội sống trôi đi</h2>
          <p className="text-gray-600 text-lg">Não chỉ chịu được vài phút thiếu oxy, trong khi xe cấp cứu khó vượt kẹt xe trong khung giờ vàng. Nếu không ai bên cạnh biết phải làm gì, một sinh mạng đáng lẽ cứu được sẽ mất đi.</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { num: "4 phút", label: "Thời gian vàng" },
            { num: "3×", label: "Cơ hội sống sót" },
            { num: "1.000+", label: "Học viên" },
            { num: "25 năm", label: "Kinh nghiệm" },
          ].map((stat, i) => (
            <motion.div 
              key={i} 
              initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={fadeInUp}
              className="bg-white p-4 md:p-6 rounded-2xl text-center shadow-sm border border-gray-100"
            >
              <div className="text-2xl md:text-4xl font-extrabold text-[var(--color-accent)] mb-2">{stat.num}</div>
              <div className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wide">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 4. MODULES */}
      <section id="chuong-trinh" className="py-12">
        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp} 
          onViewportEnter={() => handleTrack("view_modules")}
          className="text-center max-w-3xl mx-auto mb-16 space-y-4"
        >
          <span className="text-[var(--color-brand-600)] font-bold tracking-widest uppercase text-sm">Chương trình</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">Nội dung khóa học — 6 Module</h2>
          <p className="text-gray-600 text-lg">Thực hành 70%, lý thuyết 30%. Học trên mô hình và dụng cụ thật.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { num: "1", title: "CPR — Hồi sinh tim phổi", desc: "Kỹ thuật ép tim, thổi ngạt chuẩn quốc tế. Thực hành trên mô hình." },
            { num: "2", title: "Heimlich — Xử lý hóc dị vật", desc: "Cho người lớn, trẻ em, trẻ sơ sinh." },
            { num: "3", title: "Nhận diện đột quỵ (FAST)", desc: "4 dấu hiệu sống còn để phát hiện đột quỵ trong 60 giây." },
            { num: "4", title: "Băng bó vết thương", desc: "Cầm máu, băng vết thương hở, vết bỏng." },
            { num: "5", title: "Cố định gãy xương", desc: "Cố định tạm tay, chân, cột sống cổ trước khi xe đến." },
            { num: "6", title: "Tình huống đặc biệt", desc: "Đuối nước, điện giật, ngộ độc, co giật, sốt cao trẻ em." }
          ].map((mod, i) => (
            <motion.div 
              key={i} 
              initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={fadeInUp}
              className="glass-card p-6 rounded-2xl flex gap-6 items-start"
            >
              <div className="w-12 h-12 flex-shrink-0 bg-[var(--color-brand-600)] text-white text-xl font-bold rounded-xl flex items-center justify-center">
                {mod.num}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{mod.title}</h3>
                <p className="text-gray-600 font-medium">{mod.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 5. INSTRUCTORS */}
      <section className="py-8">
        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}
          className="bg-orange-50 border border-orange-200 border-l-4 border-l-orange-500 rounded-2xl p-6 md:p-12 flex flex-col md:flex-row items-center gap-6 shadow-sm text-center md:text-left"
        >
          <div className="text-5xl">🩺</div>
          <p className="text-lg md:text-xl text-gray-800 leading-relaxed font-medium">
            <strong className="text-[var(--color-brand-900)]">Đội ngũ giảng viên là bác sĩ, điều dưỡng đang công tác tại Trung tâm Cấp cứu 115 TP.HCM</strong> — những người trực tiếp cấp cứu hàng ngày trên xe cứu thương.
          </p>
        </motion.div>
      </section>

      {/* 6. PRICING */}
      <section id="hoc-phi" className="py-12">
        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp} 
          onViewportEnter={() => handleTrack("view_pricing")}
          className="text-center max-w-3xl mx-auto mb-16 space-y-4"
        >
          <span className="text-[var(--color-brand-600)] font-bold tracking-widest uppercase text-sm">Học phí công khai</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">Chọn gói phù hợp</h2>
          <p className="text-gray-600 text-lg">Học phí minh bạch, đóng trực tiếp cho Trung tâm Cấp cứu 115 TP.HCM.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={fadeInUp}
            className="glass-card p-6 md:p-8 rounded-3xl border-2 border-orange-400 relative shadow-xl hover:-translate-y-2 transition-transform bg-white"
          >
            <div className="absolute -top-4 left-8 bg-orange-400 text-white font-bold px-4 py-1 rounded-full text-xs md:text-sm tracking-wider">
              PHỔ BIẾN NHẤT
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2 mt-4">Gói Cộng đồng</h3>
            <div className="text-3xl md:text-4xl font-extrabold text-[var(--color-accent)] mb-6">
              400.000 đ <span className="text-base md:text-lg font-medium text-gray-500">/ 1 buổi</span>
            </div>
            
            <ul className="space-y-4 mb-8 text-sm md:text-base text-gray-700 font-medium">
              <li className="flex gap-3"><CheckCircle2 className="text-emerald-500 shrink-0" size={20} /> 1 buổi học (07:30 – 11:30)</li>
              <li className="flex gap-3"><CheckCircle2 className="text-emerald-500 shrink-0" size={20} /> Thực hành trên mô hình</li>
              <li className="flex gap-3"><CheckCircle2 className="text-emerald-500 shrink-0" size={20} /> Tài liệu in màu</li>
              <li className="flex gap-3"><CheckCircle2 className="text-emerald-500 shrink-0" size={20} /> Giấy chứng nhận TTCC115</li>
              <li className="flex gap-3"><CheckCircle2 className="text-emerald-500 shrink-0" size={20} /> Đào tạo tại Quận 1, TP.HCM</li>
            </ul>

            <Link href="/hocsocapcuu/courses" className="block w-full py-4 text-center bg-[var(--color-accent)] hover:bg-rose-700 text-white font-bold rounded-xl transition-colors">
              CHỌN LỚP KHAI GIẢNG
            </Link>
          </motion.div>

          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={fadeInUp}
            className="glass-card p-6 md:p-8 rounded-3xl border-2 border-gray-200 bg-white"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-2 mt-4">Gói Doanh nghiệp</h3>
            <div className="text-3xl md:text-4xl font-extrabold text-[var(--color-brand-600)] mb-6">
              Báo giá <span className="text-base md:text-lg font-medium text-gray-500">theo nhu cầu</span>
            </div>
            
            <ul className="space-y-4 mb-8 text-sm md:text-base text-gray-700 font-medium">
              <li className="flex gap-3"><CheckCircle2 className="text-emerald-500 shrink-0" size={20} /> Đào tạo tại Công ty hoặc tại TTCC115</li>
              <li className="flex gap-3"><CheckCircle2 className="text-emerald-500 shrink-0" size={20} /> Tùy chỉnh nội dung</li>
              <li className="flex gap-3"><CheckCircle2 className="text-emerald-500 shrink-0" size={20} /> Tối đa 40 học viên/lớp</li>
              <li className="flex gap-3"><CheckCircle2 className="text-emerald-500 shrink-0" size={20} /> Xuất hóa đơn VAT doanh nghiệp</li>
            </ul>

            <a href="tel:0387644522" className="block w-full py-4 text-center border-2 border-[var(--color-brand-600)] text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] font-bold rounded-xl transition-colors">
              📞 BS Vĩnh Lộc – 0387 644 522
            </a>
          </motion.div>
        </div>
      </section>

      {/* 7. BOTTOM CTA */}
      <section className="py-16 text-center bg-[var(--color-brand-900)] text-white rounded-3xl relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-500 mix-blend-multiply opacity-50 blur-[100px] pointer-events-none"></div>
        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} variants={fadeInUp}
          onViewportEnter={() => handleTrack("view_cta_bottom")}
          className="relative z-10 space-y-6 px-4"
        >
          <span className="text-orange-400 font-bold uppercase tracking-widest">Sẵn sàng?</span>
          <h2 className="text-3xl md:text-5xl font-extrabold">Hãy là người biết phải làm gì khi nguy cấp</h2>
          <p className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto">Chọn lớp, thanh toán và đăng ký — tất cả trong một bước nhanh gọn.</p>
          <div className="pt-6">
            <Link href="/hocsocapcuu/courses" className="inline-block px-10 py-5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg rounded-xl shadow-xl transition-transform hover:scale-105">
              📅 Đăng ký ngay
            </Link>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
