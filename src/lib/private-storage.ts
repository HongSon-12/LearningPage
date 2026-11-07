import { constants } from "node:fs";
import { mkdir, realpath, open, unlink, chmod } from "node:fs/promises";
import { resolve, join, relative, isAbsolute } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { RequestError } from "@/lib/security";
import sharp from "sharp";
import { MAX_FILE_BYTES, uploadTypes as types } from "./upload-policy";
export { MAX_FILE_BYTES } from "./upload-policy";
export function inspectFile(name: string, mime: string, buffer: Buffer) {
  const ext = types[mime];
  if (
    !ext ||
    !buffer.length ||
    buffer.length > MAX_FILE_BYTES ||
    name.length > 200 ||
    /[\/\\:\x00-\x1f]/.test(name) ||
    !/^[^.]+\.(png|jpg|jpeg|webp|pdf)$/i.test(name)
  )
    throw new RequestError(
      "Chọn PNG/JPG/WebP hoặc PDF, tối đa 5 MB; tên file chỉ có một phần mở rộng.",
    );
  const suffix = name.split(".").pop()!.toLowerCase();
  if (suffix !== ext && !(ext === "jpg" && suffix === "jpeg"))
    throw new RequestError("Phần mở rộng và loại file không khớp.");
  const valid =
    ext === "png"
      ? buffer.length >= 24 &&
        buffer
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
        buffer.subarray(12, 16).toString() === "IHDR"
      : ext === "jpg"
        ? buffer.length > 4 &&
          buffer[0] === 255 &&
          buffer[1] === 216 &&
          buffer[2] === 255 &&
          buffer.subarray(-2).equals(Buffer.from([255, 217]))
        : ext === "pdf"
          ? /^%PDF-1\.[0-9]|^%PDF-2\.0/.test(
              buffer.subarray(0, 8).toString(),
            ) && buffer.subarray(-1024).toString().includes("%%EOF")
          : buffer.length >= 16 &&
            buffer.subarray(0, 4).toString() === "RIFF" &&
            buffer.subarray(8, 12).toString() === "WEBP";
  if (!valid) throw new RequestError("Nội dung file không đúng định dạng.");
  return { ext, sha256: createHash("sha256").update(buffer).digest("hex") };
}
/** Decode every image and re-encode without EXIF/GPS; PDF remains a downloaded document. */
export async function prepareUpload(name:string,mime:string,input:Buffer) {
  const inspected=inspectFile(name,mime,input);
  if(inspected.ext==="pdf")return {buffer:input,...inspected};
  try {
    const decoder=sharp(input,{limitInputPixels:25_000_000,failOn:"warning",animated:false});
    const metadata=await decoder.metadata();
    if(metadata.format!==({jpg:"jpeg",png:"png",webp:"webp"} as const)[inspected.ext as "jpg"|"png"|"webp"] || !metadata.width || !metadata.height || (metadata.pages??1)>1) throw new Error("INVALID_IMAGE");
    const buffer=await decoder.rotate().toFormat(inspected.ext === "jpg" ? "jpeg" : inspected.ext as "png"|"webp").toBuffer();
    if(buffer.length>MAX_FILE_BYTES)throw new RequestError("Ảnh sau xử lý vượt 5 MB. Hãy giảm kích thước hoặc chọn ảnh JPG nhỏ hơn.");
    return {buffer,ext:inspected.ext,sha256:createHash("sha256").update(buffer).digest("hex")};
  }catch(error){
    if(error instanceof RequestError)throw error;
    throw new RequestError("Ảnh hỏng, không đọc được hoặc quá lớn (tối đa 25 triệu điểm ảnh). Hãy chụp lại hoặc chọn ảnh khác.");
  }
}
// Files are runtime data from a private volume. They must never enter Next output tracing.
export async function storageRoot() {
  const root = resolve(
    /* turbopackIgnore: true */ process.env.PRIVATE_UPLOAD_DIR ||
      join(process.cwd(), ".local", "uploads"),
  );
  const publicRoot = await realpath(join(process.cwd(), "public"));
  const configuredRel = relative(publicRoot, root);
  if (
    !configuredRel ||
    (!configuredRel.startsWith("..") && !isAbsolute(configuredRel))
  )
    throw new Error("Unsafe private storage configuration");
  await mkdir(/* turbopackIgnore: true */ root, {
    recursive: true,
    mode: 0o700,
  });
  const actual = await realpath(/* turbopackIgnore: true */ root);
  const rel = relative(publicRoot, actual);
  if (actual !== root || !rel || (!rel.startsWith("..") && !isAbsolute(rel)))
    throw new Error("Unsafe private storage configuration");
  await chmod(/* turbopackIgnore: true */ root, 0o700);
  return root;
}
function checkedKey(key: string) {
  if (!/^[a-f0-9-]{36}\.(png|jpg|webp|pdf)$/.test(key))
    throw new Error("Invalid storage key");
  return key;
}
export async function writePrivate(buffer: Buffer, ext: string) {
  const storageKey = `${randomUUID()}.${ext}`;
  const file = await open(
    /* turbopackIgnore: true */ join(
      /* turbopackIgnore: true */ await storageRoot(),
      checkedKey(storageKey),
    ),
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    0o600,
  );
  try {
    await file.writeFile(buffer);
  } finally {
    await file.close();
  }
  return storageKey;
}
export async function readPrivate(key: string) {
  const file = await open(
    /* turbopackIgnore: true */ join(
      /* turbopackIgnore: true */ await storageRoot(),
      checkedKey(key),
    ),
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES)
      throw new Error("Invalid stored file");
    return await file.readFile();
  } finally {
    await file.close();
  }
}
export async function removePrivate(key: string) {
  await unlink(
    /* turbopackIgnore: true */ join(
      /* turbopackIgnore: true */ await storageRoot(),
      checkedKey(key),
    ),
  );
}
