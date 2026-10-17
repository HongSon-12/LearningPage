"use server";
import { headers } from "next/headers";
import { requestLookup, redeemLookup } from "@/lib/public-lookup";
import { requestIdentity, RequestError } from "@/lib/security";
function message(error: unknown) {
  return error instanceof RequestError
    ? error.message
    : "Không thể tra cứu lúc này. Vui lòng thử lại sau.";
}
export async function requestSearchCode(cccd: string) {
  try {
    return {
      success: true as const,
      ...(await requestLookup(cccd, requestIdentity(await headers()))),
    };
  } catch (error) {
    return { success: false as const, error: message(error) };
  }
}
export async function verifySearchCode(challengeId: string, code: string) {
  try {
    return {
      success: true as const,
      data: await redeemLookup(
        challengeId,
        code,
        requestIdentity(await headers()),
      ),
    };
  } catch (error) {
    return { success: false as const, error: message(error) };
  }
}
