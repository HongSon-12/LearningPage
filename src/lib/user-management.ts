import { hash } from "bcryptjs";
import { rosterTransaction } from "@/lib/admissions";
import type { Actor } from "@/lib/permissions";
import { RequestError } from "@/lib/security";
import { userInput, type UserInput } from "@/lib/user-input";
import type { Prisma } from "@prisma/client";
async function activeAdmin(tx: Prisma.TransactionClient, actor: Actor) {
  const user = await tx.user.findUnique({ where: { id: actor.id } });
  if (!user?.active || user.role !== "ADMIN")
    throw new RequestError("Bạn không có quyền quản lý tài khoản.", 403);
}
export async function persistUser(actor: Actor, input: UserInput) {
  const parsed = userInput.safeParse(input);
  if (!parsed.success) throw new RequestError(parsed.error.issues[0].message);
  const { id, username, password, role, active } = parsed.data;
  const passwordHash = password ? await hash(password, 12) : undefined;
  return rosterTransaction(async (tx) => {
    await activeAdmin(tx, actor);
    if (id === actor.id && (!active || role !== "ADMIN"))
      throw new RequestError(
        "Không thể tự khóa hoặc hạ quyền tài khoản đang sử dụng.",
      );
    const existing = id ? await tx.user.findUnique({ where: { id } }) : null;
    if (id && !existing)
      throw new RequestError("Không tìm thấy tài khoản.", 404);
    if (
      await tx.user.findFirst({
        where: { username, ...(id ? { id: { not: id } } : {}) },
      })
    )
      throw new RequestError("Tên đăng nhập đã được sử dụng.");
    if (
      existing?.role === "ADMIN" &&
      existing.active &&
      (!active || role !== "ADMIN") &&
      (await tx.user.count({ where: { role: "ADMIN", active: true } })) <= 1
    )
      throw new RequestError(
        "Phải giữ ít nhất một tài khoản Quản trị đang hoạt động.",
      );
    if (
      existing?.role === "CLASS_MANAGER" &&
      (!active || role !== "CLASS_MANAGER") &&
      (await tx.class.count({ where: { managerId: id } }))
    )
      throw new RequestError(
        "Hãy chuyển hoặc gỡ phân công lớp trước khi khóa hay đổi vai trò quản lý này.",
      );
    const data = {
      username,
      role,
      active,
      ...(passwordHash ? { passwordHash } : {}),
    };
    const user = id
      ? await tx.user.update({ where: { id }, data })
      : await tx.user.create({
          data: { ...data, passwordHash: passwordHash! },
        });
    if (id) await tx.session.deleteMany({ where: { userId: id } });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: id ? "USER_UPDATE" : "USER_CREATE",
        resourceId: user.id,
        result: "ALLOWED",
      },
    });
    return { id: user.id, signInAgain: id === actor.id };
  });
}
export async function persistManagerAssignment(
  actor: Actor,
  classId: string,
  managerId: string,
) {
  return rosterTransaction(async (tx) => {
    await activeAdmin(tx, actor);
    if (
      managerId &&
      !(await tx.user.findFirst({
        where: { id: managerId, active: true, role: "CLASS_MANAGER" },
      }))
    )
      throw new RequestError("Tài khoản quản lý không hợp lệ.");
    await tx.class.update({
      where: { id: classId },
      data: { managerId: managerId || null },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "CLASS_ASSIGN_MANAGER",
        resourceId: classId,
        result: "ALLOWED",
      },
    });
  });
}
