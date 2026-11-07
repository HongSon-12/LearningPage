import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "./prisma";
import { assertPermission, can, classScope, type Actor } from "./permissions";
import { RequestError } from "./security";
import type { RegistrationFilter } from "./registration-filter";
const filterSchema = z.object({ query: z.string().trim().max(120), classId: z.string().max(64), type: z.enum(["", "COMMUNITY_FIRST_AID", "CME_ABCDE", "AMBULANCE_DRIVER", "CPR_ADVANCED", "CPR_BASIC"]), batch: z.string().max(250), state: z.enum(["", "PENDING", "APPROVED", "REJECTED"]), document: z.enum(["", "unpaid", "invoice", "certificate", "delivery"]), page: z.number().int().min(1).max(1000000), sort: z.enum(["createdAt", "fullName", "contact", "class", "paymentStatus", "status", "invoice", "certificate", "delivery"]), desc: z.boolean() }).strict();
const empty = (field: "invoiceCode" | "certificateCode" | "confirmationNumber"): Prisma.RegistrationWhereInput => ({ OR: [{ [field]: null }, { [field]: "" }] });
export async function queryRegistrationPage(actor: Actor, input: RegistrationFilter) {
    assertPermission(actor, "registrations.view");
    const parsed = filterSchema.safeParse(input);
    if (!parsed.success)
        throw new RequestError("Bộ lọc hồ sơ không hợp lệ.");
    const f = parsed.data;
    const scope: Prisma.RegistrationWhereInput = { class: classScope(actor) };
    const identity = can(actor, "students.identity");
    const conditions: Prisma.RegistrationWhereInput[] = [scope];
    if (f.classId)
        conditions.push({ classId: f.classId });
    if (f.type || f.batch)
        conditions.push({ class: { ...classScope(actor), ...(f.type ? { courseType: f.type } : {}), ...(f.batch ? { courseBatch: f.batch } : {}) } });
    if (f.query)
        conditions.push({ OR: [{ fullName: { contains: f.query, mode: "insensitive" } }, { phone: { contains: f.query } }, { id: { contains: f.query } }, { invoiceCode: { contains: f.query, mode: "insensitive" } }, { confirmationNumber: { contains: f.query, mode: "insensitive" } }, ...(identity ? [{ cccd: { contains: f.query } }] : /^\d{1,4}$/.test(f.query) ? [{ cccd: { endsWith: f.query } }] : [])] });
    const base: Prisma.RegistrationWhereInput = { AND: conditions };
    const filtered: Prisma.RegistrationWhereInput[] = [base];
    if (f.state)
        filtered.push({ status: f.state });
    if (f.document) {
        filtered.push({ status: { not: "REJECTED" }, paymentStatus: { not: "CANCELLED" } });
        if (f.document === "unpaid")
            filtered.push({ paymentStatus: "PENDING" });
        if (f.document === "invoice")
            filtered.push(empty("invoiceCode"));
        if (f.document === "certificate")
            filtered.push({ OR: [{ AND: [{ class: { certificateType: "CONFIRMATION" } }, empty("confirmationNumber")] }, { AND: [{ class: { certificateType: { not: "CONFIRMATION" } } }, empty("certificateCode")] }] });
        if (f.document === "delivery")
            filtered.push({ certificateDeliveredDirect: false, certificateSentByPost: false });
    }
    const where: Prisma.RegistrationWhereInput = { AND: filtered };
    const direction: Prisma.SortOrder = f.desc ? "desc" : "asc";
    const course = f.sort === "certificate" && f.classId ? await prisma.class.findFirst({ where: { id: f.classId, ...classScope(actor) }, select: { certificateType: true } }) : null;
    const order: Prisma.RegistrationOrderByWithRelationInput = f.sort === "contact" ? { phone: direction } : f.sort === "class" ? { class: { code: direction } } : f.sort === "invoice" ? { invoiceCode: direction } : f.sort === "certificate" ? (course?.certificateType === "CONFIRMATION" ? { confirmationNumber: direction } : { certificateCode: direction }) : f.sort === "delivery" ? { certificateDeliveredDirect: direction } : { [f.sort]: direction };
    const orderBy: Prisma.RegistrationOrderByWithRelationInput[] = [order];
    if (f.sort === "delivery")
        orderBy.push({ certificateSentByPost: direction });
    orderBy.push({ id: "asc" });
    return prisma.$transaction(async (tx) => {
        const [total, groups, scopeTotal] = await Promise.all([tx.registration.count({ where }), tx.registration.groupBy({ by: ["status"], where: base, _count: true }), tx.registration.count({ where: { AND: [scope, ...(f.classId ? [{ classId: f.classId }] : [])] } })]);
        const pages = Math.max(1, Math.ceil(total / 10)), page = Math.min(f.page, pages);
        const rows = await tx.registration.findMany({ where, orderBy, take: 10, skip: (page - 1) * 10, select: { id: true, classId: true, rejectionReason: true, confirmationNumber: true, certificateDeliveredDirect: true, certificateSentByPost: true, registrationMethod: true, fullName: true, phone: true, paymentStatus: true, status: true, createdAt: true, dob: true, gender: true, email: true, organization: true, cccd: true, workplace: identity, idPhotoUrl: identity, degreeUrl: identity, paymentReceiptUrl: can(actor, "receipts.view"), invoiceCode: true, certificateCode: true, class: { select: { certificateType: true, courseType: true, courseBatch: true, code: true, name: true } } } });
        const summary: Record<string, number> = { "": 0, PENDING: 0, APPROVED: 0, REJECTED: 0 };
        for (const group of groups) {
            summary[group.status] = group._count;
            summary[""] += group._count;
        }
        return { items: rows.map(row => ({ ...row, cccd: identity ? row.cccd : row.cccd ? `********${row.cccd.slice(-4)}` : null, workplace: identity ? row.workplace : null, idPhotoUrl: identity ? row.idPhotoUrl : null, degreeUrl: identity ? row.degreeUrl : null, paymentReceiptUrl: can(actor, "receipts.view") ? row.paymentReceiptUrl : null, events: [] as {
                    id: string;
                    action: string;
                    details: unknown;
                    createdAt: Date;
                }[] })), page, pages, total, scopeTotal, summary };
    }, { isolationLevel: "RepeatableRead" });
}
export type RegistrationPage = Awaited<ReturnType<typeof queryRegistrationPage>>;
