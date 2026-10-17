import { notFound } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import prisma from "@/lib/prisma";
import { pageUser, classScope } from "@/lib/auth";
import { occupiedWhere } from "@/lib/admissions";
import { sessionTimeLabel } from "@/lib/session-input";
import { PageHeader } from "../../../../components/AdminUI";
import AttendanceBoard from "./AttendanceBoard";
export const dynamic = "force-dynamic";
export default async function AttendancePage({
  params,
}: {
  params: Promise<{ classId: string; sessionId: string }>;
}) {
  const actor = await pageUser(["ADMIN", "CLASS_MANAGER"]);
  const { classId, sessionId } = await params;
  const session = await prisma.classSession.findFirst({
    where: { id: sessionId, classId, class: classScope(actor) },
    include: { class: { select: { code: true, name: true } } },
  });
  if (!session) notFound();
  const [roster, attendance] = await Promise.all([
    prisma.registration.findMany({
      where: { classId, ...occupiedWhere },
      select: { id: true },
    }),
    prisma.attendance.findMany({
      where: { sessionId, present: true },
      orderBy: { recordedAt: "desc" },
      select: {
        id: true,
        registrationId: true,
        method: true,
        recordedAt: true,
        registration: { select: { fullName: true } },
      },
    }),
  ]);
  const rosterIds = new Set(roster.map((row) => row.id));
  return (
    <div className="w-full min-w-0 space-y-4">
      <PageHeader
        title={session.title}
        description={`${session.class.code} · ${sessionTimeLabel(session.startsAt)} – ${sessionTimeLabel(session.endsAt)} · ${session.location || session.class.name}`}
        icon={ClipboardCheck}
        parent={{ href: `/courses/${classId}/sessions`, label: "Các buổi học" }}
      />
      <AttendanceBoard
        sessionId={sessionId}
        closed={session.closed}
        rosterCount={roster.length}
        presentInRoster={
          attendance.filter((row) => rosterIds.has(row.registrationId)).length
        }
        entries={attendance.map((row) => ({
          id: row.id,
          registrationId: row.registrationId,
          fullName: row.registration.fullName,
          method: row.method,
          recordedAt: row.recordedAt.toISOString(),
          inRoster: rosterIds.has(row.registrationId),
        }))}
      />
    </div>
  );
}
