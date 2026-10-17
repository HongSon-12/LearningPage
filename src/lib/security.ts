import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";
export const hashSecret = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export class RequestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function assertOrigin(request: Request) {
  const expected =
    process.env.APP_ORIGIN ||
    `${new URL(request.url).protocol}//${request.headers.get("host") || new URL(request.url).host}`;
  if (request.headers.get("origin") !== new URL(expected).origin)
    throw new RequestError("Nguồn yêu cầu không hợp lệ.", 403);
}
export function requestIdentity(headers: Pick<Headers, "get">) {
  // Only enable behind a proxy that overwrites X-Real-IP and blocks direct access to the app.
  const ip =
    process.env.TRUST_PROXY === "true" ? headers.get("x-real-ip") : null;
  return hashSecret(ip && ip.length <= 64 ? ip : "unattributed");
}
export async function rateLimit(
  scope: string,
  identity: string,
  limit: number,
  windowMs: number,
) {
  const bucket = Math.floor(Date.now() / windowMs);
  const key = hashSecret(`${scope}:${identity}:${bucket}`);
  const row = await prisma.rateLimit.upsert({
    where: { key },
    create: { key, expiresAt: new Date((bucket + 1) * windowMs) },
    update: { count: { increment: 1 } },
  });
  if (row.count > limit)
    throw new RequestError(
      "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
      429,
    );
}
export async function boundedFormData(
  request: Request,
  maxBytes = 5 * 1024 * 1024 + 64 * 1024,
) {
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes))
    throw new RequestError("File vượt giới hạn dung lượng.", 413);
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;"))
    throw new RequestError("Định dạng yêu cầu không hợp lệ.");
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError("Thiếu nội dung file.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RequestError("File vượt giới hạn dung lượng.", 413);
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  return new Response(Buffer.concat(chunks), {
    headers: { "content-type": request.headers.get("content-type")! },
  }).formData();
}
export async function audit(
  action: string,
  result: string,
  actorId?: string,
  resourceId?: string,
) {
  await prisma.auditLog.create({
    data: { action, result, actorId, resourceId },
  });
}
export function errorResponse(error: unknown) {
  const known = error instanceof RequestError;
  return Response.json(
    {
      success: false,
      error: known
        ? error.message
        : "Không thể xử lý yêu cầu. Vui lòng thử lại.",
    },
    {
      status: known ? error.status : 500,
      headers: {
        "Cache-Control": "no-store",
        ...(known && error.status === 429 ? { "Retry-After": "60" } : {}),
      },
    },
  );
}
