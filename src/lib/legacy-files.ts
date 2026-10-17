import {
  lstat,
  readdir,
  readFile,
  writeFile,
  rename,
  realpath,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";
import { fileFields } from "@/lib/stored-files";
import {
  inspectFile,
  writePrivate,
  readPrivate,
  removePrivate,
} from "@/lib/private-storage";
const mimeByExt: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  pdf: "application/pdf",
};
export async function migrateLegacyFiles(
  options: { apply?: boolean; backupFolder?: string } = {},
) {
  const root = await realpath(process.cwd());
  const publicFolder = join(root, "public/uploads");
  const names = await readdir(publicFolder).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const files = new Map<
    string,
    { buffer: Buffer; ext: string; mime: string; sha256: string }
  >();
  for (const name of names) {
    if (!/^[a-zA-Z0-9-]+\.(png|jpg|jpeg|webp|pdf)$/i.test(name))
      throw new Error("UNEXPECTED_LEGACY_ENTRY");
    const path = join(publicFolder, name);
    const info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink())
      throw new Error("UNSAFE_LEGACY_ENTRY");
    const buffer = await readFile(path);
    const mime = mimeByExt[name.split(".").pop()!.toLowerCase()];
    const { ext, sha256 } = inspectFile(name, mime, buffer);
    files.set(name, { buffer, ext, mime, sha256 });
  }
  const rows = await prisma.registration.findMany({
    select: {
      id: true,
      classId: true,
      idPhotoUrl: true,
      degreeUrl: true,
      paymentReceiptUrl: true,
    },
  });
  const references: {
    registrationId: string;
    classId: string;
    urlField: (typeof fileFields)[number][0];
    idField: (typeof fileFields)[number][1];
    kind: (typeof fileFields)[number][2];
    oldUrl: string;
    name: string;
  }[] = [];
  for (const row of rows)
    for (const [urlField, idField, kind] of fileFields) {
      const url = row[urlField];
      if (!url) continue;
      if (url.startsWith("/api/files/")) continue;
      const match =
        /^\/uploads\/([a-zA-Z0-9-]+\.(?:png|jpg|jpeg|webp|pdf))$/i.exec(url);
      if (!match || !files.has(match[1]))
        throw new Error("MISSING_OR_INVALID_LEGACY_REFERENCE");
      references.push({
        registrationId: row.id,
        classId: row.classId,
        urlField,
        idField,
        kind,
        oldUrl: url,
        name: match[1],
      });
    }
  const counts = {
    legacyFiles: files.size,
    references: references.length,
    unreferencedFiles: [...files.keys()].filter(
      (name) => !references.some((ref) => ref.name === name),
    ).length,
  };
  if (!options.apply) return { ...counts, applied: false };
  const backup = resolve(options.backupFolder || "");
  if (
    !backup.startsWith(join(root, ".local/backups") + "/") ||
    (await realpath(backup)) !== backup
  )
    throw new Error("UNSAFE_BACKUP_PATH");
  const archive = await lstat(join(backup, "database.dump"));
  if (!archive.isFile() || !archive.size) throw new Error("MISSING_BACKUP");
  const manifest = JSON.parse(
    await readFile(join(backup, "manifest.json"), "utf8"),
  ) as { files: { name: string; sha256: string }[] };
  if (
    manifest.files.length !== files.size ||
    manifest.files.some(
      (entry) => files.get(entry.name)?.sha256 !== entry.sha256,
    )
  )
    throw new Error("BACKUP_FILES_MISMATCH");
  const written: string[] = [];
  let committed = false;
  const mappings: object[] = [];
  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(1152026)`;
        for (const ref of references) {
          const current = await tx.registration.findUniqueOrThrow({
            where: { id: ref.registrationId },
          });
          if (current[ref.urlField] !== ref.oldUrl)
            throw new Error("LEGACY_REFERENCE_CHANGED");
          const file = files.get(ref.name)!;
          const storageKey = await writePrivate(file.buffer, file.ext);
          written.push(storageKey);
          if (
            createHash("sha256")
              .update(await readPrivate(storageKey))
              .digest("hex") !== file.sha256
          )
            throw new Error("COPY_HASH_MISMATCH");
          const stored = await tx.storedFile.create({
            data: {
              storageKey,
              kind: ref.kind,
              mime: file.mime,
              size: file.buffer.length,
              sha256: file.sha256,
              classId: current.classId,
              registrationId: current.id,
            },
          });
          await tx.registration.update({
            where: { id: current.id },
            data: {
              [ref.urlField]: `/api/files/${stored.id}`,
              [ref.idField]: stored.id,
            },
          });
          mappings.push({
            registrationId: current.id,
            urlField: ref.urlField,
            idField: ref.idField,
            oldUrl: ref.oldUrl,
            fileId: stored.id,
            storageKey,
            sha256: file.sha256,
          });
        }
        await writeFile(
          join(backup, "legacy-rollback.json"),
          JSON.stringify({ mappings }, null, 2),
          { mode: 0o600, flag: "wx" },
        );
      },
      { timeout: 60000 },
    );
    committed = true;
    // Verify source still matches the backup before taking it out of the webroot.
    const latest = await readdir(publicFolder).catch((error) => {
      if (error.code === "ENOENT") return [];
      throw error;
    });
    if (latest.length !== files.size)
      throw new Error("LEGACY_DIRECTORY_CHANGED");
    for (const name of latest)
      if (
        createHash("sha256")
          .update(await readFile(join(publicFolder, name)))
          .digest("hex") !== files.get(name)?.sha256
      )
        throw new Error("LEGACY_DIRECTORY_CHANGED");
    if (latest.length)
      await rename(publicFolder, join(backup, "public-uploads-quarantine"));
    return { ...counts, applied: true };
  } catch (error) {
    if (!committed) for (const key of written) await removePrivate(key);
    throw error;
  }
}
