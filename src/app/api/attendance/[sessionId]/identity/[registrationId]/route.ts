import { currentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { attendanceSession } from "@/lib/attendance";
import { occupiedWhere } from "@/lib/admissions";
import { readPrivate, inspectFile } from "@/lib/private-storage";
import { audit } from "@/lib/security";
const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy":
    "sandbox; default-src 'none'; frame-ancestors 'none'",
};
export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string; registrationId: string }> },
) {
  const actor = await currentUser();
  if (!actor) return new Response(null, { status: 404, headers });
  try {
    const { sessionId, registrationId } = await context.params;
    const file = await prisma.$transaction(async (tx) => {
      const session = await attendanceSession(tx, actor, sessionId);
      const reg = await tx.registration.findFirst({
        where: {
          id: registrationId,
          classId: session.classId,
          ...occupiedWhere,
        },
        select: { idPhotoFile: true },
      });
      const file = reg?.idPhotoFile;
      if (
        !file ||
        file.kind !== "ID_PHOTO" ||
        file.registrationId !== registrationId ||
        !["image/png", "image/jpeg", "image/webp"].includes(file.mime)
      )
        return null;
      return file;
    });
    if (!file) return new Response(null, { status: 404, headers });
    const buffer = await readPrivate(file.storageKey);
    const { sha256 } = inspectFile(
      `identity.${file.storageKey.split(".").pop()}`,
      file.mime,
      buffer,
    );
    if (sha256 !== file.sha256)
      return new Response(null, { status: 404, headers });
    await audit("ATTENDANCE_ID_PREVIEW", "ALLOWED", actor.id, file.id);
    return new Response(new Uint8Array(buffer), {
      headers: {
        ...headers,
        "Content-Type": file.mime,
        "Content-Length": String(buffer.length),
        "Content-Disposition":
          "inline; filename=identity." + file.storageKey.split(".").pop(),
      },
    });
  } catch {
    return new Response(null, { status: 404, headers });
  }
}
