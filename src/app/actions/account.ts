"use server";
import {publicError} from "@/lib/errors";
import {cookies} from "next/headers";
import {revalidatePath} from "next/cache";
import {requireUser,sessionCookie,digest} from "@/lib/auth";
import {persistOwnAccount} from "@/lib/account-management";
import {rateLimit,RequestError} from "@/lib/security";
export async function saveOwnAccount(input:unknown){
 try{
  const actor=await requireUser();
  await rateLimit("self-account",actor.id,10,15*60*1000);
  const jar=await cookies();const token=jar.get(sessionCookie)?.value;
  if(!token)throw new RequestError("Hãy đăng nhập lại.",401);
  const result=await persistOwnAccount(actor,input,digest(token));
  if(result.changed){jar.delete(sessionCookie);revalidatePath("/","layout");}
  return {success:true as const,...result};
 }catch(error){return {success:false as const,error:publicError(error,"Chưa lưu được tài khoản. Vui lòng thử lại hoặc đăng nhập lại.")};}
}
