export async function boundedSsoBody(request: Request, max = 16384) {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > max)) throw Error("BODY_TOO_LARGE");
  const reader = request.body?.getReader(); if (!reader) throw Error("BODY_REQUIRED");
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > max) { await reader.cancel(); throw Error("BODY_TOO_LARGE"); } chunks.push(next.value); } }
  finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString("utf8");
}
export const ssoNoStore = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
