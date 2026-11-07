import { z } from "zod";
import { rosterTransaction } from "./admissions";
import type { Actor } from "./permissions";
import { RequestError } from "./errors";
import { transactionPermission } from "./rbac";
const inputSchema = z.object({ id: z.uuid(), role: z.enum(["ADMIN", "CLASS_MANAGER", "ACCOUNTANT"]), active: z.boolean(), customRoleId: z.union([z.uuid(), z.literal("")]) }).strict();
export async function persistSsoAccess(actor: Actor, input: unknown) {
  const value = inputSchema.parse(input);
  return rosterTransaction(async tx => {
    await transactionPermission(tx, actor, "users.manage");
    const user = await tx.user.findUnique({ where: { id: value.id } });
    if (!user?.ssoUserId) throw new RequestError("Hãy đồng bộ tài khoản từ SSO trước.");
    if (user.id === actor.id && (!value.active || value.role !== user.role || (value.customRoleId||null)!==user.customRoleId)) throw new RequestError("Không thể tự khóa hoặc hạ quyền quản trị của mình.");
    if (user.role === "ADMIN" && user.active && (!value.active || value.role !== "ADMIN") && await tx.user.count({ where: { role: "ADMIN", active: true, ssoActive: true, appAccessGranted: true } }) <= 1) throw new RequestError("Phải giữ một quản trị viên đang hoạt động.");
    if (!value.active && await tx.class.count({ where: { managerId: user.id } })) throw new RequestError("Hãy chuyển phân công lớp trước khi thu hồi hoặc đổi vai trò.");
    if (value.customRoleId) {
      const role = await tx.customRole.findUnique({ where: { id: value.customRoleId } });
      if (!role || role.baseRole !== value.role || value.role === "ADMIN") throw new RequestError("Vai trò không hợp lệ.");
    }
    await tx.user.update({ where: { id: user.id }, data: { role: value.role, customRoleId: value.customRoleId || null, appAccessGranted: value.active, active: value.active && user.ssoActive } });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "SSO_APP_ACCESS_UPDATE", resourceId: user.id, result: "ALLOWED" } });
    return { id: user.id, signInAgain: user.id === actor.id };
  });
}
