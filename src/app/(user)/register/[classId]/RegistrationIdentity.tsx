"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestRegistrationProfile, verifyRegistrationProfile } from "@/app/actions/registration-profile";
export type ReturningProfile = NonNullable<Awaited<ReturnType<typeof verifyRegistrationProfile>>["data"]>;
export function RegistrationIdentity({ cccd, unlocked, returning, disabled = false, onCccdChange, onReady, onReset }: {
  cccd: string; unlocked: boolean; returning: boolean; disabled?: boolean;
  onCccdChange: (value: string) => void;
  onReady: (profile?: ReturningProfile) => void;
  onReset: () => void;
}) {
  const [challenge, setChallenge] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(0);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  useEffect(() => {
    if (!challenge) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [challenge]);
  const remaining = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const valid = /^[0-9]{12}$/.test(cccd);
  async function request(event?: FormEvent) {
    event?.preventDefault();
    if (!valid || busy) return;
    const current = ++generation.current;
    setBusy(true); setError("");
    try {
      const response = await requestRegistrationProfile(cccd);
      if (current !== generation.current) return;
      if (response.success) {
        setChallenge(response.challengeId); setCode(""); setMessage(response.message);
        const time = Date.now(); setNow(time); setResendAt(time + 60000);
      } else setError(response.error);
    } catch { if (current === generation.current) setError("Chưa gửi được yêu cầu. Bạn có thể thử lại hoặc tự điền thông tin."); }
    finally { if (current === generation.current) setBusy(false); }
  }
  async function verify(event: FormEvent) {
    event.preventDefault();
    if (busy || code.length !== 6) return;
    const current = ++generation.current;
    setBusy(true); setError("");
    try {
      const response = await verifyRegistrationProfile(challenge, code, cccd);
      if (current !== generation.current) return;
      if (response.success) { setChallenge(""); setCode(""); setMessage(""); onReady(response.data); }
      else setError(response.error);
    } catch { if (current === generation.current) setError("Chưa xác thực được. Vui lòng thử lại hoặc tự điền thông tin."); }
    finally { if (current === generation.current) setBusy(false); }
  }
  function reset() {
    generation.current++; setChallenge(""); setCode(""); setMessage(""); setError(""); onReset();
  }
  return <section aria-label="Định danh học viên" className="mb-5 space-y-4 rounded-xl border bg-white p-4 sm:p-5">
    {!unlocked && <div className="flex items-start gap-3">
      <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
      <div><h2 className="text-base font-semibold">Bắt đầu với số căn cước</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">Đã từng đăng ký học? Xác thực email để điền lại thông tin. Học viên mới có thể tự điền ngay.</p></div>
    </div>}
    <form onSubmit={challenge ? verify : request} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-cccd">Số CCCD <span aria-hidden="true" className="text-destructive">*</span></Label>
        <Input id="signup-cccd" required inputMode="numeric" autoComplete="off" maxLength={12} pattern="[0-9]{12}" title="CCCD gồm 12 chữ số"
          className="tabular-nums" value={cccd} disabled={disabled || busy || unlocked || Boolean(challenge)}
          onChange={event => { setError(""); onCccdChange(event.target.value.replace(/[^0-9]/g, "").slice(0, 12)); }}
          placeholder="Nhập CCCD gồm 12 chữ số" />
      </div>
      {unlocked ? <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
        <p role="status" className="flex flex-1 items-start gap-2 text-sm leading-6 text-emerald-800">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          {returning ? "Chào mừng bạn quay lại! Hãy kiểm tra thông tin đã điền và sửa nếu cần." : "Kiểm tra thông tin bên dưới trước khi chuyển sang thanh toán."}
        </p>
        <Button type="button" variant="outline" disabled={disabled} onClick={reset}>Đổi CCCD</Button>
      </div> : <>
        {challenge && <>
          <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm leading-6 text-blue-900">{message}</p>
          <div className="space-y-2">
            <Label htmlFor="signup-otp">Mã xác thực email</Label>
            <Input id="signup-otp" required autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} disabled={disabled || busy}
              value={code} onChange={event => setCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              className="max-w-xs text-center tracking-[0.3em] tabular-nums" placeholder="6 chữ số" />
            <p className="text-[13px] leading-5 text-muted-foreground">Mã có hiệu lực 10 phút và chỉ dùng một lần.</p>
          </div>
        </>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={disabled || busy || !valid || (Boolean(challenge) && code.length !== 6)}>
            {busy && <Loader2 className="animate-spin" />}
            {challenge ? "Xác thực và điền thông tin" : "Dùng thông tin đã đăng ký"}
          </Button>
          {challenge && <Button type="button" variant="outline" disabled={disabled || busy || remaining > 0} onClick={() => void request()}>
            {remaining > 0 ? `Gửi lại mã sau ${remaining}s` : "Gửi lại mã"}
          </Button>}
          <Button type="button" variant="outline" disabled={disabled || busy || !valid} onClick={() => { generation.current++; setChallenge(""); setCode(""); setMessage(""); setError(""); onReady(); }}>Tự điền thông tin</Button>
          {challenge && <Button type="button" variant="ghost" disabled={disabled || busy} onClick={reset}>Đổi CCCD</Button>}
        </div>
      </>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  </section>;
}
