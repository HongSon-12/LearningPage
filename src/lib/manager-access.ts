import type { Prisma } from "@prisma/client";
import prisma from "./prisma";
import { ssoEnabled } from "./auth-mode";
import { directoryUserById, ssoApplicationAllowed, syncDirectoryUser } from "./sso-directory";
import { rolePermissions } from "./rbac";
import { RequestError } from "./errors";

export function eligibleManagerWhere(): Prisma.UserWhereInput {
  return {
    active: true,
    role: { not: null },
    ...(ssoEnabled() ? { ssoUserId: { not: null }, ssoActive: true, appAccessGranted: true } : {}),
  };
}

async function managersWithClassAccess(where: Prisma.UserWhereInput) {
  const users = await prisma.user.findMany({ where, select: { id: true, username: true, name: true, role: true, customRoleId: true }, orderBy: [{ name: "asc" }, { username: "asc" }] });
  const permissions = await Promise.all(users.map(user => rolePermissions(user.role, prisma, user.customRoleId)));
  return users.filter((_, index) => permissions[index].includes("classes.view")).map(({ id, username, name }) => ({ id, username, name }));
}

export async function getEligibleManagers() {
  if (ssoEnabled()) {
    const candidates = await prisma.user.findMany({ where: { role: { not: null }, ssoUserId: { not: null } }, select: { ssoUserId: true } });
    // Refresh only assigned users. Directory membership alone never makes someone a manager.
    const refreshed = await Promise.allSettled(candidates.map(async user => {
      await syncDirectoryUser(await directoryUserById(user.ssoUserId!));
      return user.ssoUserId!;
    }));
    // A failed refresh must not expose a stale candidate in the picker.
    const ids = refreshed.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
    return managersWithClassAccess({ ...eligibleManagerWhere(), ssoUserId: { in: ids } });
  }
  return managersWithClassAccess(eligibleManagerWhere());
}

export async function assertEligibleManager(tx: Prisma.TransactionClient, managerId: string) {
  const user = await tx.user.findFirst({ where: { id: managerId, ...eligibleManagerWhere() } });
  if (!user) throw new RequestError("Người phụ trách phải đang hoạt động, được SSO cho phép vào EDU và đã được phân quyền.");
  if (!(await rolePermissions(user.role, tx, user.customRoleId)).includes("classes.view")) throw new RequestError("Người phụ trách chưa được phân quyền xem lớp học.");
  if (ssoEnabled()) {
    try {
      const [source, allowed] = await Promise.all([directoryUserById(user.ssoUserId!), ssoApplicationAllowed(user.ssoUserId!)]);
      if (!source.is_active || !allowed || source.uid !== user.ssoUid) throw Error("SSO_MANAGER_ACCESS_DENIED");
    } catch {
      throw new RequestError("Không thể xác nhận quyền truy cập EDU của người phụ trách. Vui lòng chọn lại.");
    }
  }
}
