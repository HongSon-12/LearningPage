"use client";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Search, Check, X, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import type { AttendanceCandidate } from "@/lib/attendance";
import { sessionTimeLabel } from "@/lib/session-input";
import {
  searchAttendance,
  confirmAttendance,
  closeSession,
} from "@/app/actions/attendance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { StatusBadge } from "@/components/admin/status-badge";
import AdminDialog from "../../../../components/AdminDialog";
const QrCamera = dynamic(() => import("@/components/attendance/qr-camera"), {
  ssr: false,
  loading: () => <p role="status">Đang tải camera…</p>,
});
type Entry = {
  id: string;
  registrationId: string;
  fullName: string;
  method: string;
  recordedAt: string;
  inRoster: boolean;
};
function IdentityReview({
  candidate,
  busy,
  onConfirm,
  onCancel,
}: {
  candidate: AttendanceCandidate;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [compared, setCompared] = useState(false);
  const [imageError, setImageError] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3
          id="identity-review-name"
          tabIndex={-1}
          className="text-xl font-semibold"
        >
          {candidate.fullName}
        </h3>
        <StatusBadge kind="registration" value={candidate.status} />
        <StatusBadge kind="payment" value={candidate.paymentStatus} />
      </div>
      <p>
        CCCD:{" "}
        <strong className="break-all font-mono">
          {candidate.cccd || "Chưa có"}
        </strong>
      </p>
      <p>Ngày sinh: {candidate.dob.split("-").reverse().join("/")}</p>
      {candidate.needsReview && (
        <p
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"
        >
          Hồ sơ đang cần đối chiếu thông tin. Kiểm tra kỹ căn cước gốc và thông
          tin đăng ký trước khi xác nhận.
        </p>
      )}
      {candidate.previewUrl && !imageError ? (
        <Image
          unoptimized
          src={candidate.previewUrl}
          alt="Ảnh căn cước đã đăng ký của học viên"
          width={800}
          height={500}
          onError={() => setImageError(true)}
          className="max-h-80 w-full rounded-lg border object-contain"
        />
      ) : (
        <p role="status" className="rounded-lg bg-muted p-4 text-sm">
          {imageError
            ? "Không tải được ảnh căn cước. Hãy kiểm tra quyền truy cập hoặc mở hồ sơ gốc."
            : candidate.downloadUrl
              ? "Tài liệu căn cước đã đăng ký là PDF; hãy mở tài liệu để đối chiếu."
              : "Học viên chưa có ảnh căn cước đã đăng ký. Hãy đối chiếu căn cước gốc và hồ sơ trực tiếp."}
        </p>
      )}
      {candidate.downloadUrl && (
        <Button variant="outline" asChild>
          <a
            href={candidate.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Mở tài liệu căn cước đã đăng ký
          </a>
        </Button>
      )}
      <Label className="flex items-start gap-3 rounded-lg border p-4 leading-6">
        <input
          className="mt-1 size-4 shrink-0"
          type="checkbox"
          checked={compared}
          onChange={(e) => setCompared(e.target.checked)}
          disabled={busy}
        />
        Tôi đã đối chiếu người học với căn cước và hồ sơ đăng ký.
      </Label>
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="outline" disabled={busy} onClick={onCancel}>
          <X />
          Không khớp / Đóng
        </Button>
        <Button disabled={!compared || busy} onClick={onConfirm}>
          <Check />
          {busy ? "Đang ghi nhận…" : "Xác nhận có mặt"}
        </Button>
      </div>
    </div>
  );
}
export default function AttendanceBoard({
  sessionId,
  closed,
  rosterCount,
  presentInRoster,
  entries,
}: {
  sessionId: string;
  closed: boolean;
  rosterCount: number;
  presentInRoster: number;
  entries: Entry[];
}) {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AttendanceCandidate[] | null>(null);
  const [selected, setSelected] = useState<AttendanceCandidate | null>(null);
  const [source, setSource] = useState<"QR" | "MANUAL">("MANUAL");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [withdrawing, setWithdrawing] = useState<Entry | null>(null);
  const [closing, setClosing] = useState(false);
  async function search(text: string, method: "QR" | "MANUAL") {
    setScanning(false);
    setSelected(null);
    setResults(null);
    setError("");
    setBusy(true);
    setSource(method);
    try {
      const result = await searchAttendance(sessionId, text, method);
      if (!result.success) {
        setError(result.error || "Không tìm được học viên.");
        return;
      }
      const data = result.data || [];
      if (method === "QR" && data.length === 1) setSelected(data[0]);
      else setResults(data);
      if (method === "QR" && !data.length)
        setError(
          "Không tìm thấy căn cước trong danh sách học của lớp. Có thể tìm thủ công để kiểm tra lại.",
        );
    } catch {
      setError("Không tìm được học viên. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }
  async function mark(registrationId: string, present: boolean) {
    setBusy(true);
    try {
      const result = await confirmAttendance(
        sessionId,
        registrationId,
        present,
        source,
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setSelected(null);
      setResults(null);
      setQuery("");
      setWithdrawing(null);
      toast.success(
        present ? "Đã ghi nhận có mặt." : "Đã hủy ghi nhận điểm danh.",
      );
      router.refresh();
    } catch {
      toast.error("Không lưu được điểm danh. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }
  async function toggleClosed() {
    setBusy(true);
    try {
      const result = await closeSession(sessionId, !closed);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setClosing(false);
      setScanning(false);
      setResults(null);
      setSelected(null);
      toast.success(closed ? "Đã mở lại buổi học." : "Đã chốt điểm danh.");
      router.refresh();
    } catch {
      toast.error("Không đổi được trạng thái buổi học.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Danh sách học", rosterCount],
          ["Đã có mặt", presentInRoster],
          ["Chưa ghi nhận", Math.max(0, rosterCount - presentInRoster)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge variant={closed ? "secondary" : "outline"}>
          {closed ? "Đã chốt điểm danh" : "Đang mở điểm danh"}
        </Badge>
        <Button
          id="session-close"
          variant="outline"
          disabled={busy}
          onClick={() => setClosing(true)}
        >
          <LockKeyhole />
          {closed ? "Mở lại điểm danh" : "Chốt điểm danh"}
        </Button>
      </div>
      {!closed && (
        <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Tìm và xác nhận học viên</h2>
            <Button
              id="attendance-camera"
              disabled={busy || scanning}
              onClick={() => {
                setScanning(true);
                setResults(null);
                setError("");
              }}
            >
              <Camera />
              Mở camera quét CCCD
            </Button>
          </div>
          {scanning && (
            <QrCamera
              onCode={(cccd) => void search(cccd, "QR")}
              onClose={() => setScanning(false)}
            />
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void search(query, "MANUAL");
            }}
            className="space-y-2"
          >
            <Label htmlFor="attendance-query">
              Tìm thủ công theo họ tên, số điện thoại hoặc CCCD
            </Label>
            <div className="flex gap-2">
              <Input
                id="attendance-query"
                value={query}
                minLength={2}
                maxLength={120}
                required
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nhập ít nhất 2 ký tự…"
              />
              <Button disabled={busy} type="submit">
                <Search />
                <span className="sr-only sm:not-sr-only">Tìm học viên</span>
              </Button>
            </div>
          </form>
          {busy && !selected && (
            <p role="status" className="text-sm">
              Đang xử lý…
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {results && (
            <div className="space-y-2" aria-label="Kết quả tìm học viên">
              {results.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Không có học viên phù hợp trong danh sách học của lớp.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {results.length} kết quả
                  {results.length === 20
                    ? " (tối đa 20; hãy nhập cụ thể hơn)"
                    : ""}
                  . Chọn hồ sơ để đối chiếu trước khi điểm danh.
                </p>
              )}
              {results.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="break-words font-medium">
                      {candidate.fullName}
                    </p>
                    <p className="text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">
                      CCCD:{" "}
                      {candidate.cccd
                        ? `********${candidate.cccd.slice(-4)}`
                        : "Chưa có"}
                    </p>
                  </div>
                  <Button
                    id={`attendance-review-${candidate.id}`}
                    variant="outline"
                    disabled={busy}
                    onClick={() => setSelected(candidate)}
                  >
                    Đối chiếu hồ sơ
                  </Button>
                </div>
              ))}
            </div>
          )}
          <p className="text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">
            Quét QR chỉ tìm hồ sơ trong lớp. Chưa ghi nhận không có nghĩa là
            vắng học.
          </p>
        </section>
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Đã ghi nhận có mặt ({entries.length})
        </h2>
        {!entries.length && (
          <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            Chưa có học viên được điểm danh trong buổi này.
          </p>
        )}
        {entries.map((entry) => (
          <article
            key={entry.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"
          >
            <div className="min-w-0">
              <h3 className="break-words font-medium">{entry.fullName}</h3>
              <p className="text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">
                {sessionTimeLabel(entry.recordedAt)} ·{" "}
                {entry.method === "QR" ? "Quét QR" : "Tìm thủ công"}
              </p>
              {!entry.inRoster && (
                <p className="text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-amber-700">
                  Đã chuyển lớp hoặc không còn trong danh sách học; giữ lịch sử
                  buổi này.
                </p>
              )}
            </div>
            {!closed && (
              <Button
                id={`attendance-withdraw-${entry.id}`}
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setWithdrawing(entry);
                  setSource(entry.method === "QR" ? "QR" : "MANUAL");
                }}
              >
                Hủy ghi nhận
              </Button>
            )}
          </article>
        ))}
      </section>
      {selected && !closed && (
        <AdminDialog
          initialFocusId="identity-review-name"
          title="Đối chiếu căn cước trước khi điểm danh"
          subtitle={
            source === "QR"
              ? "Đã đọc số căn cước từ QR. Chưa ghi nhận điểm danh."
              : "Kiểm tra người học và hồ sơ đã đăng ký."
          }
          returnFocusId={
            source === "QR"
              ? "attendance-camera"
              : `attendance-review-${selected.id}`
          }
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <IdentityReview
            key={selected.id}
            candidate={selected}
            busy={busy}
            onConfirm={() => void mark(selected.id, true)}
            onCancel={() => setSelected(null)}
          />
        </AdminDialog>
      )}
      <ConfirmDialog
        confirmLabel="Xác nhận"
        open={Boolean(withdrawing)}
        onOpenChange={(open) => {
          if (!open && !busy) setWithdrawing(null);
        }}
        returnFocusId={
          withdrawing ? `attendance-withdraw-${withdrawing.id}` : undefined
        }
        title="Hủy ghi nhận điểm danh?"
        description={`Hủy ghi nhận có mặt của ${withdrawing?.fullName || "học viên"} trong buổi này. Lịch sử thao tác vẫn được lưu.`}
        pending={busy}
        onConfirm={() => {
          if (withdrawing) void mark(withdrawing.registrationId, false);
        }}
      />
      <ConfirmDialog
        confirmLabel="Xác nhận"
        confirmVariant="default"
        open={closing}
        onOpenChange={(open) => {
          if (!busy) setClosing(open);
        }}
        returnFocusId="session-close"
        title={closed ? "Mở lại điểm danh?" : "Chốt điểm danh?"}
        description={
          closed
            ? "Quản lý có thể tiếp tục ghi nhận hoặc chỉnh điểm danh của buổi này."
            : "Sau khi chốt, cần mở lại buổi học trước khi sửa điểm danh."
        }
        pending={busy}
        onConfirm={() => void toggleClosed()}
      />
    </div>
  );
}
