export const TRANSFER_SYNTAX = "{CLASS_CODE} {NAME}";
export function paymentReference(classCode: string, fullName: string) {
  return `${classCode.trim()} ${fullName.trim().toUpperCase()}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}
