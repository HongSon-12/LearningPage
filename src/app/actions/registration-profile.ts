"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { requestLookup, redeemRegistrationProfile } from "@/lib/public-lookup";
import { requestIdentity, RequestError } from "@/lib/security";
const cccdSchema = z.string().regex(/^[0-9]{12}$/);
function message(error: unknown) {
  return error instanceof RequestError ? error.message : "Không thể lấy thông tin lúc này. Vui lòng thử lại hoặc tự điền thông tin.";
}
export async function requestRegistrationProfile(cccd: string) {
  if (!cccdSchema.safeParse(cccd).success)
    return { success: false as const, error: "Vui lòng nhập CCCD gồm 12 chữ số." };
  try {
    return { success: true as const, ...await requestLookup(cccd, requestIdentity(await headers())) };
  } catch (error) { return { success: false as const, error: message(error) }; }
}
export async function verifyRegistrationProfile(challengeId: string, code: string, cccd: string) {
  if (!z.tuple([z.string().uuid(), z.string().regex(/^[0-9]{6}$/), cccdSchema]).safeParse([challengeId, code, cccd]).success)
    return { success: false as const, error: "Kiểm tra lại CCCD và mã xác thực gồm 6 chữ số." };
  try {
    return { success: true as const, data: await redeemRegistrationProfile(challengeId, code, cccd, requestIdentity(await headers())) };
  } catch (error) { return { success: false as const, error: message(error) }; }
}
