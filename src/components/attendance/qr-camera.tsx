"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cccdFromQr } from "@/lib/cccd-qr";
export default function QrCamera({
  onCode,
  onClose,
}: {
  onCode: (cccd: string) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [hint, setHint] = useState("Đang mở camera…");
  const found = useEffectEvent(onCode);
  const close = useEffectEvent(onClose);
  useEffect(() => {
    let disposed = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      if (video.current) video.current.srcObject = null;
    };
    const hide = () => {
      if (document.hidden) {
        disposed = true;
        stop();
        close();
      }
    };
    document.addEventListener("visibilitychange", hide);
    async function start() {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
          throw new Error(
            "Mở trang bằng HTTPS để dùng camera trên điện thoại. Bạn vẫn có thể tìm học viên thủ công.",
          );
        const decoder = await import("jsqr");
        if (disposed) return;
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (disposed) {
          stop();
          return;
        }
        if (!video.current) {
          stop();
          return;
        }
        const element: HTMLVideoElement = video.current;
        element.srcObject = stream;
        await element.play();
        if (disposed) {
          stop();
          return;
        }
        setReady(true);
        setHint("Đưa mã QR trên căn cước vào khung hình, giữ yên và đủ sáng.");
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context)
          throw new Error(
            "Trình duyệt không hỗ trợ đọc hình ảnh. Hãy tìm thủ công.",
          );
        function tick() {
          if (disposed) return;
          try {
            if (element.videoWidth && element.readyState >= 2) {
              const scale = Math.min(
                1,
                960 / Math.max(element.videoWidth, element.videoHeight),
              );
              canvas.width = Math.round(element.videoWidth * scale);
              canvas.height = Math.round(element.videoHeight * scale);
              context!.drawImage(element, 0, 0, canvas.width, canvas.height);
              const pixels = context!.getImageData(
                0,
                0,
                canvas.width,
                canvas.height,
              );
              const code = decoder.default(
                pixels.data,
                pixels.width,
                pixels.height,
                { inversionAttempts: "dontInvert" },
              );
              if (code) {
                const cccd = cccdFromQr(code.data);
                if (cccd) {
                  disposed = true;
                  stop();
                  found(cccd);
                  return;
                }
                setHint(
                  "Chưa nhận dạng được mã căn cước này. Thử lại hoặc tìm thủ công.",
                );
              }
            }
            timer = setTimeout(tick, 200);
          } catch {
            stop();
            setError(
              "Không đọc được hình ảnh camera. Hãy mở lại hoặc tìm thủ công.",
            );
          }
        }
        tick();
      } catch (reason) {
        stop();
        if (disposed) return;
        const name = reason instanceof Error ? reason.name : "";
        setError(
          name === "NotAllowedError"
            ? "Chưa được cấp quyền camera. Cho phép camera trong trình duyệt hoặc tìm thủ công."
            : name === "NotFoundError"
              ? "Không tìm thấy camera. Hãy tìm học viên thủ công."
              : reason instanceof Error && reason.message.startsWith("Mở trang")
                ? reason.message
                : "Không mở được camera. Kiểm tra camera có đang được ứng dụng khác sử dụng hay tìm thủ công.",
        );
      }
    }
    void start();
    return () => {
      disposed = true;
      stop();
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  return (
    <section
      className="space-y-3 rounded-xl border bg-card p-4"
      aria-label="Quét QR căn cước"
    >
      <video
        ref={video}
        muted
        playsInline
        autoPlay
        aria-label="Camera quét căn cước"
        className="aspect-[4/3] max-h-96 w-full rounded-lg bg-black object-contain"
      />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        <p role="status" className="text-sm">
          {ready ? hint : "Đang xin quyền truy cập camera…"}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Hình ảnh camera được xử lý trên thiết bị và không tải lên máy chủ.
      </p>
      <Button variant="outline" onClick={onClose}>
        Tắt camera
      </Button>
    </section>
  );
}
