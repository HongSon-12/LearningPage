import {ssoEnabled} from "./auth-mode";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { rosterTransaction } from "./admissions";
import { otpDigest, matchesCode, OTP_MAX_ATTEMPTS } from "./lookup-otp";
import { hashSecret, rateLimit, RequestError } from "./security";
export const resetRequestMessage="Nếu email khớp với tài khoản đang hoạt động, bạn sẽ nhận được mã đặt lại mật khẩu. Kiểm tra cả thư rác. Mã có hiệu lực 10 phút.";
export const resetEmailHash=(email:string)=>otpDigest(`staff-reset-email:${email.trim().toLowerCase()}`);
const invalid=()=>new RequestError("Mã không hợp lệ hoặc đã hết hạn. Hãy yêu cầu mã mới.");
export async function requestPasswordReset(rawEmail:unknown,identity:string) {
  if(ssoEnabled()) throw new RequestError("Tài khoản và mật khẩu được quản lý tại SSO 115.");
  const parsed=z.string().trim().toLowerCase().pipe(z.email().max(254)).safeParse(rawEmail);
  if(!parsed.success) throw new RequestError("Nhập email hợp lệ.");
  const email=parsed.data,emailHash=resetEmailHash(email);
  await rateLimit("staff-reset-ip",identity,15,900000);
  await rateLimit("staff-reset-email",emailHash,3,900000);
  return rosterTransaction(async tx=>{
    const user=await tx.user.findUnique({where:{email}});
    await tx.passwordResetChallenge.updateMany({where:{emailHash,usedAt:null},data:{usedAt:new Date(),codeHash:null}});
    const challenge=await tx.passwordResetChallenge.create({data:{id:randomUUID(),emailHash,userId:user?.active?user.id:null,accountUpdatedAt:user?.active?user.updatedAt:null}});
    const job=await tx.emailOutbox.create({data:{type:"PASSWORD_RESET",passwordResetId:challenge.id,recipient:email,idempotencyKey:`staff-reset:${challenge.id}`}});
    return {challengeId:challenge.id,jobId:job.id,message:resetRequestMessage};
  });
}
const completeSchema=z.object({challengeId:z.uuid(),code:z.string().regex(/^[0-9]{6}$/),password:z.string().min(10).max(72).refine(value=>Buffer.byteLength(value,"utf8")<=72),confirm:z.string().max(72)}).strict().refine(value=>value.password===value.confirm);
export async function completePasswordReset(input:unknown,identity:string) {
  if(ssoEnabled()) throw new RequestError("Tài khoản và mật khẩu được quản lý tại SSO 115.");
  await rateLimit("staff-reset-complete",identity,20,900000);
  const parsed=completeSchema.safeParse(input);
  if(!parsed.success) throw new RequestError("Kiểm tra mã 6 số, mật khẩu từ 10 ký tự (tối đa 72 byte) và xác nhận mật khẩu.");
  const {challengeId,code,password}=parsed.data;
  await rateLimit("staff-reset-challenge",challengeId,10,900000);
  const passwordHash=await hash(password,12);
  const result=await rosterTransaction(async tx=>{
    const challenge=await tx.passwordResetChallenge.findUnique({where:{id:challengeId},include:{user:true}});
    const user=challenge?.user;
    if(!challenge || !user?.active || !user.email || challenge.usedAt || !challenge.codeHash || !challenge.expiresAt || challenge.expiresAt<=new Date() || challenge.failedAttempts>=OTP_MAX_ATTEMPTS || challenge.emailHash!==resetEmailHash(user.email) || challenge.accountUpdatedAt?.getTime()!==user.updatedAt.getTime()) return false;
    if(!matchesCode(`staff-reset:${challenge.id}`,code,challenge.codeHash)) {
      const exhausted=challenge.failedAttempts+1>=OTP_MAX_ATTEMPTS;
      await tx.passwordResetChallenge.update({where:{id:challengeId},data:{failedAttempts:{increment:1},...(exhausted?{usedAt:new Date(),codeHash:null}:{})}});
      return false;
    }
    await tx.user.update({where:{id:user.id},data:{passwordHash}});
    await tx.session.deleteMany({where:{userId:user.id}});
    await tx.loginAttempt.deleteMany({where:{key:hashSecret(user.username.toLowerCase())}});
    await tx.passwordResetChallenge.updateMany({where:{userId:user.id,usedAt:null},data:{usedAt:new Date(),codeHash:null,expiresAt:null}});
    await tx.emailOutbox.create({data:{type:"PASSWORD_RESET_NOTICE",recipient:user.email,idempotencyKey:`staff-reset-notice:${challengeId}`}});
    await tx.auditLog.create({data:{action:"PASSWORD_RESET",result:"ALLOWED",actorId:user.id,resourceId:user.id}});
    return true;
  });
  if(!result)throw invalid();
  return {success:true as const};
}
