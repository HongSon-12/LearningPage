import {ssoEnabled} from "./auth-mode";
import {hash} from "bcryptjs";
import prisma from "./prisma";
import {rosterTransaction} from "./admissions";
import {accountInput} from "./account-input";
import type {Actor} from "./permissions";
import {RequestError,hashSecret} from "./security";
export async function persistOwnAccount(actor:Pick<Actor,"id">,input:unknown,sessionHash:string){
  if(ssoEnabled()) throw new RequestError("Tài khoản và mật khẩu được quản lý tại SSO 115.");
 const parsed=accountInput.safeParse(input);
 if(!parsed.success)throw new RequestError(parsed.error.issues[0].message);
 const {email,newPassword}=parsed.data;
 const snapshot=await prisma.user.findUnique({where:{id:actor.id},select:{passwordHash:true,updatedAt:true,active:true}});
 const session=await prisma.session.findFirst({where:{tokenHash:sessionHash,userId:actor.id,expiresAt:{gt:new Date()}}});
 if(!snapshot?.active||!session)throw new RequestError("Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.",401);
 const passwordHash=newPassword?await hash(newPassword,12):undefined;
 return rosterTransaction(async tx=>{
  const current=await tx.user.findUnique({where:{id:actor.id},select:{passwordHash:true,updatedAt:true,active:true,email:true,username:true}});
  const validSession=await tx.session.findFirst({where:{tokenHash:sessionHash,userId:actor.id,expiresAt:{gt:new Date()}}});
  if(!current?.active||!validSession||current.passwordHash!==snapshot.passwordHash||current.updatedAt.getTime()!==snapshot.updatedAt.getTime())throw new RequestError("Tài khoản hoặc phiên đăng nhập đã thay đổi. Hãy đăng nhập lại.",401);
  if(email && await tx.user.findFirst({where:{email,id:{not:actor.id}},select:{id:true}}))throw new RequestError("Email đã được sử dụng cho tài khoản khác.");
  if((current.email||"")===email&&!newPassword)return {changed:false};
  await tx.user.update({where:{id:actor.id},data:{email:email||null,...(passwordHash?{passwordHash}:{})}});
  await tx.session.deleteMany({where:{userId:actor.id}});
  await tx.passwordResetChallenge.updateMany({where:{userId:actor.id,usedAt:null},data:{usedAt:new Date(),codeHash:null,expiresAt:null}});
  if(newPassword)await tx.loginAttempt.deleteMany({where:{key:hashSecret(current.username.toLowerCase())}});
  await tx.auditLog.create({data:{actorId:actor.id,resourceId:actor.id,action:"ACCOUNT_SELF_UPDATE",result:"ALLOWED"}});
  return {changed:true};
 });
}
