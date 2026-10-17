import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { pageUser, classScope } from "@/lib/auth";
import { studentScope } from "@/lib/students";
import { PageHeader } from "../../components/AdminUI";
import { Users } from "lucide-react";
import ProfileEditor from "../ProfileEditor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ClipboardCheck } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
export const dynamic = "force-dynamic";
export default async function StudentPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const actor = await pageUser();
  const { studentId } = await params;
  const student = await prisma.student.findFirst({
    where: { id: studentId, ...studentScope(actor) },
  });
  if (!student) notFound();
  const history = await prisma.registration.findMany({
    where: { studentId, class: classScope(actor) },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      profileReviewRequired: true,
      class: { select: { id: true, name: true, code: true, startDate: true } },
      invoiceCode: true,
      certificateCode: true,
      confirmationNumber: true,
    },
  });
  const review =
    student.needsReview || history.some((reg) => reg.profileReviewRequired);
  return (
    <div className="w-full min-w-0 space-y-4">
      <PageHeader
        title={student.fullName}
        description="Thông tin học viên và lịch sử đăng ký trong phạm vi được xem."
        icon={Users}
        parent={{ href: "/students", label: "Hồ sơ học viên" }}
        action={
          <Badge
            variant="outline"
            className={
              review
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }
          >
            {review ? "Cần đối chiếu" : "Đã đối chiếu"}
          </Badge>
        }
      />
      <nav
        aria-label="Mục trong hồ sơ"
        className="flex flex-wrap gap-2 xl:hidden"
      >
        <Button asChild variant="outline" size="sm">
          <a
            href={
              actor.role === "ADMIN"
                ? "#student-profile-editor"
                : "#student-profile-info"
            }
          >
            Thông tin học viên
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="#student-history">Lịch sử đăng ký</a>
        </Button>
      </nav>
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.6fr)]">
        <div className="min-w-0 space-y-4">
          {review && (
            <aside
              aria-label="Hồ sơ cần đối chiếu"
              className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
            >
              <p className="flex items-center gap-2 font-semibold">
                <ClipboardCheck className="size-4" />
                Cần đối chiếu thông tin
              </p>
              <p className="mt-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5">
                Quản trị viên cần kiểm tra căn cước, email và các lần đăng ký
                trước khi xác nhận hồ sơ để tra cứu công khai.
              </p>
            </aside>
          )}
          {actor.role === "ADMIN" ? (
            <ProfileEditor
              student={{
                id: student.id,
                fullName: student.fullName,
                cccd: student.cccd,
                dob: student.dob.toISOString().slice(0, 10),
                phone: student.phone,
                email: student.email,
              }}
            />
          ) : (
            <section
              id="student-profile-info"
              className="scroll-mt-4 rounded-xl border bg-card p-4 sm:p-5"
            >
              <h2 className="font-semibold">Thông tin học viên</h2>
              <dl className="mt-4 space-y-4 text-sm">
                {[
                  [
                    "Ngày sinh",
                    student.dob
                      .toISOString()
                      .slice(0, 10)
                      .split("-")
                      .reverse()
                      .join("/"),
                  ],
                  [
                    "CCCD",
                    student.cccd
                      ? actor.role === "ACCOUNTANT"
                        ? `********${student.cccd.slice(-4)}`
                        : student.cccd
                      : "Chưa có",
                  ],
                  ["Điện thoại", student.phone],
                  ["Email tra cứu", student.email || "Chưa có"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">{label}</dt>
                    <dd className="mt-1 break-all font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 border-t pt-3 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">
                Liên hệ quản trị viên để cập nhật thông tin hồ sơ dùng chung.
              </p>
            </section>
          )}
        </div>
        <section
          className="min-w-0 scroll-mt-4 overflow-hidden rounded-xl border bg-card"
          id="student-history"
          aria-label="Lịch sử đăng ký học"
        >
          <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
            <div>
              <h2 className="font-semibold">Lịch sử đăng ký học</h2>
              <p className="mt-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">
                {history.length} lần đăng ký trong phạm vi quản lý
              </p>
            </div>
            <Badge variant="secondary">
              {history.filter((reg) => reg.status === "APPROVED").length} đã
              duyệt
            </Badge>
          </header>
          <div className="divide-y">
            {history.map((reg) => (
              <article key={reg.id} className="space-y-3 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-semibold text-primary">
                      {reg.class.code}
                    </p>
                    <h3 className="mt-1 break-words text-sm font-semibold">
                      {reg.class.name}
                    </h3>
                    <p className="mt-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">
                      Ngày học:{" "}
                      {reg.class.startDate.toLocaleDateString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </p>
                  </div>
                  <Button variant="action" size="icon" asChild>
                    <Link
                      aria-label={`Mở lớp ${reg.class.code}`}
                      href={`/courses/${reg.class.id}`}
                    >
                      <ArrowUpRight />
                    </Link>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge kind="registration" value={reg.status} />
                  <StatusBadge kind="payment" value={reg.paymentStatus} />
                </div>
                <dl className="grid gap-3 rounded-lg bg-muted/50 p-3 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 sm:grid-cols-3">
                  {[
                    ["Chứng chỉ", reg.certificateCode],
                    ["Giấy xác nhận", reg.confirmationNumber],
                    ["Hóa đơn", reg.invoiceCode],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="mt-1 break-all font-medium">
                        {value || "Chưa cấp"}
                      </dd>
                    </div>
                  ))}
                </dl>
                {reg.profileReviewRequired && (
                  <p className="text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-amber-800">
                    Thông tin lần đăng ký này cần đối chiếu với hồ sơ học viên.
                  </p>
                )}
              </article>
            ))}
          </div>
          {!history.length && (
            <p className="p-6 text-sm text-muted-foreground">
              Chưa có lần đăng ký trong phạm vi quản lý.
            </p>
          )}
          {history.length === 100 && (
            <p className="border-t p-4 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">
              Đang hiển thị tối đa100 lần đăng ký gần nhất.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
