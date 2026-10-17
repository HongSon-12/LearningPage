import type { UserRole } from "@prisma/client";
export type Actor={id:string;username:string;role:UserRole};
export function classScope(user:Actor){return user.role==="CLASS_MANAGER"?{managerId:user.id}:{};}
export function assertClassAccess(user:Actor,course:{managerId:string|null}){if(user.role==="CLASS_MANAGER"&&course.managerId!==user.id)throw new Error("Lớp không thuộc phạm vi được giao.");}
