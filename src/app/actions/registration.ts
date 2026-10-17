"use server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { digest } from "@/lib/auth";
import { reserveOnline, errorMessage, publicRegistrationSelect, type RegistrationInput } from "@/lib/admissions";
export async function createRegistration(data: RegistrationInput & {requestKey: string; receiptToken: string}) {
  try {
    const {registration, created} = await reserveOnline(data);
    if (created && data.email) {
      const mailer=await import("@/lib/mailer");
      const course=await prisma.class.findUniqueOrThrow({where:{id:registration.classId}});
      void mailer.sendRegistrationConfirmation(data.email,data.fullName,course.name,course.code).catch(console.error);
    }
    revalidatePath("/courses", "layout"); revalidatePath("/hocsocapcuu/courses"); revalidatePath("/", "layout");
    // Receipt ownership is a random capability; return only the information needed by this wizard.
    const result = await prisma.registration.findUniqueOrThrow({where: {id: registration.id}, select: publicRegistrationSelect});
    return {success: true, data: result};
  } catch (error) {return {success: false, error: errorMessage(error)};}
}
export async function updatePaymentReceipt(id: string, paymentReceiptUrl: string, receiptToken: string) {
  try {
    if (!/^\/uploads\/[a-zA-Z0-9-]+\.(png|jpg|jpeg|webp|pdf)$/i.test(paymentReceiptUrl)) throw new Error("Biên lai không hợp lệ.");
    const result = await prisma.registration.updateMany({where: {id, receiptTokenHash: digest(receiptToken)}, data: {paymentReceiptUrl}});
    if (!result.count) throw new Error("Bạn không có quyền cập nhật biên lai này.");
    revalidatePath("/registrations");
    return {success: true};
  } catch(error) {return {success: false, error: errorMessage(error)};}
}
