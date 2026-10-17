"use client";
import { SelectField, SelectOption } from "@/components/forms/select-field";

import { DateTimePicker } from "@/components/forms/date-time-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RegistrationIdentity, type ReturningProfile } from "./RegistrationIdentity";
import React, { useState, useRef } from "react";
import Image from "next/image";
import type { Class, Setting } from "@prisma/client";
import { motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  AlertCircle,
  Loader2,
  Copy,
  Upload,
} from "lucide-react";
import {
  createRegistration,
  updatePaymentReceipt,
} from "@/app/actions/registration";

type Props = {
  classData: Pick<
    Class,
    | "id"
    | "code"
    | "name"
    | "courseType"
    | "fee"
    | "startDate"
    | "startTime"
    | "endTime"
  >;
  bankSettings: Pick<
    Setting,
    "bankName" | "accountName" | "accountNumber" | "transferSyntax"
  >;
};

export default function RegistrationWizard({ classData, bankSettings }: Props) {
  const wizard = useRef<HTMLDivElement>(null);
  const request = useRef<{ requestKey: string; receiptToken: string } | null>(
    null,
  );
  const [submitError, setSubmitError] = useState("");
  const [identityReady, setIdentityReady] = useState(false);
  const [returning, setReturning] = useState(false);
  const [step, setStep] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    dob: "",
    gender: "" as "" | "MALE" | "FEMALE" | "OTHER",
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

  React.useEffect(() => {
    if (step > 1) wizard.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [step]);

  function ready(profile?: ReturningProfile) {
    if (profile) {
      const { returning: _returning, ...fields } = profile;
      void _returning;
      setFormData(previous => ({ ...previous, ...fields }));
    }
    setReturning(profile?.returning ?? false);
    setIdentityReady(true);
  }
  function resetIdentity() {
    setFormData({ fullName: "", dob: "", gender: "", cccd: "", phone: "", email: "", organization: "", workplace: "", note: "", idPhotoUrl: "", degreeUrl: "", paymentReceiptUrl: "" });
    request.current = null;
    setIdentityReady(false); setReturning(false); setSubmitError("");
  }

  // Track start_register when wizard opens
  React.useEffect(() => {
    try {
      const sessionId = sessionStorage.getItem("ttcc_session_id");
      const source = sessionStorage.getItem("ttcc_source") || "direct";
      if (sessionId) {
        import("@/app/actions/tracking").then((module) => {
          module.trackEvent(sessionId, source, "start_register");
        });
      }
    } catch {}
  }, []);

  const handleNext = () => setStep((s) => Math.min(s + 1, 3));

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof typeof formData,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField(field);
    const body = new FormData();
    body.append("file", file);
    request.current ??= {
      requestKey: crypto.randomUUID(),
      receiptToken: crypto.randomUUID() + crypto.randomUUID(),
    };
    body.set("classId", classData.id);
    body.set(
      "kind",
      field === "idPhotoUrl"
        ? "ID_PHOTO"
        : field === "degreeUrl"
          ? "DEGREE"
          : "RECEIPT",
    );
    body.set("receiptToken", request.current.receiptToken);
    if (registrationId) body.set("registrationId", registrationId);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (data.success) {
        if (field === "paymentReceiptUrl" && registrationId) {
          const receipt = await updatePaymentReceipt(
            registrationId,
            data.url,
            request.current!.receiptToken,
          );
          if (!receipt.success) throw new Error(receipt.error);
        }
        setFormData((previous) => ({ ...previous, [field]: data.url }));
      } else {
        alert("Upload thất bại: " + data.error);
      }
    } catch {
      alert("Lỗi khi upload file.");
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identityReady || !formData.gender || isLoading || uploadingField) return;
    setIsLoading(true);

    const sessionId =
      typeof window !== "undefined"
        ? sessionStorage.getItem("ttcc_session_id") || undefined
        : undefined;
    const source =
      typeof window !== "undefined"
        ? sessionStorage.getItem("ttcc_source") || "direct"
        : undefined;

    setSubmitError("");
    request.current ??= {
      requestKey: crypto.randomUUID(),
      receiptToken: crypto.randomUUID() + crypto.randomUUID(),
    };
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
        } catch {}
        setStep(3); // Move to Payment step
      } else {
        setSubmitError(res.error || "Đã xảy ra lỗi.");
      }
    } catch {
      setSubmitError(
        "Lỗi cần kiểm tra lại. Vui lòng thử lại; thông tin đã nhập vẫn được giữ.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Đã sao chép: " + text);
  };

  // Generate VietQR URL
  const removeAccents = (str: string) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");
  };

  const bankIdMatch = bankSettings.bankName.match(/\(([^)]+)\)/);
  const bankId = bankIdMatch
    ? bankIdMatch[1].trim().toLowerCase()
    : bankSettings.bankName.trim().toLowerCase().replace(/\s+/g, "");

  let rawSyntax = bankSettings.transferSyntax || "{CLASS_CODE} {NAME}";
  rawSyntax = rawSyntax
    .replace(/{CLASS_CODE}/g, classData.code)
    .replace(/\[Mã Lớp\]/gi, classData.code);
  rawSyntax = rawSyntax
    .replace(/{NAME}/g, formData.fullName.toUpperCase())
    .replace(/\[Họ Tên\]/gi, formData.fullName.toUpperCase());

  const transferContent = removeAccents(rawSyntax);
  const qrUrl = `https://img.vietqr.io/image/${bankId}-${bankSettings.accountNumber}-compact2.png?amount=${classData.fee ?? 400000}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(removeAccents(bankSettings.accountName))}`;

  return (
    <div ref={wizard} className="scroll-mt-24">
      {submitError && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-xl bg-rose-50 text-rose-700"
        >
          {submitError}{" "}
          <a href="/hocsocapcuu/courses" className="underline">
            Chọn lớp khác
          </a>
        </div>
      )}
      {registrationId && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
          <p className="font-semibold">Mã đăng ký của bạn</p>
          <p className="break-all font-mono">{registrationId}</p>
          <button
            type="button"
            onClick={() => copyToClipboard(registrationId)}
            className="mt-2 underline"
          >
            Sao chép mã hồ sơ
          </button>
          <p className="mt-2">
            Lưu mã này khi cần liên hệ trung tâm. Để xem lịch sử học, nhập CCCD
            tại trang Tra cứu và xác thực bằng mã gửi đến email trong hồ sơ học
            viên. Nếu chưa cung cấp hoặc đã đổi email, vui lòng liên hệ trung
            tâm.
          </p>
        </div>
      )}
      {/* Stepper */}
      <div className="flex items-start justify-between mb-6 relative">
        <div className="absolute left-0 top-5 -translate-y-1/2 w-full h-1 bg-gray-100 rounded-full z-0"></div>
        <div
          className="absolute left-0 top-5 -translate-y-1/2 h-1 bg-[var(--color-brand-500)] rounded-full z-0 transition-all duration-500"
          style={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
        ></div>

        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className="relative z-10 flex flex-col items-center gap-2"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${
                step >= s
                  ? "bg-[var(--color-brand-600)] text-white shadow-lg shadow-blue-500/30"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {step > s ? <Check size={18} /> : s}
            </div>
            <span
              className={`text-[13px] leading-5 font-medium text-center ${step >= s ? "text-[var(--color-brand-700)]" : "text-gray-400"}`}
            >
              {s === 1
                ? "Xác nhận lớp"
                : s === 2
                  ? "Thông tin cá nhân"
                  : "Thanh toán"}
            </span>
          </div>
        ))}
      </div>

      {/* Content */}
      <div>
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
              <h3 className="text-xl font-bold text-gray-900">
                Bạn đang đăng ký khóa học:
              </h3>
              <div className="text-2xl md:text-3xl font-black text-[var(--color-brand-600)]">
                {classData.name}
              </div>
              <div className="inline-block bg-white px-4 py-2 rounded-xl border border-blue-200 font-bold text-[var(--color-brand-700)] shadow-sm">
                MÃ LỚP: {classData.code}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl shadow-sm">
                  📅
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Ngày học
                  </div>
                  <div className="font-bold text-gray-900">
                    {new Date(classData.startDate).toLocaleDateString("vi-VN")}
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl shadow-sm">
                  ⏰
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Thời gian
                  </div>
                  <div className="font-bold text-gray-900">
                    {classData.startTime} - {classData.endTime}
                  </div>
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
        {step <= 2 && (
          <motion.div
            key="step2"
            className={step === 2 ? "" : "hidden"}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <RegistrationIdentity cccd={formData.cccd} unlocked={identityReady} returning={returning} disabled={isLoading || Boolean(uploadingField)}
              onCccdChange={value => setFormData(previous => ({ ...previous, cccd: value }))}
              onReady={ready} onReset={resetIdentity} />
            {!identityReady && <Button type="button" variant="ghost" onClick={() => setStep(1)}>Quay lại chọn lớp</Button>}
            {identityReady && <form onSubmit={handleSubmitForm} className="space-y-5">
              {returning && <p className="text-sm leading-6 text-muted-foreground">Nếu bạn sửa thông tin, trung tâm sẽ đối chiếu thay đổi trong lần đăng ký này. Để đổi email tra cứu lâu dài, vui lòng liên hệ trung tâm.</p>}
              <fieldset disabled={isLoading} className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="signup-name" className="block text-sm font-medium">Họ và tên <span aria-hidden="true" className="text-destructive">*</span></label>
                  <Input id="signup-name" required autoComplete="name" value={formData.fullName} maxLength={250}
                    onChange={event => setFormData({ ...formData, fullName: event.target.value })} placeholder="VD: Nguyễn Văn A" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-dob" className="block text-sm font-medium">Ngày sinh <span aria-hidden="true" className="text-destructive">*</span></label>
                  <DateTimePicker id="signup-dob" calendarLabel="Ngày sinh" required value={formData.dob}
                    onValueChange={value => setFormData({ ...formData, dob: value })} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-gender" className="block text-sm font-medium">Giới tính <span aria-hidden="true" className="text-destructive">*</span></label>
                  <SelectField id="signup-gender" required value={formData.gender} placeholder="Chọn giới tính"
                    onValueChange={value => setFormData({ ...formData, gender: value as typeof formData.gender })}>
                    <SelectOption value="MALE">Nam</SelectOption><SelectOption value="FEMALE">Nữ</SelectOption><SelectOption value="OTHER">Khác</SelectOption>
                  </SelectField>
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-phone" className="block text-sm font-medium">Số điện thoại <span aria-hidden="true" className="text-destructive">*</span></label>
                  <Input id="signup-phone" required type="tel" autoComplete="tel" className="tabular-nums" value={formData.phone} maxLength={20}
                    onChange={event => setFormData({ ...formData, phone: event.target.value })} placeholder="VD: 0987654321" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-email" className="block text-sm font-medium">Email</label>
                  <Input id="signup-email" type="email" autoComplete="email" value={formData.email} maxLength={250}
                    onChange={event => setFormData({ ...formData, email: event.target.value })} placeholder="VD: email@example.com" />
                  <p className="text-[13px] leading-5 text-muted-foreground">Dùng để xác thực khi tra cứu hoặc đăng ký lần sau.</p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-organization" className="block text-sm font-medium">Đơn vị / tổ chức (nếu có)</label>
                  <Input id="signup-organization" autoComplete="organization" value={formData.organization} maxLength={250}
                    onChange={event => setFormData({ ...formData, organization: event.target.value })} placeholder="VD: Công ty TNHH ABC" />
                </div>
                {classData.courseType !== "COMMUNITY_FIRST_AID" && <div className="space-y-2 md:col-span-2">
                  <label htmlFor="signup-workplace" className="block text-sm font-medium">Nơi công tác chuyên môn <span aria-hidden="true" className="text-destructive">*</span></label>
                  <Input id="signup-workplace" required value={formData.workplace} maxLength={250}
                    onChange={event => setFormData({ ...formData, workplace: event.target.value })} />
                </div>}
              </fieldset>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                {/* Upload CCCD */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Ảnh mặt trước CCCD {classData.courseType === "COMMUNITY_FIRST_AID" ? "(Tùy chọn)" : "*"}
                  </label>
                  <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors">
                    {uploadingField === "idPhotoUrl" ? (
                      <Loader2
                        className="animate-spin mx-auto text-blue-500"
                        size={24}
                      />
                    ) : formData.idPhotoUrl ? (
                      <div className="flex flex-col items-center">
                        <Check className="text-emerald-500 mb-2" size={24} />
                        <span className="text-sm font-medium text-emerald-600">
                          Đã tải lên CCCD
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-gray-500">
                        <Upload size={24} className="mb-2" />
                        <span className="text-sm">Chọn file ảnh</span>
                      </div>
                    )}
                    <input
                      disabled={isLoading || Boolean(uploadingField)}
                      type="file"
                      required={
                        classData.courseType !== "COMMUNITY_FIRST_AID" &&
                        !formData.idPhotoUrl
                      }
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload(e, "idPhotoUrl")}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Upload Degree */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {classData.courseType === "AMBULANCE_DRIVER"
                      ? "Bằng lái xe"
                      : "Văn bằng chuyên môn"}{" "}
                    {classData.courseType === "COMMUNITY_FIRST_AID"
                      ? "(Nếu có)"
                      : "*"}
                  </label>
                  <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors">
                    {uploadingField === "degreeUrl" ? (
                      <Loader2
                        className="animate-spin mx-auto text-blue-500"
                        size={24}
                      />
                    ) : formData.degreeUrl ? (
                      <div className="flex flex-col items-center">
                        <Check className="text-emerald-500 mb-2" size={24} />
                        <span className="text-sm font-medium text-emerald-600">
                          Đã tải lên Bằng cấp
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-gray-500">
                        <Upload size={24} className="mb-2" />
                        <span className="text-sm">Chọn file ảnh</span>
                      </div>
                    )}
                    <input
                      disabled={isLoading || Boolean(uploadingField)}
                      type="file"
                      required={
                        classData.courseType !== "COMMUNITY_FIRST_AID" &&
                        !formData.degreeUrl
                      }
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload(e, "degreeUrl")}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row">
                <Button type="button" variant="outline" disabled={isLoading || Boolean(uploadingField)} onClick={() => setStep(1)}>Quay lại</Button>
                <Button type="submit" disabled={isLoading || Boolean(uploadingField)} className="sm:flex-1">
                  {isLoading && <Loader2 className="animate-spin" />}
                  Xác nhận và tiếp tục thanh toán <ChevronRight />
                </Button>
              </div>
            </form>}
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
              <h3 className="text-2xl font-bold text-gray-900">
                Hướng dẫn Thanh toán
              </h3>
              <p className="text-gray-600 font-medium">
                Thông tin của bạn đã được lưu tạm. Vui lòng thanh toán học phí
                và tải lên biên lai để hoàn tất giữ chỗ.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-8 bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
              {/* QR Code */}
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <div className="font-bold text-gray-800 text-center">
                  Quét mã VietQR để thanh toán nhanh
                </div>
                <div className="border-4 border-[var(--color-brand-500)] rounded-2xl p-2 bg-white inline-block">
                  <Image
                    unoptimized
                    src={qrUrl}
                    alt="VietQR"
                    width={256}
                    height={256}
                    className="w-48 h-48 md:w-64 md:h-64 object-contain"
                  />
                </div>
                <div className="text-sm font-semibold text-[var(--color-brand-600)] bg-blue-50 px-4 py-2 rounded-full">
                  Quét bằng ứng dụng Ngân hàng
                </div>
              </div>

              {/* Manual Info */}
              <div className="flex-1 space-y-5">
                <div className="font-bold text-gray-800 border-b border-gray-100 pb-2">
                  Hoặc chuyển khoản thủ công:
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-semibold text-gray-500 uppercase">
                    Ngân hàng
                  </div>
                  <div className="font-bold text-gray-900">
                    {bankSettings.bankName}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-semibold text-gray-500 uppercase">
                    Chủ tài khoản
                  </div>
                  <div className="font-bold text-gray-900">
                    {bankSettings.accountName}
                  </div>
                </div>

                <div className="flex justify-between items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-gray-500 uppercase">
                      Số tài khoản
                    </div>
                    <div className="font-black text-xl text-[var(--color-brand-700)] tracking-wider">
                      {bankSettings.accountNumber}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(bankSettings.accountNumber)}
                    className="text-gray-500 hover:text-blue-600 p-2"
                  >
                    <Copy size={18} />
                  </button>
                </div>

                <div className="flex justify-between items-end bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-orange-600 uppercase">
                      Số tiền
                    </div>
                    <div className="font-black text-xl text-rose-600">
                      {new Intl.NumberFormat("vi-VN").format(
                        classData.fee ?? 400000,
                      )}{" "}
                      đ
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-end bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-[var(--color-brand-600)] uppercase">
                      Nội dung chuyển khoản
                    </div>
                    <div className="font-bold text-gray-900">
                      {transferContent}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(transferContent)}
                    className="text-[var(--color-brand-600)] hover:text-blue-800 p-2"
                  >
                    <Copy size={18} />
                  </button>
                </div>

                {/* Upload Biên lai */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tải lên biên lai chuyển khoản (Tùy chọn)
                  </label>
                  <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors">
                    {uploadingField === "paymentReceiptUrl" ? (
                      <Loader2
                        className="animate-spin mx-auto text-blue-500"
                        size={24}
                      />
                    ) : formData.paymentReceiptUrl ? (
                      <div className="flex flex-col items-center">
                        <Check className="text-emerald-500 mb-2" size={24} />
                        <span className="text-sm font-medium text-emerald-600">
                          Đã tải lên Biên lai
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-gray-500">
                        <Upload size={24} className="mb-2" />
                        <span className="text-sm">Chọn file ảnh biên lai</span>
                      </div>
                    )}
                    <input
                      disabled={isLoading || Boolean(uploadingField)}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      onChange={(e) => handleFileUpload(e, "paymentReceiptUrl")}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-200 text-sm font-medium">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <p>
                Trung tâm sẽ kiểm tra hồ sơ và đối soát thanh toán. Bạn có thể
                theo dõi bằng CCCD và mã xác thực gửi đến email trong hồ sơ học
                viên. Nếu cần hỗ trợ khẩn cấp, vui lòng gọi Hotline: 0387 644
                522.
              </p>
            </div>

            <button
              disabled={Boolean(uploadingField)}
              onClick={() => setIsCompleted(true)}
              className="w-full py-4 bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center mt-8"
            >
              Lưu / Hoàn tất đăng ký
            </button>

            <div className="pt-4 text-center">
              <a
                href="/hocsocapcuu"
                className="inline-block font-bold text-gray-500 hover:text-gray-900 underline underline-offset-4"
              >
                Quay lại Trang chủ
              </a>
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
              <h3 className="text-3xl font-extrabold text-gray-900">
                Đã tiếp nhận thông tin đăng ký!
              </h3>
              <p className="text-gray-600 font-medium text-lg max-w-lg mx-auto">
                Hệ thống đã ghi nhận thông tin của bạn và đang chờ kiểm tra. Vui
                lòng lưu mã đăng ký để liên hệ trung tâm; kết quả tiếp nhận này
                chưa xác nhận thanh toán hoặc duyệt hồ sơ.
              </p>
            </div>

            <div className="pt-8 text-center">
              <a
                href="/hocsocapcuu"
                className="inline-block px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
              >
                Quay lại Trang chủ
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
