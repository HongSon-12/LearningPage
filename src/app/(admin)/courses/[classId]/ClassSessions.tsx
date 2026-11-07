import { can } from "@/lib/permissions";
import { assertPagePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { pageUser } from "@/lib/auth";
import { classWorkspace } from "@/lib/class-workspace";
import SessionList from "./sessions/SessionList";
export const dynamic = "force-dynamic";
export default async function ClassSessions({classId}:{classId:string}) {
  const actor = await pageUser(["ADMIN", "CLASS_MANAGER"]);
  assertPagePermission(actor, "sessions.manage");
  await classWorkspace(classId);
  const sessions = await prisma.classSession.findMany({
    where: { classId },
    orderBy: { startsAt: "asc" },
    include: {
      _count: { select: { attendance: { where: { present: true } } } },
    },
  });
  return (
    <div className="w-full min-w-0 space-y-4">
      <SessionList
        classId={classId}
        canAttendance={can(actor, "attendance.manage")}
        sessions={sessions.map((session) => ({
          id: session.id,
          title: session.title,
          startsAt: session.startsAt.toISOString(),
          endsAt: session.endsAt.toISOString(),
          location: session.location,
          closed: session.closed,
          presentCount: session._count.attendance,
        }))}
      />
    </div>
  );
}
