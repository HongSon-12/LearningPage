import type { UserRole } from "@prisma/client";
export const permissionCatalog = [
  { key: "dashboard.view", group: "Tổng quan", label: "Xem tổng quan hệ thống" },
  { key: "classes.all", group: "Phạm vi dữ liệu", label: "Truy cập tất cả lớp học" },
  { key: "dashboard.analytics", group: "Tổng quan", label: "Xem thống kê truy cập toàn hệ thống" },
  { key: "classes.view", group: "Lớp học", label: "Xem danh sách lớp" },
  { key: "classes.create", group: "Lớp học", label: "Tạo lớp học" },
  { key: "classes.edit", group: "Lớp học", label: "Chỉnh sửa lớp học" },
  { key: "classes.delete", group: "Lớp học", label: "Xóa lớp học" },
  { key: "classes.assign", group: "Lớp học", label: "Phân công người quản lý" },
  { key: "registrations.view", group: "Đăng ký và học viên", label: "Xem hồ sơ đăng ký" },
  { key: "registrations.create", group: "Đăng ký và học viên", label: "Thêm / chỉnh thông tin học viên của lớp" },
  { key: "registrations.review", group: "Đăng ký và học viên", label: "Duyệt / từ chối đăng ký" },
  { key: "registrations.transfer", group: "Đăng ký và học viên", label: "Chuyển lớp" },
  { key: "registrations.delete", group: "Đăng ký và học viên", label: "Xóa hồ sơ đăng ký" },
  { key: "students.view", group: "Hồ sơ học viên", label: "Tra cứu hồ sơ và lịch sử học" },
  { key: "students.identity", group: "Hồ sơ học viên", label: "Xem CCCD đầy đủ và tài liệu định danh" },
  { key: "students.edit", group: "Hồ sơ học viên", label: "Đối chiếu / sửa hồ sơ định danh gốc" },
  { key: "sessions.manage", group: "Buổi học và điểm danh", label: "Tạo / sửa / chốt buổi học" },
  { key: "attendance.manage", group: "Buổi học và điểm danh", label: "Quét CCCD và ghi nhận điểm danh" },
  { key: "payments.manage", group: "Thanh toán và chứng từ", label: "Cập nhật trạng thái thanh toán" },
  { key: "receipts.view", group: "Thanh toán và chứng từ", label: "Xem / tải biên lai" },
  { key: "invoices.manage", group: "Thanh toán và chứng từ", label: "Cập nhật mã hóa đơn" },
  { key: "certificates.manage", group: "Thanh toán và chứng từ", label: "Cập nhật chứng chỉ / giấy xác nhận" },
  { key: "excel.export", group: "Dữ liệu và liên kết", label: "Xuất Excel / tải mẫu" },
  { key: "excel.import", group: "Dữ liệu và liên kết", label: "Kiểm tra / nhập Excel theo quyền từng trường" },
  { key: "links.view", group: "Dữ liệu và liên kết", label: "Xem và sao chép liên kết lớp" },
  { key: "users.manage", group: "Quản trị hệ thống", label: "Quản lý tài khoản đăng nhập" },
  { key: "roles.manage", group: "Quản trị hệ thống", label: "Thiết lập quyền vai trò" },
  { key: "settings.manage", group: "Quản trị hệ thống", label: "Thiết lập hệ thống / ngân hàng" },
] as const;
export type PermissionKey = (typeof permissionCatalog)[number]["key"];
export const permissionKeys = permissionCatalog.map(item => item.key);
export function isPermission(value: string): value is PermissionKey {
  return permissionKeys.includes(value as PermissionKey);
}
export const defaultRolePermissions: Record<UserRole, readonly PermissionKey[]> = {
  ADMIN: permissionKeys,
  CLASS_MANAGER: ["dashboard.view", "classes.view", "classes.edit", "registrations.view", "registrations.create", "registrations.review", "registrations.transfer", "students.view", "students.identity", "sessions.manage", "attendance.manage", "receipts.view", "certificates.manage", "excel.export", "excel.import", "links.view"],
  ACCOUNTANT: ["dashboard.view", "classes.all", "classes.view", "registrations.view", "students.view", "payments.manage", "receipts.view", "invoices.manage", "excel.export", "excel.import", "links.view"],
};
