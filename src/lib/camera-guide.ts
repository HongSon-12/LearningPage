export type CameraGuide = "card" | "qr" | "document";

// Geometry is relative to the actual image, excluding object-contain letterboxing.
export function cameraGuide(width: number, height: number, kind: CameraGuide) {
  const ratio = kind === "card" ? 85.6 / 53.98 : kind === "qr" ? 1 : 1 / Math.SQRT2;
  const guideWidth = Math.min(width * (kind === "qr" ? 0.72 : 0.88), height * 0.8 * ratio);
  const guideHeight = guideWidth / ratio;
  return { x: (width - guideWidth) / 2, y: (height - guideHeight) / 2, width: guideWidth, height: guideHeight };
}

export function cameraImageBounds(sourceWidth: number, sourceHeight: number, viewWidth: number, viewHeight: number) {
  const scale = Math.min(viewWidth / sourceWidth, viewHeight / sourceHeight);
  const width = sourceWidth * scale, height = sourceHeight * scale;
  return { x: (viewWidth - width) / 2, y: (viewHeight - height) / 2, width, height, scale };
}

export function qrScanRegion(width: number, height: number, wholeFrame: boolean) {
  const region = wholeFrame ? { x: 0, y: 0, width, height } : cameraGuide(width, height, "qr");
  const scale = Math.min(1, (wholeFrame ? 1440 : 1280) / Math.max(region.width, region.height));
  return { ...region, outputWidth: Math.max(1, Math.round(region.width * scale)), outputHeight: Math.max(1, Math.round(region.height * scale)) };
}
