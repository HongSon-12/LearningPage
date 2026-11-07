import type { UserRole } from "@prisma/client";
export const permissionCatalog = [
  { key: "dashboard.view", group: "Tổng quan", label: "Xem tổng quan hệ thống" },
  { key: "classes.view", group: "Lớp học", label: "Xem danh sách lớp" },
  { key: "classes.create", group: "Lớp học", label: "Tạo lớp học", adminOnly: true },
  { key: "classes.edit", group: "Lớp học", label: "Chỉnh sửa lớp học", requires: ["classes.view"] },
  { key: "classes.delete", group: "Lớp học", label: "Xóa lớp học", adminOnly: true },
  { key: "classes.assign", group: "Lớp học", label: "Phân công người quản lý", adminOnly: true },
  { key: "registrations.view", group: "Đăng ký và học viên", label: "Xem hồ sơ đăng ký", requires: ["classes.view"] },
  { key: "registrations.create", group: "Đăng ký và học viên", label: "Thêm / chỉnh thông tin học viên của lớp", requires: ["registrations.view"] },
  { key: "registrations.review", group: "Đăng ký và học viên", label: "Duyệt / từ chối đăng ký", requires: ["registrations.view"] },
  { key: "registrations.transfer", group: "Đăng ký và học viên", label: "Chuyển lớp", requires: ["registrations.view"] },
  { key: "registrations.delete", group: "Đăng ký và học viên", label: "Xóa hồ sơ đăng ký", adminOnly: true },
  { key: "students.view", group: "Hồ sơ học viên", label: "Tra cứu hồ sơ và lịch sử học", requires: ["classes.view"] },
  { key: "students.identity", group: "Hồ sơ học viên", label: "Xem CCCD đầy đủ và tài liệu định danh", requires: ["registrations.view"] },
  { key: "students.edit", group: "Hồ sơ học viên", label: "Đối chiếu / sửa hồ sơ định danh gốc", adminOnly: true },
  { key: "sessions.manage", group: "Buổi học và điểm danh", label: "Tạo / sửa / chốt buổi học", requires: ["classes.view"] },
  { key: "attendance.manage", group: "Buổi học và điểm danh", label: "Quét CCCD và ghi nhận điểm danh", requires: ["sessions.manage", "registrations.view", "students.identity"] },
  { key: "payments.manage", group: "Thanh toán và chứng từ", label: "Cập nhật trạng thái thanh toán", requires: ["registrations.view"] },
  { key: "receipts.view", group: "Thanh toán và chứng từ", label: "Xem / tải biên lai", requires: ["registrations.view"] },
  { key: "invoices.manage", group: "Thanh toán và chứng từ", label: "Cập nhật mã hóa đơn", requires: ["registrations.view"] },
  { key: "certificates.manage", group: "Thanh toán và chứng từ", label: "Cập nhật chứng chỉ / giấy xác nhận", requires: ["registrations.view"] },
  { key: "excel.export", group: "Dữ liệu và liên kết", label: "Xuất Excel / tải mẫu", requires: ["registrations.view"] },
  { key: "excel.import", group: "Dữ liệu và liên kết", label: "Kiểm tra / nhập Excel theo quyền từng trường", requires: ["registrations.view"] },
  { key: "links.view", group: "Dữ liệu và liên kết", label: "Xem và sao chép liên kết lớp", requires: ["classes.view"] },
  { key: "users.manage", group: "Quản trị hệ thống", label: "Quản lý tài khoản đăng nhập", adminOnly: true },
  { key: "roles.manage", group: "Quản trị hệ thống", label: "Thiết lập quyền vai trò", adminOnly: true },
  { key: "settings.manage", group: "Quản trị hệ thống", label: "Thiết lập hệ thống / ngân hàng", adminOnly: true },
] as const;
export type PermissionKey = (typeof permissionCatalog)[number]["key"];
export const permissionKeys = permissionCatalog.map(item => item.key);
export function isPermission(value: string): value is PermissionKey {
  return permissionKeys.includes(value as PermissionKey);
}
export function adminOnly(key: PermissionKey) {
  const item = permissionCatalog.find(item => item.key === key)!;
  return "adminOnly" in item && item.adminOnly;
}
export function dependencies(key: PermissionKey): readonly PermissionKey[] {
  const item = permissionCatalog.find(item => item.key === key)!;
  return "requires" in item ? item.requires : [];
}
export const defaultRolePermissions: Record<UserRole, readonly PermissionKey[]> = {
  ADMIN: permissionKeys,
  CLASS_MANAGER: ["dashboard.view", "classes.view", "classes.edit", "registrations.view", "registrations.create", "registrations.review", "registrations.transfer", "students.view", "students.identity", "sessions.manage", "attendance.manage", "receipts.view", "certificates.manage", "excel.export", "excel.import", "links.view"],
  ACCOUNTANT: ["dashboard.view", "classes.view", "registrations.view", "students.view", "payments.manage", "receipts.view", "invoices.manage", "excel.export", "excel.import", "links.view"],
};
export function withDependencies(keys: readonly PermissionKey[]): PermissionKey[] {
  const result = new Set(keys);
  for (const key of result) for (const dependency of dependencies(key)) result.add(dependency);
  return permissionKeys.filter(key => result.has(key));
}
export function withoutDependents(keys: readonly PermissionKey[], removed: PermissionKey): PermissionKey[] {
  let result = keys.filter(key => key !== removed);
  let previous: number;
  do {
    previous = result.length;
    result = result.filter(key => dependencies(key).every(dependency => result.includes(dependency)));
  } while (previous !== result.length);
  return result;
}
