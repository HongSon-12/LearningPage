import { currentUser } from "@/lib/auth";
import { accessibleFile } from "@/lib/stored-files";
import { readPrivate } from "@/lib/private-storage";
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
  context: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await context.params;
  const actor = await currentUser();
  const file = await accessibleFile(fileId, actor);
  if (!file) {
    await audit("FILE_DOWNLOAD", "DENIED", actor?.id);
    return new Response(null, { status: 404, headers });
  }
  try {
    const buffer = await readPrivate(file.storageKey);
    await audit("FILE_DOWNLOAD", "ALLOWED", actor!.id, file.id);
    return new Response(new Uint8Array(buffer), {
      headers: {
        ...headers,
        "Content-Type": file.mime,
        "Content-Length": String(buffer.length),
        "Content-Disposition": `attachment; filename="document-${file.id}.${file.storageKey.split(".").pop()}"`,
      },
    });
  } catch {
    return new Response(null, { status: 404, headers });
  }
}
