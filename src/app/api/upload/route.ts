import { currentUser } from "@/lib/auth";
import { storeUpload } from "@/lib/stored-files";
import {
  assertOrigin,
  boundedFormData,
  rateLimit,
  requestIdentity,
  RequestError,
  errorResponse,
} from "@/lib/security";
import type { FileKind } from "@prisma/client";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const actor = await currentUser();
    await rateLimit(
      "upload",
      actor?.id || requestIdentity(request.headers),
      60,
      60 * 60 * 1000,
    );
    const form = await boundedFormData(request);
    const file = form.get("file");
    if (!(file instanceof File) || form.getAll("file").length !== 1)
      throw new RequestError("Chọn một file hồ sơ.");
    const result = await storeUpload(file, {
      classId: String(form.get("classId") || ""),
      kind: String(form.get("kind") || "") as FileKind,
      actor,
      receiptToken: String(form.get("receiptToken") || "") || undefined,
      registrationId: String(form.get("registrationId") || "") || undefined,
    });
    return Response.json(
      { success: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
