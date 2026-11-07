"use server";
import {RequestError} from "@/lib/errors";

import { requirePermission } from "@/lib/auth";
import { queryRegistrationPage } from "@/lib/registration-page";
import type { RegistrationFilter } from "@/lib/registration-filter";
import { rateLimit } from "@/lib/security";
import { errorMessage } from "@/lib/admissions";
import prisma from "@/lib/prisma";
import { classScope } from "@/lib/permissions";
export async function searchRegistrationPage(input: RegistrationFilter) {
    try {
        const actor = await requirePermission("registrations.view");
        await rateLimit("registration-list", actor.id, 120, 60000);
        return { success: true as const, data: await queryRegistrationPage(actor, input) };
    }
    catch (error) {
        return { success: false as const, error: errorMessage(error) };
    }
}
export async function registrationHistory(id: string, page = 1) {
    try {
        const actor = await requirePermission("registrations.view");
        if (typeof id !== "string" || id.length > 64 || !Number.isSafeInteger(page) || page < 1 || page > 1000000)
            throw new RequestError("Hồ sơ không hợp lệ.");
        await rateLimit("registration-history", actor.id, 120, 60000);
        const reg = await prisma.registration.findFirst({ where: { id, class: classScope(actor) }, select: { id: true } });
        if (!reg)
            throw new RequestError("Không tìm thấy hồ sơ.");
        const items = await prisma.registrationEvent.findMany({ where: { registrationId: id }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 21, skip: (page - 1) * 20, select: { id: true, action: true, details: true, createdAt: true } });
        return { success: true as const, items: items.slice(0, 20), more: items.length > 20 };
    }
    catch (error) {
        return { success: false as const, error: errorMessage(error) };
    }
}
