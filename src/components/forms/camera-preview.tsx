"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { cameraGuide, cameraImageBounds, type CameraGuide } from "@/lib/camera-guide";

// Image Capture extensions are not included in every version of lib.dom.
type CameraCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
  zoom?: { min: number; max: number; step: number };
};
type CameraSettings = MediaTrackSettings & { zoom?: number };
type ImageConstraints = MediaTrackConstraintSet & {
  focusMode?: string;
  zoom?: number;
  pointsOfInterest?: { x: number; y: number }[];
};

export function CameraPreview({ videoRef, stream, kind, ready, onReady, label }: {
  videoRef: RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  kind: CameraGuide;
  ready: boolean;
  onReady?: () => void;
  label: string;
}) {
  const id = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [capabilities, setCapabilities] = useState<CameraCapabilities>({});
  const [zoom, setZoom] = useState(1);
  const [adjusting, setAdjusting] = useState(false);
  const [message, setMessage] = useState("");
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const operation = useRef(false);
  const track = stream?.getVideoTracks()[0];

  useEffect(() => {
    if (!track) return;
    let active = true;
    let caps: CameraCapabilities = {};
    try { caps = track.getCapabilities?.() ?? {}; } catch { /* Camera remains usable. */ }
    setCapabilities(caps);
    setZoom((track.getSettings?.() as CameraSettings | undefined)?.zoom ?? caps.zoom?.min ?? 1);
    setMessage("");
    if (caps.focusMode?.includes("continuous")) {
      const constraints: ImageConstraints = { focusMode: "continuous" };
      void track.applyConstraints({ ...track.getConstraints(), advanced: [constraints] }).catch(() => {
        if (active) setMessage("Không bật được lấy nét liên tục. Hãy giữ yên và điều chỉnh khoảng cách.");
      });
    }
    return () => { active = false; };
  }, [track]);

  useEffect(() => {
    const element = videoRef.current, container = viewport.current;
    if (!element || !container) return;
    const update = () => {
      if (!element.videoWidth || !element.videoHeight) return;
      const image = cameraImageBounds(element.videoWidth, element.videoHeight, container.clientWidth, container.clientHeight);
      const guide = cameraGuide(image.width, image.height, kind);
      setFrame({ left: image.x + guide.x, top: image.y + guide.y, width: guide.width, height: guide.height });
    };
    const observer = new ResizeObserver(update);
    observer.observe(container);
    element.addEventListener("loadedmetadata", update);
    element.addEventListener("resize", update);
    update();
    return () => { observer.disconnect(); element.removeEventListener("loadedmetadata", update); element.removeEventListener("resize", update); };
  }, [videoRef, kind, ready]);

  async function adjust(values: ImageConstraints) {
    if (!track || operation.current) return false;
    operation.current = true;
    setAdjusting(true);
    try {
      // Retain the successfully applied focus/zoom settings across adjustments.
      const previous = track.getConstraints();
      const advanced = Object.assign({}, ...(previous.advanced ?? []), values) as ImageConstraints;
      await track.applyConstraints({ ...previous, advanced: [advanced] });
      if (track.readyState === "ended") return false;
      setMessage("Đã gửi yêu cầu điều chỉnh. Giữ yên và kiểm tra độ rõ của hình ảnh.");
      return true;
    } catch {
      setMessage("Camera chưa áp dụng được điều chỉnh. Hãy giữ yên và thay đổi khoảng cách.");
      return false;
    } finally { operation.current = false; setAdjusting(false); }
  }

  const focusMode = capabilities.focusMode?.includes("continuous") ? "continuous" : capabilities.focusMode?.includes("single-shot") ? "single-shot" : undefined;
  const pointSupported = typeof navigator !== "undefined" && Boolean((navigator.mediaDevices?.getSupportedConstraints?.() as (MediaTrackSupportedConstraints & { pointsOfInterest?: boolean }) | undefined)?.pointsOfInterest);
  const canFocus = Boolean(focusMode);
  const zoomRange = capabilities.zoom;
  return <div className="space-y-3">
    <div ref={viewport} className="relative overflow-hidden rounded-lg bg-black">
      <video ref={videoRef} autoPlay muted playsInline onCanPlay={onReady} aria-label={label}
        className="block aspect-[4/3] max-h-[50dvh] w-full object-contain"
        onClick={event => {
          if (!ready || !canFocus || !pointSupported || adjusting) return;
          const element = event.currentTarget, bounds = element.getBoundingClientRect();
          const image = cameraImageBounds(element.videoWidth, element.videoHeight, bounds.width, bounds.height);
          const x = (event.clientX - bounds.left - image.x) / image.width;
          const y = (event.clientY - bounds.top - image.y) / image.height;
          if (x < 0 || x > 1 || y < 0 || y > 1) return;
          setFocusPoint({ x: image.x + x * image.width, y: image.y + y * image.height });
          void adjust({ focusMode, ...(pointSupported ? { pointsOfInterest: [{ x, y }] } : {}) });
        }} />
      {ready && frame.width > 0 && <div aria-hidden="true" data-camera-guide={kind} className="pointer-events-none absolute rounded-lg shadow-[0_0_0_999px_rgb(0_0_0/45%)]" style={frame}>
        <span className="absolute -left-0.5 -top-0.5 size-7 rounded-tl-lg border-l-4 border-t-4 border-emerald-400" />
        <span className="absolute -right-0.5 -top-0.5 size-7 rounded-tr-lg border-r-4 border-t-4 border-emerald-400" />
        <span className="absolute -bottom-0.5 -left-0.5 size-7 rounded-bl-lg border-b-4 border-l-4 border-emerald-400" />
        <span className="absolute -bottom-0.5 -right-0.5 size-7 rounded-br-lg border-b-4 border-r-4 border-emerald-400" />
      </div>}
      {ready && focusPoint && <span aria-hidden="true" className="pointer-events-none absolute size-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-300" style={{ left: focusPoint.x, top: focusPoint.y }} />}
    </div>
    {ready && <>
      <p className="text-sm text-muted-foreground">{kind === "qr" ? "Đưa riêng mã QR vào khung vuông, chừa khoảng trắng quanh mã. Nếu bị mờ, lùi thẻ ra rồi tăng zoom; tránh ánh sáng phản chiếu." : kind === "card" ? "Đặt toàn bộ mặt trước CCCD trong 4 góc, giữ đủ mép thẻ, rõ chữ và tránh chói sáng." : "Đặt giấy tờ trong 4 góc, giữ đủ mép và rõ chữ."}</p>
      {canFocus ? <Button type="button" variant="outline" disabled={adjusting} onClick={() => { setFocusPoint(null); void adjust({ focusMode, ...(pointSupported ? { pointsOfInterest: [{ x: 0.5, y: 0.5 }] } : {}) }); }}>Lấy nét lại</Button> : <p className="text-xs text-muted-foreground">Trình duyệt không hỗ trợ điều khiển lấy nét. Giữ yên và điều chỉnh khoảng cách để ảnh rõ hơn.</p>}
      {canFocus && pointSupported && <p className="text-xs text-muted-foreground">Chạm vào hình để chọn điểm lấy nét.</p>}
      {zoomRange && zoomRange.max > zoomRange.min && <div className="space-y-1">
        <label htmlFor={`${id}-zoom`} className="text-sm">Zoom camera: {zoom.toFixed(1)}×</label>
        <input id={`${id}-zoom`} type="range" className="min-h-11 w-full accent-emerald-600" min={zoomRange.min} max={zoomRange.max} step={zoomRange.step || 0.1} value={zoom} disabled={adjusting}
          onChange={event => { const value = Number(event.currentTarget.value); void adjust({ zoom: value }).then(applied => { if (applied) setZoom((track?.getSettings() as CameraSettings)?.zoom ?? value); }); }} />
      </div>}
      {kind === "qr" && (!zoomRange || zoomRange.max <= zoomRange.min) && <p className="text-xs text-muted-foreground">Camera này không hỗ trợ zoom trong trình duyệt. Di chuyển thẻ chậm để mã đủ lớn và vẫn rõ nét.</p>}
      {message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}
    </>}
  </div>;
}
