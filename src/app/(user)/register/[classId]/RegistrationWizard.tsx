"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, AlertCircle, Loader2, Copy, Upload } from "lucide-react";
import { createRegistration, updatePaymentReceipt } from "@/app/actions/registration";

type Props = {
  classData: any;
  bankSettings: any;
};

export default function RegistrationWizard({ classData, bankSettings }: Props) {
  const request = useRef<{requestKey: string; receiptToken: string} | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [step, setStep] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    dob: "",
    gender: "MALE" as "MALE" | "FEMALE",
    cccd: "",
    phone: "",
    email: "",
    organization: "",
    workplace: "",
    note: "",
    idPhotoUrl: "",
    degreeUrl: "",
    paymentReceiptUrl: "",
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof formData) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField(field);
    const body = new FormData();
    body.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (data.success) {
        setFormData({ ...formData, [field]: data.url });
        if (field === "paymentReceiptUrl" && registrationId) {
          const receipt = await updatePaymentReceipt(registrationId, data.url, request.current!.receiptToken);
          if (!receipt.success) throw new Error(receipt.error);
        }
      } else {
        alert("Upload thất bại: " + data.error);
      }
    } catch (error) {
      alert("Lỗi khi upload file.");
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const sessionId = typeof window !== 'undefined' ? sessionStorage.getItem("ttcc_session_id") || undefined : undefined;
    const source = typeof window !== 'undefined' ? sessionStorage.getItem("ttcc_source") || "direct" : undefined;

    setSubmitError("");
    request.current ??= {requestKey: crypto.randomUUID(), receiptToken: crypto.randomUUID() + crypto.randomUUID()};
    try {
    const res = await createRegistration({
      ...request.current,
      classId: classData.id,
      fullName: formData.fullName,
      dob: new Date(formData.dob),
      gender: formData.gender,
      cccd: formData.cccd,
      phone: formData.phone,
      email: formData.email,
      organization: formData.organization,
      workplace: formData.workplace,
      note: formData.note,
      idPhotoUrl: formData.idPhotoUrl,
      degreeUrl: formData.degreeUrl,
      sessionId,
      source,
    });

    setIsLoading(false);

    if (res.success && res.data) {
      setRegistrationId(res.data.id);
      try {
        if (sessionId && source) {
          const { trackEvent } = await import("@/app/actions/tracking");
          trackEvent(sessionId, source, "submit_info");
        }
      } catch (e) {}
      setStep(3); // Move to Payment step
    } else {
      setSubmitError(res.error || "Đã xảy ra lỗi.");
    }
    } catch {setSubmitError("Lỗi cần kiểm tra lại. Vui lòng thử lại; thông tin đã nhập vẫn được giữ.");}
    finally {setIsLoading(false);}
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Đã sao chép: " + text);
  };

  // Generate VietQR URL
  const removeAccents = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  };

  const bankIdMatch = bankSettings.bankName.match(/\(([^)]+)\)/);
  const bankId = bankIdMatch ? bankIdMatch[1].trim().toLowerCase() : bankSettings.bankName.trim().toLowerCase().replace(/\s+/g, '');

  let rawSyntax = bankSettings.transferSyntax || "{CLASS_CODE} {NAME}";
  rawSyntax = rawSyntax.replace(/{CLASS_CODE}/g, classData.code).replace(/\[Mã Lớp\]/gi, classData.code);
  rawSyntax = rawSyntax.replace(/{NAME}/g, formData.fullName.toUpperCase()).replace(/\[Họ Tên\]/gi, formData.fullName.toUpperCase());

  const transferContent = removeAccents(rawSyntax);
  const qrUrl = `https://img.vietqr.io/image/${bankId}-${bankSettings.accountNumber}-compact2.png?amount=${classData.fee ?? 400000}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(removeAccents(bankSettings.accountName))}`;

  return (
    <div>
      {submitError && <div role="alert" className="mb-6 p-4 rounded-xl bg-rose-50 text-rose-700">{submitError} <a href="/hocsocapcuu/courses" className="underline">Chọn lớp khác</a></div>}
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
                  <div className="font-bold text-gray-900">{new Date(classData.startDate).toLocaleDateString("vi-VN")}</div>
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
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none transition-all font-medium" placeholder="VD: Nguyễn Văn A" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày sinh <span className="text-red-500">*</span></label>
                  <input required type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none transition-all font-medium" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Giới tính <span className="text-red-500">*</span></label>
                  <select required value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none transition-all font-medium">
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Số CCCD <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.cccd} onChange={e => setFormData({...formData, cccd: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none transition-all font-medium" placeholder="Số Căn cước công dân" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Số điện thoại <span className="text-red-500">*</span></label>
                  <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none transition-all font-medium" placeholder="VD: 0987654321" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none transition-all font-medium" placeholder="VD: email@example.com" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Đơn vị công tác (Nếu có)</label>
                <input type="text" value={formData.organization} onChange={e => setFormData({...formData, organization: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none transition-all font-medium" placeholder="VD: Công ty TNHH ABC" />
              </div>

              {classData.courseType !== "COMMUNITY_FIRST_AID" && <label className="block font-semibold">Đơn vị công tác *<input required value={formData.workplace} onChange={e => setFormData({...formData, workplace: e.target.value})} className="w-full p-3 border rounded-xl" /></label>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                {/* Upload CCCD */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ảnh CCCD (Tùy chọn)</label>
                  <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors">
                    {uploadingField === "idPhotoUrl" ? (
                      <Loader2 className="animate-spin mx-auto text-blue-500" size={24} />
                    ) : formData.idPhotoUrl ? (
                      <div className="flex flex-col items-center">
                        <Check className="text-emerald-500 mb-2" size={24} />
                        <span className="text-sm font-medium text-emerald-600">Đã tải lên CCCD</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-gray-500">
                        <Upload size={24} className="mb-2" />
                        <span className="text-sm">Chọn file ảnh</span>
                      </div>
                    )}
                    <input type="file" required={classData.courseType !== "COMMUNITY_FIRST_AID" && !formData.idPhotoUrl} accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, "idPhotoUrl")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
                </div>

                {/* Upload Degree */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{classData.courseType === "AMBULANCE_DRIVER" ? "Bằng lái xe" : "Văn bằng chuyên môn"} {classData.courseType === "COMMUNITY_FIRST_AID" ? "(Nếu có)" : "*"}</label>
                  <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors">
                    {uploadingField === "degreeUrl" ? (
                      <Loader2 className="animate-spin mx-auto text-blue-500" size={24} />
                    ) : formData.degreeUrl ? (
                      <div className="flex flex-col items-center">
                        <Check className="text-emerald-500 mb-2" size={24} />
                        <span className="text-sm font-medium text-emerald-600">Đã tải lên Bằng cấp</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-gray-500">
                        <Upload size={24} className="mb-2" />
                        <span className="text-sm">Chọn file ảnh</span>
                      </div>
                    )}
                    <input type="file" required={classData.courseType !== "COMMUNITY_FIRST_AID" && !formData.degreeUrl} accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, "degreeUrl")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
                </div>
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
        {step === 3 && !isCompleted && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center space-y-2">
              <h3 className="text-2xl font-bold text-gray-900">Hướng dẫn Thanh toán</h3>
              <p className="text-gray-600 font-medium">
                Thông tin của bạn đã được lưu tạm. Vui lòng thanh toán học phí và tải lên biên lai để hoàn tất giữ chỗ.
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
                    <div className="font-black text-xl text-rose-600">{new Intl.NumberFormat('vi-VN').format(classData.fee ?? 400000)} đ</div>
                  </div>
                </div>

                <div className="flex justify-between items-end bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-[var(--color-brand-600)] uppercase">Nội dung chuyển khoản</div>
                    <div className="font-bold text-gray-900">{transferContent}</div>
                  </div>
                  <button onClick={() => copyToClipboard(transferContent)} className="text-[var(--color-brand-600)] hover:text-blue-800 p-2"><Copy size={18} /></button>
                </div>

                {/* Upload Biên lai */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tải lên biên lai chuyển khoản (Tùy chọn)</label>
                  <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors">
                    {uploadingField === "paymentReceiptUrl" ? (
                      <Loader2 className="animate-spin mx-auto text-blue-500" size={24} />
                    ) : formData.paymentReceiptUrl ? (
                      <div className="flex flex-col items-center">
                        <Check className="text-emerald-500 mb-2" size={24} />
                        <span className="text-sm font-medium text-emerald-600">Đã tải lên Biên lai</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-gray-500">
                        <Upload size={24} className="mb-2" />
                        <span className="text-sm">Chọn file ảnh biên lai</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "paymentReceiptUrl")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
                </div>

              </div>
            </div>

            <div className="flex items-start gap-3 bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-200 text-sm font-medium">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <p>Hệ thống sẽ tự động đối soát giao dịch và xác nhận qua SMS/Email trong vòng 24h làm việc. Nếu cần hỗ trợ khẩn cấp, vui lòng gọi Hotline: 0387 644 522.</p>
            </div>

            <button
              onClick={() => setIsCompleted(true)}
              className="w-full py-4 bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center mt-8"
            >
              Lưu / Hoàn tất đăng ký
            </button>

            <div className="pt-4 text-center">
              <a href="/hocsocapcuu" className="inline-block font-bold text-gray-500 hover:text-gray-900 underline underline-offset-4">Quay lại Trang chủ</a>
            </div>
          </motion.div>
        )}

        {/* STEP 4: Success Message */}
        {step === 3 && isCompleted && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-4">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check size={40} />
              </div>
              <h3 className="text-3xl font-extrabold text-gray-900">Đăng ký thành công!</h3>
              <p className="text-gray-600 font-medium text-lg max-w-lg mx-auto">
                Hệ thống đã ghi nhận thông tin của bạn. Chúng tôi sẽ đối soát thanh toán và gửi email xác nhận trong thời gian sớm nhất.
              </p>
            </div>

            <div className="pt-8 text-center">
              <a href="/hocsocapcuu" className="inline-block px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors">
                Quay lại Trang chủ
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
