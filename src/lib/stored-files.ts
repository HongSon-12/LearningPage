import type { FileKind, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { Actor } from "@/lib/permissions";
import { assertClassAccess } from "@/lib/permissions";
import { hashSecret, RequestError } from "@/lib/security";
import {
  inspectFile,
  writePrivate,
  removePrivate,
  MAX_FILE_BYTES,
} from "@/lib/private-storage";
export const fileFields = [
  ["idPhotoUrl", "idPhotoFileId", "ID_PHOTO"],
  ["degreeUrl", "degreeFileId", "DEGREE"],
  ["paymentReceiptUrl", "paymentReceiptFileId", "RECEIPT"],
] as const;
export function fileIdFromUrl(url: string) {
  const match = /^\/api\/files\/([a-f0-9-]{36})$/.exec(url);
  if (!match) throw new RequestError("Đường dẫn hồ sơ không hợp lệ.");
  return match[1];
}
export function validCapability(token: string) {
  return /^[a-f0-9-]{72}$/.test(token);
}
export async function storeUpload(
  file: File,
  input: {
    classId: string;
    kind: FileKind;
    actor?: Actor | null;
    receiptToken?: string;
    registrationId?: string;
  },
) {
  if (file.size > MAX_FILE_BYTES)
    throw new RequestError("File vượt giới hạn 5 MB.", 413);
  const { classId, kind, actor, receiptToken, registrationId } = input;
  if (!["ID_PHOTO", "DEGREE", "RECEIPT"].includes(kind))
    throw new RequestError("Loại tài liệu không hợp lệ.");
  const ownerTokenHash =
    receiptToken && validCapability(receiptToken)
      ? hashSecret(receiptToken)
      : null;
  const staff = !receiptToken && actor;
  if (!ownerTokenHash && !staff)
    throw new RequestError("Phiên tải hồ sơ không hợp lệ.", 403);
  const course = await prisma.class.findUnique({ where: { id: classId } });
  if (!course) throw new RequestError("Lớp không nhận hồ sơ.");
  if (staff) {
    assertClassAccess(staff, course);
    if (staff.role === "ACCOUNTANT" && kind !== "RECEIPT")
      throw new RequestError("Không có quyền tải loại tài liệu này.", 403);
  }
  if (registrationId) {
    const reg = await prisma.registration.findUnique({
      where: { id: registrationId },
    });
    if (
      !reg ||
      reg.classId !== classId ||
      !ownerTokenHash ||
      reg.receiptTokenHash !== ownerTokenHash ||
      kind !== "RECEIPT"
    )
      throw new RequestError("Không có quyền cập nhật hồ sơ.", 403);
  } else if (
    course.status !== "OPEN" ||
    (!staff &&
      course.registrationDeadline &&
      course.registrationDeadline < new Date())
  )
    throw new RequestError("Lớp không nhận hồ sơ.");
  const identity = staff ? { uploadedById: staff.id } : { ownerTokenHash };
  // Transaction lock bounds per-owner staged file count even under concurrent uploads.
  const buffer = Buffer.from(await file.arrayBuffer());
  const { ext, sha256 } = inspectFile(file.name, file.type, buffer);
  const storageKey = await writePrivate(buffer, ext);
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${staff ? staff.id : ownerTokenHash!}))`;
      const count = await tx.storedFile.count({
        where: { ...identity, registrationId: null },
      });
      if (count >= (staff ? 30 : 6))
        throw new RequestError("Đã đạt giới hạn file chờ gắn vào hồ sơ.", 429);
      const stored = await tx.storedFile.create({
        data: {
          storageKey,
          kind,
          mime: file.type,
          size: buffer.length,
          sha256,
          classId,
          ...identity,
        },
      });
      return { fileId: stored.id, url: `/api/files/${stored.id}` };
    });
  } catch (error) {
    await removePrivate(storageKey);
    throw error;
  }
}
export async function bindRegistrationFiles(
  tx: Prisma.TransactionClient,
  registrationId: string,
  classId: string,
  urls: {
    idPhotoUrl?: string | null;
    degreeUrl?: string | null;
    paymentReceiptUrl?: string | null;
  },
  owner: { actorId?: string; receiptTokenHash?: string },
) {
  const patch: {
    idPhotoFileId?: string;
    degreeFileId?: string;
    paymentReceiptFileId?: string;
  } = {};
  for (const [urlField, idField, kind] of fileFields) {
    const url = urls[urlField];
    if (!url) continue;
    const id = fileIdFromUrl(url);
    const file = await tx.storedFile.findUnique({ where: { id } });
    const owned =
      file &&
      (file.registrationId === registrationId ||
        (!file.registrationId &&
          file.classId === classId &&
          ((owner.actorId && file.uploadedById === owner.actorId) ||
            (owner.receiptTokenHash &&
              file.ownerTokenHash === owner.receiptTokenHash))));
    if (!file || file.kind !== kind || !owned)
      throw new RequestError(
        "File không thuộc hồ sơ, phiên đăng ký hoặc loại tài liệu này.",
        403,
      );
    if (!file.registrationId) {
      const claimed = await tx.storedFile.updateMany({
        where: { id, registrationId: null },
        data: { registrationId },
      });
      if (claimed.count !== 1)
        throw new RequestError("File đã được dùng cho hồ sơ khác.", 403);
    }
    patch[idField] = id;
  }
  return patch;
}
export async function accessibleFile(fileId: string, actor: Actor | null) {
  if (!actor || !/^[a-f0-9-]{36}$/.test(fileId)) return null;
  const file = await prisma.storedFile.findUnique({
    where: { id: fileId },
    include: { registration: { include: { class: true } } },
  });
  if (!file || (actor.role === "ACCOUNTANT" && file.kind !== "RECEIPT"))
    return null;
  if (file.registration) {
    const field = fileFields.find(([, , kind]) => kind === file.kind)![1];
    if (file.registration[field] !== file.id) return null; // Superseded/orphaned documents are never served.
    try {
      assertClassAccess(actor, file.registration.class);
    } catch {
      return null;
    }
  } else {
    if (file.uploadedById !== actor.id) return null;
    const course = await prisma.class.findUnique({
      where: { id: file.classId },
    });
    if (!course) return null;
    try {
      assertClassAccess(actor, course);
    } catch {
      return null;
    }
  }
  return file;
}
