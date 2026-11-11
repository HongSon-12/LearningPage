import { currentUser } from "@/lib/auth";
import { assertClassAccess, can } from "@/lib/permissions";
import { getEligibleManagers } from "@/lib/manager-access";
import prisma from "@/lib/prisma";
import { errorResponse, rateLimit, RequestError } from "@/lib/security";
import { z } from "zod";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const actor = await currentUser();
    if (!actor) throw new RequestError("Vui lòng đăng nhập.", 401);
    if (!can(actor, "classes.assign")) throw new RequestError("Bạn không có quyền phân công lớp.", 403);
    const classId = new URL(request.url).searchParams.get("classId");
    if (classId !== null) {
      if (!z.uuid().safeParse(classId).success) throw new RequestError("Mã lớp không hợp lệ.");
      const course = await prisma.class.findUnique({ where: { id: classId }, select: { managerId: true } });
      if (!course) throw new RequestError("Không tìm thấy lớp.", 404);
      assertClassAccess(actor, course);
    }
    await rateLimit("manager-picker", actor.id, 30, 60000);
    return Response.json(await getEligibleManagers(), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
