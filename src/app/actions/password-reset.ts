"use server";
import {publicError} from "@/lib/errors";
import { headers } from "next/headers";
import { after } from "next/server";
import { requestPasswordReset,completePasswordReset } from "@/lib/password-reset";
import { runPasswordResetEmailBatch } from "@/lib/password-reset-worker";
import { requestIdentity } from "@/lib/security";
export async function requestReset(email:string) {
  try {
    const result=await requestPasswordReset(email,requestIdentity(await headers()));
    after(async()=>{try{await runPasswordResetEmailBatch(undefined,1,result.jobId);}catch{/* Durable outbox retains pending work. */}});
    return {success:true as const,challengeId:result.challengeId,message:result.message};
  }catch(error){return {success:false as const,error:publicError(error,"Không thể xử lý. Vui lòng thử lại sau.")};}
}
export async function resetPassword(input:unknown) {
  try {
    await completePasswordReset(input,requestIdentity(await headers()));
    after(async()=>{try{await runPasswordResetEmailBatch();}catch{/* Retried by email worker. */}});
    return {success:true as const};
  }catch(error){return {success:false as const,error:publicError(error,"Không thể xử lý. Vui lòng thử lại sau.")};}
}
