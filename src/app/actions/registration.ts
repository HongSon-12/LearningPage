"use server";
import { canonicalCccd } from "@/lib/student-identity";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { rateLimit, requestIdentity } from "@/lib/security";
import { bindRegistrationFiles, validCapability } from "@/lib/stored-files";
import { rosterTransaction } from "@/lib/admissions";
import { digest } from "@/lib/auth";
import {
  reserveOnline,
  errorMessage,
  publicRegistrationSelect,
  type RegistrationInput,
} from "@/lib/admissions";
export async function createRegistration(
  data: RegistrationInput & { requestKey: string; receiptToken: string },
) {
  try {
    await rateLimit(
      "registration",
      requestIdentity(await headers()),
      30,
      60 * 60 * 1000,
    );
    if (!canonicalCccd(data.cccd)) throw new Error("CCCD phải gồm 12 chữ số.");
    const { registration, created } = await reserveOnline(data);
    if (created && data.email) {
      const mailer = await import("@/lib/mailer");
      const course = await prisma.class.findUniqueOrThrow({
        where: { id: registration.classId },
      });
      void mailer
        .sendRegistrationConfirmation(
          data.email,
          data.fullName,
          course.name,
          course.code,
          registration.id,
        )
        .catch(console.error);
    }
    revalidatePath("/courses", "layout");
    revalidatePath("/hocsocapcuu/courses");
    revalidatePath("/", "layout");
    // Receipt ownership is a random capability; return only the information needed by this wizard.
    const result = await prisma.registration.findUniqueOrThrow({
      where: { id: registration.id },
      select: publicRegistrationSelect,
    });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
export async function updatePaymentReceipt(
  id: string,
  paymentReceiptUrl: string,
  receiptToken: string,
) {
  try {
    if (!validCapability(receiptToken))
      throw new Error("Phiên đăng ký không hợp lệ.");
    await rateLimit("receipt", digest(receiptToken), 12, 60 * 60 * 1000);
    await rosterTransaction(async (tx) => {
      const reg = await tx.registration.findUnique({ where: { id } });
      const receiptTokenHash = digest(receiptToken);
      if (!reg || reg.receiptTokenHash !== receiptTokenHash)
        throw new Error("Bạn không có quyền cập nhật biên lai này.");
      const files = await bindRegistrationFiles(
        tx,
        id,
        reg.classId,
        { paymentReceiptUrl },
        { receiptTokenHash },
      );
      await tx.registration.update({
        where: { id },
        data: { paymentReceiptUrl, ...files },
      });
    });
    revalidatePath("/registrations");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
