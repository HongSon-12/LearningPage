import {ssoEnabled} from "./auth-mode";
import { randomUUID } from "node:crypto";
import prisma from "./prisma";
import { rosterTransaction } from "./admissions";
import { codeDigest,newLookupCode,OTP_LIFETIME_MS,otpDigest } from "./lookup-otp";
import { resetEmailHash } from "./password-reset";
import { sendSecurityEmail } from "./mailer";
import type { SecuritySender } from "./search-email-worker";
export async function runPasswordResetEmailBatch(send:SecuritySender=sendSecurityEmail,batchSize=10,onlyJobId?:string) {
  if(ssoEnabled()) { await prisma.emailOutbox.updateMany({where:{type:{in:["PASSWORD_RESET","PASSWORD_RESET_NOTICE"]},status:{in:["PENDING","SENDING"]}},data:{status:"CANCELLED",leaseId:null,leaseUntil:null,lastErrorCode:"SSO_MANAGED"}});return {sent:0,failed:0}; }
  otpDigest("configuration-check");
  let sent=0,failed=0;
  for(let index=0;index<Math.min(batchSize,50);index++) {
    const now=new Date();
    const eligible={...(onlyJobId?{id:onlyJobId}:{}),type:{in:["PASSWORD_RESET","PASSWORD_RESET_NOTICE"]},attemptCount:{lt:5},OR:[{status:"PENDING",nextAttemptAt:{lte:now}},{status:"SENDING",leaseUntil:{lt:now}}]};
    const job=await prisma.emailOutbox.findFirst({where:eligible,orderBy:{createdAt:"asc"}});if(!job)break;
    const leaseId=randomUUID();
    const claimed=await prisma.emailOutbox.updateMany({where:{...eligible,id:job.id,attemptCount:job.attemptCount},data:{status:"SENDING",leaseId,leaseUntil:new Date(Date.now()+180000),attemptCount:{increment:1}}});if(!claimed.count)continue;
    const code=newLookupCode(),codeHash=codeDigest(`staff-reset:${job.passwordResetId}`,code);
    try {
      if(job.type==="PASSWORD_RESET") {
        const valid=await rosterTransaction(async tx=>{
          const current=await tx.emailOutbox.findFirst({where:{id:job.id,leaseId,status:"SENDING"},include:{passwordReset:{include:{user:true}}}});
          const challenge=current?.passwordReset,user=challenge?.user;
          if(!challenge||!user?.active||!user.email||challenge.usedAt||challenge.createdAt.getTime()<Date.now()-1800000||user.email!==job.recipient||challenge.emailHash!==resetEmailHash(user.email)||challenge.accountUpdatedAt?.getTime()!==user.updatedAt.getTime())return false;
          await tx.passwordResetChallenge.update({where:{id:challenge.id},data:{codeHash,expiresAt:new Date(Date.now()+OTP_LIFETIME_MS)}});return true;
        });
        if(!valid){await prisma.emailOutbox.updateMany({where:{id:job.id,leaseId},data:{status:"CANCELLED",leaseId:null,leaseUntil:null,lastErrorCode:"INVALIDATED"}});continue;}
      }
      await send(job.recipient,job.type==="PASSWORD_RESET"?"Mã đặt lại mật khẩu TTCC115":"Mật khẩu TTCC115 đã được thay đổi",job.type==="PASSWORD_RESET"?`<p>Mã đặt lại mật khẩu:</p><p style="font-size:28px;letter-spacing:6px"><strong>${code}</strong></p><p>Mã có hiệu lực 10 phút, chỉ dùng một lần. Không chia sẻ mã. Nếu không yêu cầu, hãy bỏ qua email này.</p>`:"<p>Mật khẩu tài khoản TTCC115 của bạn vừa được thay đổi. Các phiên đăng nhập cũ đã được kết thúc. Nếu bạn không thực hiện, hãy liên hệ quản trị hệ thống ngay.</p>");
      await prisma.emailOutbox.updateMany({where:{id:job.id,leaseId},data:{status:"SENT",sentAt:new Date(),leaseId:null,leaseUntil:null,lastErrorCode:null}});sent++;
    }catch{
      if(job.passwordResetId)await prisma.passwordResetChallenge.updateMany({where:{id:job.passwordResetId,codeHash},data:{codeHash:null,expiresAt:null}});
      await prisma.emailOutbox.updateMany({where:{id:job.id,leaseId},data:{status:job.attemptCount+1>=5?"FAILED":"PENDING",nextAttemptAt:new Date(Date.now()+60000*2**job.attemptCount),leaseId:null,leaseUntil:null,lastErrorCode:"SEND_FAILED"}});failed++;
    }
  }
  await prisma.emailOutbox.updateMany({where:{...(onlyJobId?{id:onlyJobId}:{}),type:{in:["PASSWORD_RESET","PASSWORD_RESET_NOTICE"]},status:"SENDING",attemptCount:{gte:5},leaseUntil:{lt:new Date()}},data:{status:"FAILED",leaseId:null,leaseUntil:null,lastErrorCode:"LEASE_EXPIRED"}});
  return {sent,failed};
}
