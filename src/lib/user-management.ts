import {ssoEnabled} from "./auth-mode";
import { hash } from "bcryptjs";
import { rosterTransaction } from "@/lib/admissions";
import { assertClassAccess, type Actor } from "@/lib/permissions";
import { RequestError } from "@/lib/security";
import { userInput, type UserInput } from "@/lib/user-input";
import type { Prisma } from "@prisma/client";
import { transactionPermission } from "./rbac";
export async function persistUser(actor: Actor, input: UserInput) {
  if(ssoEnabled()) throw new RequestError("Tài khoản và mật khẩu được quản lý tại SSO 115.");
  const parsed = userInput.safeParse(input);
  if (!parsed.success) throw new RequestError(parsed.error.issues[0].message);
  const { id, username, password, role, active, email, customRoleId } = parsed.data;
  const passwordHash = password ? await hash(password, 12) : undefined;
  return rosterTransaction(async (tx) => {
    await transactionPermission(tx, actor, "users.manage");
    const existing = id ? await tx.user.findUnique({ where: { id } }) : null;
    if(id===actor.id && (!active || role!==existing?.role || (customRoleId ?? existing?.customRoleId ?? "") !== (existing?.customRoleId ?? ""))) throw new RequestError("Không thể tự khóa hoặc đổi vai trò tài khoản đang sử dụng.");
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
      existing &&
      !active &&
      (await tx.class.count({ where: { managerId: id } }))
    )
      throw new RequestError(
        "Hãy chuyển hoặc gỡ phân công lớp trước khi khóa hay đổi vai trò quản lý này.",
      );
    const normalizedEmail = email === undefined ? existing?.email ?? null : email.trim().toLowerCase() || null;
    const selectedRoleId = customRoleId === undefined ? existing?.customRoleId ?? null : customRoleId || null;
    if (normalizedEmail && await tx.user.findFirst({where:{email:normalizedEmail,...(id?{id:{not:id}}:{})}}))
      throw new RequestError("Email đã được dùng cho tài khoản khác.");
    if(selectedRoleId) {
      const custom = await tx.customRole.findUnique({where:{id:selectedRoleId}});
      if(!custom || custom.baseRole !== role || role === "ADMIN") throw new RequestError("Vai trò không hợp lệ.");
    }
    const data = {
      email: normalizedEmail,
      customRoleId: selectedRoleId,
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
    if (id) {
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.passwordResetChallenge.updateMany({where:{userId:id,usedAt:null},data:{usedAt:new Date(),codeHash:null}});
    }
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
/** Shared by the class form and legacy assignment action; the caller owns the transaction. */
export async function assignManagerInTransaction(
  tx: Prisma.TransactionClient,
  actor: Actor,
  classId: string,
  managerId: string,
) {
  const current=await transactionPermission(tx, actor, "classes.assign");
  const course=await tx.class.findUniqueOrThrow({where:{id:classId}});
  assertClassAccess(current,course);
  if (managerId && !(await tx.user.findFirst({where:{id:managerId,active:true}})))
    throw new RequestError("Tài khoản quản lý không hợp lệ.");
  await tx.class.update({where:{id:classId},data:{managerId:managerId || null}});
  await tx.auditLog.create({data:{actorId:actor.id,action:"CLASS_ASSIGN_MANAGER",resourceId:classId,result:"ALLOWED"}});
}
export async function persistManagerAssignment(actor: Actor, classId: string, managerId: string) {
  return rosterTransaction(tx => assignManagerInTransaction(tx, actor, classId, managerId));
}
