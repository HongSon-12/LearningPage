export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const UPLOAD_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf";
export const UPLOAD_HINT = "JPG, JPEG, PNG, WebP hoặc PDF · Tối đa 5 MB/file";
export const uploadTypes: Record<string,string> = {"image/png":"png","image/jpeg":"jpg","image/webp":"webp","application/pdf":"pdf"};
export function uploadFileError(file:Pick<File,"name"|"type"|"size">) {
  if(!file.size || file.size>MAX_FILE_BYTES) return "File phải có nội dung và không vượt quá 5 MB.";
  if(file.name.length>200 || /[\/\\:\x00-\x1f]/.test(file.name) || !/^[^.]+\.(png|jpg|jpeg|webp|pdf)$/i.test(file.name)) return "Chọn JPG, JPEG, PNG, WebP hoặc PDF; tên file chỉ có một phần mở rộng.";
  const suffix=file.name.split(".").pop()!.toLowerCase(),ext=uploadTypes[file.type];
  if(!ext || (suffix!==ext && !(ext==="jpg"&&suffix==="jpeg"))) return "Định dạng và đuôi file không khớp. Chọn JPG, JPEG, PNG, WebP hoặc PDF.";
  return null;
}
