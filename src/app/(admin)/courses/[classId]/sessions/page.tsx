import { notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";
import prisma from "@/lib/prisma";
import { pageUser, classScope } from "@/lib/auth";
import { PageHeader } from "../../../components/AdminUI";
import SessionList from "./SessionList";
export const dynamic = "force-dynamic";
export default async function SessionsPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const actor = await pageUser(["ADMIN", "CLASS_MANAGER"]);
  const { classId } = await params;
  const course = await prisma.class.findFirst({
    where: { id: classId, ...classScope(actor) },
    select: { id: true, code: true, name: true },
  });
  if (!course) notFound();
  const sessions = await prisma.classSession.findMany({
    where: { classId },
    orderBy: { startsAt: "asc" },
    include: {
      _count: { select: { attendance: { where: { present: true } } } },
    },
  });
  return (
    <div className="w-full min-w-0 space-y-4">
      <PageHeader
        title={`Buổi học · ${course.code}`}
        description={course.name}
        icon={CalendarDays}
        parent={{ href: `/courses/${classId}`, label: "Học viên của lớp" }}
      />
      <SessionList
        classId={classId}
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
