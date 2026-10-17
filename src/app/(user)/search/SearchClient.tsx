"use client";
import { useEffect, useState, type FormEvent } from "react";
import { requestSearchCode, verifySearchCode } from "@/app/actions/search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
type Result = NonNullable<Awaited<ReturnType<typeof verifySearchCode>>["data"]>;
const date = (value: string) => new Date(value).toLocaleDateString("vi-VN");
export default function SearchClient() {
  const [cccd, setCccd] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!challengeId) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [challengeId]);
  const remaining = Math.max(0, Math.ceil((resendAt - now) / 1000));
  async function request(event?: FormEvent) {
    event?.preventDefault();
    setMessage("");
    if (!/^[0-9]{12}$/.test(cccd.trim().replace(/[\s.-]/g, ""))) {
      setMessage("Vui lòng nhập CCCD gồm 12 chữ số.");
      return;
    }
    setBusy(true);
    try {
      const response = await requestSearchCode(cccd);
      if (response.success && response.challengeId) {
        setChallengeId(response.challengeId);
        setCode("");
        setResult(null);
        setMessage(response.message || "");
        const time = Date.now();
        setNow(time);
        setResendAt(time + 60000);
      } else setMessage(response.error || "Vui lòng thử lại.");
    } catch {
      setMessage("Chưa gửi được yêu cầu. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }
  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!challengeId) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await verifySearchCode(challengeId, code);
      if (response.success && response.data) {
        setResult(response.data);
        setChallengeId(null);
        setCccd("");
        setCode("");
      } else setMessage(response.error || "Mã xác thực không hợp lệ.");
    } catch {
      setMessage("Không thể tra cứu. Vui lòng thử lại hoặc yêu cầu mã mới.");
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    setChallengeId(null);
    setCode("");
    setCccd("");
    setResult(null);
    setMessage("");
  }
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {!result &&
        (challengeId ? (
          <form
            onSubmit={verify}
            className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-bold">Xác thực email</h2>
            <p className="text-sm text-gray-600">
              Nhập mã 6 chữ số gửi đến email trong hồ sơ học viên. Mã có hiệu
              lực 10 phút và chỉ dùng một lần.
            </p>
            <div className="space-y-2">
              <Label htmlFor="lookup-otp">Mã xác thực</Label>
              <Input
                id="lookup-otp"
                required
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))
                }
                className="max-w-xs text-center text-xl tracking-[0.4em]"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button disabled={busy || code.length !== 6} type="submit">
                {busy ? "Đang kiểm tra…" : "Xác thực và xem lịch sử học"}
              </Button>
              <Button
                variant="outline"
                type="button"
                disabled={busy || remaining > 0}
                onClick={() => void request()}
              >
                {remaining > 0 ? `Gửi lại mã sau ${remaining}s` : "Gửi lại mã"}
              </Button>
              <Button
                variant="ghost"
                type="button"
                disabled={busy}
                onClick={reset}
              >
                Đổi CCCD
              </Button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={request}
            className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm"
          >
            <div className="space-y-2">
              <Label htmlFor="lookup-cccd">Số căn cước công dân</Label>
              <Input
                id="lookup-cccd"
                required
                inputMode="numeric"
                autoComplete="off"
                maxLength={18}
                value={cccd}
                onChange={(event) => setCccd(event.target.value)}
                placeholder="Nhập CCCD gồm 12 chữ số"
              />
            </div>
            <Button disabled={busy} type="submit">
              {busy ? "Đang gửi yêu cầu…" : "Gửi mã xác thực"}
            </Button>
            <p className="text-sm text-gray-600">
              Mã được gửi đến email trong hồ sơ học viên. Nếu chưa cung cấp
              email hoặc đã đổi email, vui lòng liên hệ trung tâm để đối chiếu
              hồ sơ.
            </p>
          </form>
        ))}
      {message && (
        <p role="status" className="rounded-xl border bg-blue-50 p-4 text-sm">
          {message}
        </p>
      )}
      {result && (
        <section className="space-y-5">
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="text-2xl font-bold">Lịch sử học</h2>
            <p className="mt-2 text-gray-600">
              Học viên: {result.fullName} · {result.total} lần đăng ký
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Trạng thái dưới đây phản ánh từng lần đăng ký; lớp kết thúc chưa
              đồng nghĩa đã được cấp chứng chỉ. Nếu thiếu lần học, vui lòng liên
              hệ trung tâm để đối chiếu hồ sơ.
            </p>
          </div>
          {result.history.map((reg) => (
            <article
              key={reg.id}
              className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm"
            >
              <div>
                <h3 className="text-lg font-bold">{reg.class.name}</h3>
                <p className="break-words text-sm text-gray-600">
                  Mã lớp: {reg.class.code}
                </p>
                <p className="mt-2 text-sm">
                  {date(reg.class.startDate)} – {date(reg.class.endDate)}
                  {reg.class.status === "DONE" ? " · Lớp đã kết thúc" : ""}
                </p>
              </div>
              <dl className="grid gap-4 sm:grid-cols-2">
                {[
                  [
                    "Đăng ký",
                    reg.status === "APPROVED"
                      ? "Đã duyệt"
                      : reg.status === "REJECTED"
                        ? "Đã từ chối"
                        : "Đang xử lý",
                  ],
                  [
                    "Thanh toán",
                    reg.paymentStatus === "PAID"
                      ? "Đã thanh toán"
                      : reg.paymentStatus === "CANCELLED"
                        ? "Đã hủy"
                        : "Chờ thanh toán",
                  ],
                  ["Mã hóa đơn", reg.invoiceCode || "Chưa phát hành"],
                  ["Số chứng chỉ", reg.certificateCode || "Chưa cấp"],
                  ["Số giấy xác nhận", reg.confirmationNumber || "Chưa cấp"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-sm text-gray-500">{label}</dt>
                    <dd className="break-words font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
          {!result.history.length && (
            <p className="rounded-xl border bg-white p-6">
              Hồ sơ chưa có lần đăng ký học nào.
            </p>
          )}
          {result.total > result.history.length && (
            <p className="text-sm text-gray-600">
              Đang hiển thị {result.history.length} lần đăng ký gần nhất. Liên
              hệ trung tâm để nhận lịch sử đầy đủ.
            </p>
          )}
          <Button variant="outline" onClick={reset}>
            Tra cứu lại
          </Button>
        </section>
      )}
    </div>
  );
}
