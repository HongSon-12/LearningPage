"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, AlertCircle, Loader2, Copy } from "lucide-react";
import { createRegistration } from "@/app/actions/registration";

type Props = {
  classData: any;
  bankSettings: any;
};

export default function RegistrationWizard({ classData, bankSettings }: Props) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    dob: "",
    phone: "",
    email: "",
    organization: "",
    note: "",
  });

  // Track start_register when wizard opens
  React.useEffect(() => {
    try {
      const sessionId = sessionStorage.getItem("ttcc_session_id");
      const source = sessionStorage.getItem("ttcc_source") || "direct";
      if (sessionId) {
        import("@/app/actions/tracking").then(module => {
          module.trackEvent(sessionId, source, "start_register");
        });
      }
    } catch (e) {}
  }, []);

  const handleNext = () => setStep((s) => Math.min(s + 1, 3));
  
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const sessionId = typeof window !== 'undefined' ? sessionStorage.getItem("ttcc_session_id") || undefined : undefined;
    const source = typeof window !== 'undefined' ? sessionStorage.getItem("ttcc_source") || "direct" : undefined;

    const res = await createRegistration({
      classId: classData.id,
      fullName: formData.fullName,
      dob: new Date(formData.dob),
      phone: formData.phone,
      email: formData.email,
      organization: formData.organization,
      note: formData.note,
      sessionId,
      source,
    });

    setIsLoading(false);

    if (res.success) {
      try {
        if (sessionId && source) {
          const { trackEvent } = await import("@/app/actions/tracking");
          trackEvent(sessionId, source, "submit_info");
        }
      } catch (e) {}
      setStep(3); // Move to Payment step
    } else {
      alert(res.error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Đã sao chép: " + text);
  };

  // Generate VietQR URL
  const transferContent = `${classData.code} ${formData.fullName.toUpperCase()}`;
  const qrUrl = `https://img.vietqr.io/image/vietcombank-${bankSettings.accountNumber}-compact2.png?amount=400000&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(bankSettings.accountName)}`;

  return (
    <div>
      {/* Stepper */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 rounded-full z-0"></div>
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[var(--color-brand-500)] rounded-full z-0 transition-all duration-500"
          style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
        ></div>

        {[1, 2, 3].map((s) => (
          <div key={s} className="relative z-10 flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${
              step >= s ? 'bg-[var(--color-brand-600)] text-white shadow-lg shadow-blue-500/30' : 'bg-gray-200 text-gray-500'
            }`}>
              {step > s ? <Check size={18} /> : s}
            </div>
            <span className={`text-xs font-bold hidden md:block ${step >= s ? 'text-[var(--color-brand-700)]' : 'text-gray-400'}`}>
              {s === 1 ? 'Xác nhận lớp' : s === 2 ? 'Thông tin cá nhân' : 'Thanh toán'}
            </span>
          </div>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {/* STEP 1: Confirm Class */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 text-center space-y-3">
              <h3 className="text-xl font-bold text-gray-900">Bạn đang đăng ký khóa học:</h3>
              <div className="text-2xl md:text-3xl font-black text-[var(--color-brand-600)]">{classData.name}</div>
              <div className="inline-block bg-white px-4 py-2 rounded-xl border border-blue-200 font-bold text-[var(--color-brand-700)] shadow-sm">
                MÃ LỚP: {classData.code}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl shadow-sm">📅</div>
                <div>
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Ngày học</div>
                  <div className="font-bold text-gray-900">{new Date(classData.date).toLocaleDateString("vi-VN")}</div>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl shadow-sm">⏰</div>
                <div>
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Thời gian</div>
                  <div className="font-bold text-gray-900">{classData.startTime} - {classData.endTime}</div>
                </div>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-4 bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center gap-2 mt-8"
            >
              Tiếp tục điền thông tin <ChevronRight size={20} />
            </button>
          </motion.div>
        )}

        {/* STEP 2: Personal Info */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <form onSubmit={handleSubmitForm} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Họ và tên (In trên chứng chỉ) <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none transition-all font-medium" placeholder="VD: Nguyễn Văn A" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày sinh (In trên chứng chỉ) <span className="text-red-500">*</span></label>
                  <input required type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none transition-all font-medium" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Số điện thoại <span className="text-red-500">*</span></label>
                  <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none transition-all font-medium" placeholder="VD: 0987654321" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email (Để nhận tài liệu)</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none transition-all font-medium" placeholder="VD: email@example.com" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Đơn vị công tác (Nếu có)</label>
                <input type="text" value={formData.organization} onChange={e => setFormData({...formData, organization: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none transition-all font-medium" placeholder="VD: Công ty TNHH ABC" />
              </div>

              <div className="flex gap-4 pt-4 mt-8 border-t border-gray-100">
                <button type="button" onClick={() => setStep(1)} className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">
                  Quay lại
                </button>
                <button type="submit" disabled={isLoading} className="flex-1 py-4 bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center gap-2 disabled:opacity-70">
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Xác nhận & Tới bước Thanh toán"}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* STEP 3: Payment (VietQR) */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Đăng ký thành công!</h3>
              <p className="text-gray-600 font-medium">
                Thông tin của bạn đã được ghi nhận. Vui lòng thanh toán học phí để hoàn tất quá trình giữ chỗ.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-8 bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
              {/* QR Code */}
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <div className="font-bold text-gray-800 text-center">Quét mã VietQR để thanh toán nhanh</div>
                <div className="border-4 border-[var(--color-brand-500)] rounded-2xl p-2 bg-white inline-block">
                  <img src={qrUrl} alt="VietQR" className="w-48 h-48 md:w-64 md:h-64 object-contain" />
                </div>
                <div className="text-sm font-semibold text-[var(--color-brand-600)] bg-blue-50 px-4 py-2 rounded-full">
                  Quét bằng ứng dụng Ngân hàng
                </div>
              </div>

              {/* Manual Info */}
              <div className="flex-1 space-y-5">
                <div className="font-bold text-gray-800 border-b border-gray-100 pb-2">Hoặc chuyển khoản thủ công:</div>
                
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-gray-500 uppercase">Ngân hàng</div>
                  <div className="font-bold text-gray-900">{bankSettings.bankName}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-semibold text-gray-500 uppercase">Chủ tài khoản</div>
                  <div className="font-bold text-gray-900">{bankSettings.accountName}</div>
                </div>

                <div className="flex justify-between items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-gray-500 uppercase">Số tài khoản</div>
                    <div className="font-black text-xl text-[var(--color-brand-700)] tracking-wider">{bankSettings.accountNumber}</div>
                  </div>
                  <button onClick={() => copyToClipboard(bankSettings.accountNumber)} className="text-gray-500 hover:text-blue-600 p-2"><Copy size={18} /></button>
                </div>

                <div className="flex justify-between items-end bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-orange-600 uppercase">Số tiền</div>
                    <div className="font-black text-xl text-rose-600">400.000 đ</div>
                  </div>
                </div>

                <div className="flex justify-between items-end bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-[var(--color-brand-600)] uppercase">Nội dung chuyển khoản</div>
                    <div className="font-bold text-gray-900">{transferContent}</div>
                  </div>
                  <button onClick={() => copyToClipboard(transferContent)} className="text-[var(--color-brand-600)] hover:text-blue-800 p-2"><Copy size={18} /></button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-200 text-sm font-medium">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <p>Hệ thống sẽ tự động đối soát giao dịch và xác nhận qua SMS/Email trong vòng 24h làm việc. Nếu cần hỗ trợ khẩn cấp, vui lòng gọi Hotline: 0387 644 522.</p>
            </div>
            
            <div className="pt-4 text-center">
              <a href="/" className="inline-block font-bold text-gray-500 hover:text-gray-900 underline underline-offset-4">Quay lại Trang chủ</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
