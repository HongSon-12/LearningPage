import assert from "node:assert/strict";
import { cameraGuide, cameraImageBounds, qrScanRegion, type CameraGuide } from "../src/lib/camera-guide";

function near(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} != ${expected}`);
}

// Portrait/landscape camera feeds in narrow mobile, desktop, and height-limited previews.
for (const [width, height] of [[1920, 1080], [1080, 1920], [600, 600]]) {
  for (const [viewWidth, viewHeight] of [[342, 256.5], [448, 336], [800, 250]]) {
    const image = cameraImageBounds(width, height, viewWidth, viewHeight);
    assert.ok(image.x >= -1e-6 && image.y >= -1e-6);
    assert.ok(image.width <= viewWidth + 1e-6 && image.height <= viewHeight + 1e-6);
    near(image.width / image.height, width / height);
    for (const kind of ["card", "qr", "document"] as CameraGuide[]) {
      const source = cameraGuide(width, height, kind);
      const guide = cameraGuide(image.width, image.height, kind);
      near(guide.x / image.scale, source.x);
      near(guide.y / image.scale, source.y);
      near(guide.width / image.scale, source.width);
      near(guide.height / image.scale, source.height);
      assert.ok(guide.x >= 0 && guide.y >= 0);
      assert.ok(guide.x + guide.width <= image.width);
      assert.ok(guide.y + guide.height <= image.height);
      if (kind === "card") near(guide.width / guide.height, 85.6 / 53.98);
      if (kind === "qr") near(guide.width, guide.height);
    }
  }
}

// QR detail in a 1080p feed survives the first pass without downscaling.
const center = qrScanRegion(1920, 1080, false);
near(center.width, 864);
assert.equal(center.outputWidth, 864);
assert.equal(center.outputHeight, 864);
near(center.x + center.width / 2, 960);
near(center.y + center.height / 2, 540);
// Off-guide codes still get a bounded full-frame pass; 4K decoding stays bounded.
assert.deepEqual(qrScanRegion(1920, 1080, true), { x: 0, y: 0, width: 1920, height: 1080, outputWidth: 1440, outputHeight: 810 });
assert.equal(qrScanRegion(3840, 2160, false).outputWidth, 1280);
assert.equal(qrScanRegion(640, 480, true).outputWidth, 640);
console.log("PASS camera guides, letterboxing/orientation mapping, native-detail QR crop and bounded fallback");
