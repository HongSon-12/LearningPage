"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  Users,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SelectField, SelectOption } from "@/components/forms/select-field";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { searchStudentDirectory } from "@/app/actions/student-directory";
import {
  defaultStudentFilter,
  type StudentDirectoryFilter,
} from "@/lib/student-directory-input";
import type { StudentDirectoryData } from "@/lib/student-directory";
type Course = { id: string; code: string; name: string };
function ReviewBadge({ review }: { review: boolean }) {
  return (
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
  );
}
export default function StudentDirectory({
  initialData,
  courses,
  canSearchCccd,
}: {
  initialData: StudentDirectoryData;
  courses: Course[];
  canSearchCccd: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [filter, setFilter] =
    useState<StudentDirectoryFilter>(defaultStudentFilter);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  async function load(next: StudentDirectoryFilter) {
    const id = ++request.current;
    setBusy(true);
    setError("");
    try {
      const result = await searchStudentDirectory(next);
      if (id !== request.current) return;
      if (result.success) {
        setData(result.data);
        setFilter({ ...next, page: result.data.page });
      } else setError(result.error);
    } catch {
      if (id === request.current)
        setError("Không tải được kết quả mới. Danh sách trước vẫn được giữ.");
    } finally {
      if (id === request.current) setBusy(false);
    }
  }
  return (
    <section
      className="space-y-4"
      aria-label="Danh sách hồ sơ học viên"
      aria-busy={busy}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" aria-label="Lọc theo đối chiếu">
          {(
            [
              {
                value: "all",
                label: "Tất cả học viên",
                short: "Tất cả",
                count: data.summary.all,
              },
              {
                value: "review",
                label: "Hồ sơ cần đối chiếu",
                short: "Cần đối chiếu",
                count: data.summary.review,
              },
              {
                value: "confirmed",
                label: "Hồ sơ đã đối chiếu",
                short: "Đã đối chiếu",
                count: data.summary.confirmed,
              },
            ] as const
          ).map((item) => (
            <Button
              key={item.value}
              className="h-auto min-h-11 flex-col gap-1 px-2 py-2 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm"
              aria-label={item.label}
              variant={filter.review === item.value ? "default" : "outline"}
              aria-pressed={filter.review === item.value}
              disabled={busy}
              onClick={() =>
                void load({ ...filter, query, review: item.value, page: 1 })
              }
            >
              {item.short}
              <span className="rounded bg-background/20 px-1.5 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 tabular-nums">
                {item.count}
              </span>
            </Button>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void load({ ...filter, query, page: 1 });
          }}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 border-b p-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)_auto]"
        >
          <div className="min-w-0 space-y-2">
            <Label htmlFor="student-query">Tìm học viên</Label>
            <Input
              id="student-query"
              value={query}
              maxLength={120}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                canSearchCccd
                  ? "Họ tên, CCCD, điện thoại hoặc email…"
                  : "Họ tên, điện thoại hoặc email…"
              }
            />
          </div>
          <div className="col-span-2 min-w-0 space-y-2 md:col-span-1 md:col-start-2 md:row-start-1">
            <Label htmlFor="student-class">Lớp học</Label>
            <SelectField
              id="student-class"
              value={filter.classId}
              disabled={busy}
              onValueChange={(classId) =>
                void load({ ...filter, query, classId, page: 1 })
              }
            >
              <SelectOption value="">Tất cả lớp được xem</SelectOption>
              {courses.map((course) => (
                <SelectOption key={course.id} value={course.id}>
                  {course.code} · {course.name}
                </SelectOption>
              ))}
            </SelectField>
          </div>
          <Button
            className="col-start-2 row-start-1 md:col-start-3"
            type="submit"
            disabled={busy}
            aria-label={busy ? "Đang tìm…" : "Tìm kiếm"}
          >
            <Search />
            <span className="sr-only md:not-sr-only">
              {busy ? "Đang tìm…" : "Tìm kiếm"}
            </span>
          </Button>
        </form>
        {error && (
          <p
            role="alert"
            className="border-b bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <div className="flex items-center justify-between gap-3 px-4 py-2 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">
          <div className="min-w-0">
            <p role="status" aria-live="polite">
              {data.total} học viên phù hợp{busy ? " · Đang cập nhật…" : ""}
            </p>
            {filter.query && (
              <p className="mt-1 max-w-full break-words">
                Từ khóa: {filter.query}
              </p>
            )}
          </div>
          <Button
            variant="action"
            size="sm"
            aria-label="Làm mới danh sách học viên"
            disabled={busy}
            onClick={() => void load(filter)}
          >
            <RefreshCw className={busy ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Làm mới</span>
          </Button>
        </div>
        {!data.items.length ? (
          <div className="space-y-3 px-4 py-10 text-center">
            <Users className="mx-auto size-8 text-muted-foreground" />
            <h2 className="font-semibold">
              {data.summary.all
                ? "Không có hồ sơ phù hợp"
                : "Chưa có hồ sơ học viên"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {data.summary.all
                ? "Thử từ khóa khác hoặc bỏ bớt bộ lọc."
                : "Hồ sơ sẽ xuất hiện sau khi học viên đăng ký lớp trong phạm vi quản lý."}
            </p>
            {data.summary.all > 0 && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setQuery("");
                  void load(defaultStudentFilter);
                }}
              >
                Xóa bộ lọc
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[27%] pl-4">Học viên</TableHead>
                    <TableHead className="w-[18%]">CCCD</TableHead>
                    <TableHead className="w-[27%]">Liên hệ</TableHead>
                    <TableHead className="w-[18%]">Hồ sơ</TableHead>
                    <TableHead className="w-44 pr-4 text-right">
                      Thao tác
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="whitespace-normal py-3 pl-4">
                        <Link
                          href={`/students/${student.id}`}
                          className="break-words font-semibold text-foreground hover:text-primary hover:underline"
                        >
                          {student.fullName}
                        </Link>
                        <p className="mt-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">
                          {student.dob.split("-").reverse().join("/")}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-normal tabular-nums text-sm">
                        {student.cccd || (
                          <span className="font-sans text-muted-foreground">
                            Chưa có CCCD
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <p className="text-sm tabular-nums">{student.phone}</p>
                        <p className="mt-1 break-all text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">
                          {student.email || "Chưa có email tra cứu"}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <ReviewBadge review={student.needsReview} />
                        <p className="mt-1.5 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">
                          {student.registrations} lần đăng ký
                        </p>
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button asChild variant="action" size="row">
                          <Link href={`/students/${student.id}`}>
                            Mở hồ sơ
                            <ArrowRight />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="divide-y md:hidden">
              {data.items.map((student) => (
                <article key={student.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/students/${student.id}`}
                      className="min-w-0 break-words font-semibold hover:text-primary"
                    >
                      {student.fullName}
                    </Link>
                    <ReviewBadge review={student.needsReview} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[length:var(--ui-caption-size,0.8125rem)] leading-5">
                    <p className="text-muted-foreground">CCCD</p>
                    <p className="break-all font-mono">
                      {student.cccd || "Chưa có"}
                    </p>
                    <p className="text-muted-foreground">Điện thoại</p>
                    <p>{student.phone}</p>
                    <p className="text-muted-foreground">Email tra cứu</p>
                    <p className="break-all">{student.email || "Chưa có"}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">
                      {student.registrations} lần đăng ký
                    </span>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/students/${student.id}`}>
                        <ClipboardCheck />
                        Mở hồ sơ
                      </Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">
          <span>
            {data.total ? (data.page - 1) * 20 + 1 : 0}–
            {Math.min(data.page * 20, data.total)} / {data.total} học viên ·
            Trang {data.page}/{data.pages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy || data.page <= 1}
              onClick={() => void load({ ...filter, page: data.page - 1 })}
            >
              <ChevronLeft />
              Trang trước
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || data.page >= data.pages}
              onClick={() => void load({ ...filter, page: data.page + 1 })}
            >
              Trang sau
              <ChevronRight />
            </Button>
          </div>
        </footer>
      </div>
    </section>
  );
}
