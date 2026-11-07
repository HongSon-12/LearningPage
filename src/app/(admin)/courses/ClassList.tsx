"use client";
import { SelectField, SelectOption } from "@/components/forms/select-field";

import {PendingLink as Link} from "@/components/navigation/navigation-feedback";
import { useMemo, useState } from "react";
import { classStage, classStageLabels, type ClassStage } from "@/lib/class-lifecycle";
import type { Class } from "@prisma/client";
import type { DataColumn } from "@/components/data-table/table-features";
import {
  BookOpen,
  CalendarDays,
  Edit2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClass, deleteClass, updateClass } from "@/app/actions/class";
import { programs } from "@/lib/programs";
import { DataTable } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ClassForm } from "@/components/forms/class-form";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/forms/date-time-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AdminDialog from "../components/AdminDialog";

type ClassData = Class & { manager: {id:string;username:string}|null; _count: { registrations: number; sessions:number } };
export default function ClassList({
  initialClasses,
  managers,
  today,
  canCreate = true,
  canEdit = true,
  canSessions = true,
  canRegistrations = true,
}: {
  initialClasses: ClassData[];
  managers?: {id:string;username:string}[];
  today: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canSessions?: boolean;
  canRegistrations?: boolean;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClassData | null>(null);
  const [deleting, setDeleting] = useState<ClassData | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [stage, setStage] = useState<ClassStage | "">("");
  const [query, setQuery] = useState("");
  const [filterReset, setFilterReset] = useState(0);
  const [program, setProgram] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const filtered = useMemo(
    () =>
      initialClasses.filter(
        (course) =>
          (!stage || classStage(course,today) === stage) &&
          (!program || course.courseType === program) &&
          (!status || course.status === status) &&
          (!from || new Date(course.startDate) >= new Date(from)) &&
          (!to ||
            new Date(course.startDate) <
              new Date(new Date(to).getTime() + 86400000)) &&
          `${course.code} ${course.name}`
            .toLocaleLowerCase("vi")
            .includes(query.trim().toLocaleLowerCase("vi")),
      ),
    [initialClasses, program, status, from, to, query, stage, today],
  );
  const columns = useMemo<DataColumn<ClassData>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Mã lớp",
        meta: { label: "Mã lớp" },
        cell: ({ row }) => (
          <span className="font-semibold text-blue-700">
            {row.original.code}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Tên lớp",
        meta: { label: "Tên lớp" },
        cell: ({ row }) => (
          <div className="min-w-44 max-w-80 whitespace-normal">
            <p className="font-medium">{row.original.name}</p>
            <p className="mt-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">
              {row.original.manager?.username || "Chưa có người phụ trách"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "startDate",
        header: "Khai giảng",
        meta: { label: "Thời gian" },
        cell: ({ row }) => (
          <div>
            <p>
              {new Date(row.original.startDate).toLocaleDateString("vi-VN")}
            </p>
            <p className="mt-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">
              {row.original.startTime} – {row.original.endTime}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Tiến trình",
        meta: { label: "Tiến trình" },
        cell: ({ row }) => (
          <div className="space-y-1.5">
            <p className="font-medium">{classStageLabels[classStage(row.original,today)]}</p>
            <StatusBadge kind="class" value={row.original.capacity - row.original._count.registrations <= 0 && row.original.status !== "DONE" ? "FULL" : row.original.status} />
          </div>
        ),
      },
      {
        id: "capacity",
        accessorFn: (course) => course._count.registrations,
        header: "Học viên",
        meta: { label: "Sĩ số" },
        cell: ({ row }) => (
          <div className="whitespace-nowrap tabular-nums"><p>{row.original._count.registrations} / {row.original.capacity}</p><p className="mt-1 text-xs text-muted-foreground">{row.original._count.sessions} buổi học</p></div>
        ),
      },
      {
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            {canRegistrations && <Button asChild variant="action" size="row">
              <Link href={`/courses/${row.original.id}`}>
                <BookOpen />
                <span className="sr-only sm:not-sr-only">Mở lớp</span>
              </Link>
            </Button>}
            {canSessions && !canRegistrations && (
              <Button asChild variant="action" size="row">
                <Link
                  href={`/courses/${row.original.id}?tab=sessions`}
                  aria-label={`Buổi học lớp ${row.original.code}`}
                >
                  <CalendarDays />
                  <span className="sr-only sm:not-sr-only">Buổi học</span>
                </Link>
              </Button>
            )}
            {canEdit && (
              <Button
                variant="action"
                size="icon-row"
                id={`class-edit-${row.original.id}`}
                aria-label={`Sửa lớp ${row.original.code}`}
                onClick={() => {
                  setEditing(row.original);
                  setDialogOpen(true);
                }}
              >
                <Edit2 />
              </Button>
            )}
            {canCreate && (
              <Button
                variant="danger-outline"
                size="icon-row"
                id={`class-delete-${row.original.id}`}
                aria-label={`Xóa lớp ${row.original.code}`}
                onClick={() => setDeleting(row.original)}
                className="text-destructive"
              >
                <Trash2 />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canCreate, canEdit, canSessions, canRegistrations, today],
  );
  async function save(form: FormData) {
    setSaveBusy(true);
    try {
      const result = editing
        ? await updateClass(editing.id, form)
        : await createClass(form);
      if (result.success) {
        setDialogOpen(false);
        toast.success(editing ? "Đã cập nhật lớp học." : "Đã tạo lớp học.");
        router.refresh();
      }
      return result;
    } finally {
      setSaveBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const result = await deleteClass(deleting.id);
      if (!result.success) toast.error(result.error);
      else {
        setDeleting(null);
        toast.success("Đã xóa lớp học.");
        router.refresh();
      }
    } catch {
      toast.error("Không thể xóa lớp học. Vui lòng thử lại.");
    } finally {
      setDeleteBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {initialClasses.length} lớp trong phạm vi quản lý
        </p>
        {canCreate && (
          <Button
            id="class-create"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus />
            Tạo lớp
          </Button>
        )}
      </div>
      <div aria-label="Tiến trình lớp" className="flex flex-wrap gap-2">
        {(["", "upcoming", "teaching", "ended"] as const).map(value => <Button key={value} variant={stage === value ? "default" : "outline"} aria-pressed={stage === value} onClick={() => setStage(value)}>
          {value ? classStageLabels[value] : "Tất cả"}<span className="rounded-md bg-white/20 px-1.5 text-xs tabular-nums">{initialClasses.filter(course => !value || classStage(course,today) === value).length}</span>
        </Button>)}
      </div>
      <section role="search" aria-label="Bộ lọc lớp học" className="@container rounded-xl border bg-card p-4">
        <div className="grid items-end gap-3 @min-[480px]:grid-cols-2 @min-[760px]:grid-cols-3 @min-[1160px]:grid-cols-[minmax(180px,1.6fr)_minmax(160px,1.2fr)_minmax(140px,1fr)_190px_190px_auto]">
        <div className="min-w-0 space-y-2 @min-[480px]:col-span-2 @min-[760px]:col-span-1">
          <Label htmlFor="course-query">Tìm lớp học</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
            <Input
              id="course-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Mã lớp hoặc tên lớp…"
              className="pl-9"
            />
          </div>
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="course-program">Chương trình</Label>
          <SelectField
            id="course-program"
            value={program}
            onValueChange={(value) => setProgram(value)}
          >
            <SelectOption value="">Tất cả chương trình</SelectOption>
            {Object.entries(programs).map(([value, item]) => (
              <SelectOption key={value} value={value}>
                {item.name}
              </SelectOption>
            ))}
          </SelectField>
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="course-status">Trạng thái</Label>
          <SelectField
            id="course-status"
            value={status}
            onValueChange={(value) => setStatus(value)}
          >
            <SelectOption value="">Tất cả trạng thái</SelectOption>
            <SelectOption value="OPEN">Đang mở</SelectOption>
            <SelectOption value="FULL">Đã đầy</SelectOption>
            <SelectOption value="DONE">Đã kết thúc</SelectOption>
          </SelectField>
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="course-from">Khai giảng từ</Label>
          <DateTimePicker
            key={`from-${filterReset}`}
            id="course-from"
            calendarLabel="Khai giảng từ"
            value={from}
            max={to || undefined}
            onValueChange={setFrom}
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="course-to">Đến ngày</Label>
          <DateTimePicker
            key={`to-${filterReset}`}
            id="course-to"
            calendarLabel="Đến ngày"
            value={to}
            min={from || undefined}
            onValueChange={setTo}
          />
        </div>
        <Button
          variant="action"
          onClick={() => {
            setFilterReset((count) => count + 1);
            setStage("");
            setQuery("");
            setProgram("");
            setStatus("");
            setFrom("");
            setTo("");
          }}
        >
          Xóa bộ lọc
        </Button>
        </div>
      </section>
      <section className="min-w-0 overflow-hidden rounded-xl border bg-card">
        <DataTable
          columns={columns}
          data={filtered}
          label="Lớp học"
          emptyTitle={
            initialClasses.length
              ? "Không có lớp phù hợp"
              : "Chưa có khóa học nào"
          }
          emptyDescription={
            initialClasses.length
              ? "Thử thay đổi hoặc xóa bộ lọc."
              : "Tạo lớp học đầu tiên để bắt đầu quản lý học viên."
          }
        />
      </section>
      {dialogOpen && (
        <AdminDialog
          busy={saveBusy}
          returnFocusId={editing ? `class-edit-${editing.id}` : "class-create"}
          title={editing ? "Thông tin lớp" : "Tạo lớp"}
          subtitle="Thông tin chương trình, lịch học và sĩ số của lớp."
          onClose={() => {
            if (!saveBusy) setDialogOpen(false);
          }}
        >
          <ClassForm
            key={editing?.id ?? "new"}
            course={editing}
            managers={managers}
            onSave={save}
            onCancel={() => setDialogOpen(false)}
          />
        </AdminDialog>
      )}
      <ConfirmDialog
        returnFocusId={deleting ? `class-delete-${deleting.id}` : undefined}
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Xóa lớp học?"
        description={`Bạn có chắc chắn muốn xóa lớp ${deleting?.code ?? ""}? Lớp có học viên đăng ký sẽ không thể xóa.`}
        onConfirm={() => void remove()}
        pending={deleteBusy}
      />
    </div>
  );
}
