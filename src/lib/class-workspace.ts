import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { assertPagePermission, classScope, pageUser } from "./auth";
import { occupiedWhere } from "./admissions";
import prisma from "./prisma";

// Shared only within the current render; every request rechecks the session and scope.
export const classWorkspace = cache(async (classId: string) => {
  const actor = await pageUser();
  assertPagePermission(actor, "classes.view");
  const course = await prisma.class.findFirst({
    where: { id: classId, ...classScope(actor) },
    include: {
      manager: { select: { username: true, name: true } },
      _count: { select: { registrations: { where: occupiedWhere }, sessions: true } },
    },
  });
  if (!course) notFound();
  return course;
});
