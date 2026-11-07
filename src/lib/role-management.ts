import { z } from "zod";
import { rosterTransaction } from "./admissions";
import { transactionPermission } from "./rbac";
import type { Actor } from "./permissions";
import { adminOnly, defaultRolePermissions, isPermission, withDependencies, type PermissionKey } from "./permission-catalog";
import { RequestError } from "./security";
const inputSchema = z.object({ role: z.enum(["CLASS_MANAGER", "ACCOUNTANT"]), version: z.number().int().positive(), permissions: z.array(z.string()).max(50) }).strict();
export async function persistRolePolicy(actor: Actor, input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) throw new RequestError("Thiết lập vai trò không hợp lệ.");
  const { role, version, permissions } = parsed.data;
  if (new Set(permissions).size !== permissions.length || permissions.some(key => !isPermission(key) || adminOnly(key) || !defaultRolePermissions[role].includes(key)))
    throw new RequestError("Quyền được chọn vượt phạm vi vai trò hiện có hoặc thuộc quyền Quản trị được bảo vệ.");
  const keys = permissions as PermissionKey[];
  if (withDependencies(keys).length !== keys.length) throw new RequestError("Cần cấp đầy đủ quyền xem liên quan trước khi cấp quyền thao tác.");
  return rosterTransaction(async tx => {
    await transactionPermission(tx, actor, "roles.manage");
    const updated = await tx.rolePolicy.updateMany({ where: { role, version }, data: { version: { increment: 1 }, updatedAt: new Date() } });
    if (updated.count !== 1) throw new RequestError("Vai trò đã được cập nhật ở nơi khác. Hãy tải lại trước khi lưu.", 409);
    await tx.rolePermission.deleteMany({ where: { role } });
    if (keys.length) await tx.rolePermission.createMany({ data: keys.map(permission => ({ role, permission })) });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "ROLE_PERMISSIONS_UPDATE", resourceId: role, result: "ALLOWED" } });
    return { version: version + 1 };
  });
}

const customSchema=z.object({id:z.uuid().optional(),name:z.string().trim().min(1).max(60),baseRole:z.enum(["CLASS_MANAGER","ACCOUNTANT"]),version:z.number().int().nonnegative(),permissions:z.array(z.string()).max(50)}).strict();
export async function persistCustomRole(actor:Actor,input:unknown) {
  const parsed=customSchema.safeParse(input);
  if(!parsed.success) throw new RequestError("Thông tin vai trò không hợp lệ.");
  const {id,baseRole,version}=parsed.data;
  const name=parsed.data.name.replace(/\s+/g," "); const nameKey=name.normalize("NFKC").toLowerCase();
  if(["admin","quản trị","quản lý lớp","kế toán"].includes(nameKey)) throw new RequestError("Tên vai trò đã được sử dụng.");
  const keys=parsed.data.permissions;
  if(new Set(keys).size!==keys.length || keys.some(key=>!isPermission(key)||adminOnly(key)||!defaultRolePermissions[baseRole].includes(key))) throw new RequestError("Quyền được chọn vượt phạm vi nghiệp vụ của vai trò.");
  const permissions=withDependencies(keys as PermissionKey[]);
  if(permissions.length!==keys.length) throw new RequestError("Cần cấp đầy đủ quyền xem liên quan.");
  if(!permissions.includes("dashboard.view")) permissions.unshift("dashboard.view");
  return rosterTransaction(async tx=>{
    await transactionPermission(tx,actor,"roles.manage");
    if(await tx.customRole.findFirst({where:{nameKey,...(id?{id:{not:id}}:{})}})) throw new RequestError("Tên vai trò đã được sử dụng.");
    if(id) {
      const updated=await tx.customRole.updateMany({where:{id,version,baseRole},data:{name,nameKey,permissions,version:{increment:1}}});
      if(updated.count!==1) throw new RequestError("Vai trò đã thay đổi. Hãy tải lại trước khi lưu.",409);
    }
    const saved=id?await tx.customRole.findUniqueOrThrow({where:{id}}):await tx.customRole.create({data:{name,nameKey,baseRole,permissions}});
    await tx.auditLog.create({data:{actorId:actor.id,action:id?"CUSTOM_ROLE_UPDATE":"CUSTOM_ROLE_CREATE",resourceId:saved.id,result:"ALLOWED"}});
    return {id:saved.id,version:saved.version};
  });
}
