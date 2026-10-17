"use client";
import { ControlledSelectField } from "@/components/forms/controlled-fields";
import { SelectField, SelectOption } from "@/components/forms/select-field";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { Plus, Pencil, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { assignManager, saveUser } from "@/app/actions/users";
import {
  roleLabels,
  roleDescriptions,
  userInput,
  type UserInput,
} from "@/lib/user-input";
import AdminDialog from "../components/AdminDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import type { DataColumn } from "@/components/data-table/table-features";

type User = { id: string; username: string; role: UserRole; active: boolean };
type Course = {
  id: string;
  code: string;
  name: string;
  managerId: string | null;
};
function AccountEditor({
  user,
  self,
  onDone,
  onCancel,
}: {
  user: User | null;
  self: boolean;
  onDone: (signInAgain: boolean) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserInput>({
    resolver: zodResolver(userInput),
    defaultValues: {
      id: user?.id || "",
      username: user?.username || "",
      password: "",
      role: user?.role || "CLASS_MANAGER",
      active: user?.active ?? true,
    },
  });
  const role = useWatch({ control, name: "role" });
  async function submit(values: UserInput) {
    const form = new FormData();
    for (const [key, value] of Object.entries(values))
      form.set(key, typeof value === "boolean" ? (value ? "on" : "") : value);
    try {
      const result = await saveUser(form);
      if (!result.success) {
        setError("root", { message: result.error });
        return;
      }
      toast.success("Đã lưu tài khoản.");
      onDone(Boolean(result.signInAgain));
    } catch {
      setError("root", {
        message: "Không thể lưu tài khoản. Vui lòng thử lại.",
      });
    }
  }
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5">
      <input type="hidden" {...register("id")} />
      {errors.root && (
        <p role="alert" className="text-sm text-destructive">
          {errors.root.message}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="account-name">Tên đăng nhập</Label>
          <Input
            id="account-name"
            autoComplete="off"
            {...register("username")}
          />
          {errors.username && (
            <p role="alert" className="text-sm text-destructive">
              {errors.username.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="account-password">
            {user ? "Mật khẩu mới" : "Mật khẩu"}
          </Label>
          <Input
            id="account-password"
            type="password"
            autoComplete="new-password"
            {...register("password")}
          />
          <p className="text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">
            {user ? "Để trống để giữ mật khẩu. " : ""}Ít nhất 10 ký tự; tối đa
            72 byte.
          </p>
          {errors.password && (
            <p role="alert" className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="account-role">Vai trò</Label>
          <ControlledSelectField
            id="account-role"
            name="role"
            control={control}
            disabled={self}
          >
            {Object.entries(roleLabels).map(([value, label]) => (
              <SelectOption key={value} value={value}>
                {label}
              </SelectOption>
            ))}
          </ControlledSelectField>
        </div>
        <Label className="flex items-center gap-3 rounded-lg border p-4">
          <input
            type="checkbox"
            {...register("active")}
            disabled={self}
            className="size-4"
          />
          Cho phép đăng nhập
        </Label>
      </div>
      <p className="rounded-lg bg-muted p-4 text-sm leading-6">
        {roleDescriptions[role]}
      </p>
      <p className="text-sm text-muted-foreground">
        {self
          ? "Bạn đang sửa tài khoản của mình và sẽ cần đăng nhập lại sau khi lưu. Không thể tự khóa hay hạ quyền."
          : user
            ? "Lưu thay đổi sẽ đăng xuất các phiên hiện tại của tài khoản này. Nếu đang phụ trách lớp, cần gỡ hoặc chuyển phân công trước khi khóa hay đổi vai trò."
            : "Tài khoản mới sử dụng vai trò được chọn. Phân công lớp ở mục bên cạnh sau khi tạo."}
      </p>
      <footer className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Hủy
        </Button>
        <Button disabled={isSubmitting}>
          {isSubmitting ? "Đang lưu…" : "Lưu tài khoản"}
        </Button>
      </footer>
    </form>
  );
}
export default function UsersForm({
  users,
  courses,
  currentUserId,
}: {
  users: User[];
  courses: Course[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<User | null | undefined>();
  const [tab, setTab] = useState<"users" | "assignments">("users");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const managers = users.filter(
    (user) => user.role === "CLASS_MANAGER" && user.active,
  );
  const visibleUsers = users.filter(
    (user) =>
      (!roleFilter || user.role === roleFilter) &&
      (!status || (status === "active" ? user.active : !user.active)) &&
      user.username.toLowerCase().includes(query.toLowerCase()),
  );
  const visibleCourses = courses.filter((course) =>
    `${course.code} ${course.name}`.toLowerCase().includes(query.toLowerCase()),
  );
  const columns = useMemo<DataColumn<User>[]>(
    () => [
      {
        accessorKey: "username",
        header: "Tên đăng nhập",
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.username}
            {row.original.id === currentUserId && (
              <Badge variant="outline" className="ml-2">
                Bạn
              </Badge>
            )}
          </span>
        ),
      },
      {
        accessorKey: "role",
        header: "Vai trò",
        cell: ({ row }) => (
          <Badge variant="secondary">{roleLabels[row.original.role]}</Badge>
        ),
      },
      {
        id: "active",
        accessorFn: (user) => (user.active ? "Đang hoạt động" : "Đã khóa"),
        header: "Trạng thái",
      },
      {
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            id={`user-edit-${row.original.id}`}
            variant="action"
            size="row"
            onClick={() => setEditor(row.original)}
          >
            <Pencil />
            Chỉnh sửa
          </Button>
        ),
      },
    ],
    [currentUserId],
  );
  async function assign(classId: string, managerId: string) {
    setBusy(true);
    try {
      const result = await assignManager(classId, managerId);
      if (result.success) {
        toast.success("Đã cập nhật phân công lớp.");
        router.refresh();
      } else toast.error(result.error);
    } catch {
      toast.error("Không thể phân công. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }
  const assignmentColumns: DataColumn<Course>[] = [
    { accessorKey: "code", header: "Mã lớp" },
    { accessorKey: "name", header: "Tên lớp" },
    {
      id: "manager",
      header: "Quản lý lớp",
      enableSorting: false,
      cell: ({ row }) => {
        const course = row.original;
        const manager = users.find((user) => user.id === course.managerId);
        return (
          <SelectField
            aria-label={`Quản lý ${course.code}`}
            value={course.managerId || ""}
            disabled={busy}
            onValueChange={(value) => void assign(course.id, value)}
          >
            <SelectOption value="">Chưa phân công</SelectOption>
            {manager && !managers.some((user) => user.id === manager.id) && (
              <SelectOption value={manager.id} disabled>
                {manager.username} (không còn khả dụng)
              </SelectOption>
            )}
            {managers.map((user) => (
              <SelectOption key={user.id} value={user.id}>
                {user.username}
              </SelectOption>
            ))}
          </SelectField>
        );
      },
    },
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-3 lg:grid-cols-3">
        {Object.entries(roleLabels).map(([role, label]) => (
          <article
            key={role}
            className="space-y-2 rounded-xl border bg-card p-4"
          >
            <h2 className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="size-4" />
              {label}
              <Badge variant="outline">
                {users.filter((user) => user.role === role).length}
              </Badge>
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {roleDescriptions[role as UserRole]}
            </p>
          </article>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={tab === "users" ? "default" : "outline"}
          aria-pressed={tab === "users"}
          onClick={() => {
            setTab("users");
            setQuery("");
          }}
        >
          Tài khoản
        </Button>
        <Button
          variant={tab === "assignments" ? "default" : "outline"}
          aria-pressed={tab === "assignments"}
          onClick={() => {
            setTab("assignments");
            setQuery("");
          }}
        >
          Phân công lớp
        </Button>
        <Button
          id="user-create"
          className="sm:ml-auto"
          onClick={() => setEditor(null)}
        >
          <Plus />
          Thêm tài khoản
        </Button>
      </div>
      <section className="space-y-4 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="min-w-44 flex-1 space-y-2">
            <Label htmlFor="users-query">Tìm kiếm</Label>
            <Input
              id="users-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                tab === "users" ? "Tìm tên đăng nhập…" : "Mã lớp hoặc tên lớp…"
              }
            />
          </div>
          {tab === "users" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="users-role">Lọc vai trò</Label>
                <SelectField
                  id="users-role"
                  value={roleFilter}
                  onValueChange={(value) => setRoleFilter(value)}
                >
                  <SelectOption value="">Tất cả vai trò</SelectOption>
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <SelectOption key={value} value={value}>
                      {label}
                    </SelectOption>
                  ))}
                </SelectField>
              </div>
              <div className="space-y-2">
                <Label htmlFor="users-status">Lọc trạng thái tài khoản</Label>
                <SelectField
                  id="users-status"
                  value={status}
                  onValueChange={(value) => setStatus(value)}
                >
                  <SelectOption value="">Tất cả trạng thái</SelectOption>
                  <SelectOption value="active">Đang hoạt động</SelectOption>
                  <SelectOption value="locked">Đã khóa</SelectOption>
                </SelectField>
              </div>
            </>
          )}
        </div>
        {tab === "users" ? (
          <DataTable
            columns={columns}
            data={visibleUsers}
            label="Tài khoản"
            emptyTitle="Không có tài khoản phù hợp"
            emptyDescription="Thay đổi bộ lọc hoặc thêm tài khoản."
          />
        ) : (
          <DataTable
            columns={assignmentColumns}
            data={visibleCourses}
            label="Phân công lớp"
            emptyTitle="Không có lớp phù hợp"
            emptyDescription="Thử thay đổi điều kiện tìm kiếm."
          />
        )}
      </section>
      {editor !== undefined && (
        <AdminDialog
          returnFocusId={editor ? `user-edit-${editor.id}` : "user-create"}
          title={editor ? "Cập nhật tài khoản" : "Thêm tài khoản"}
          subtitle="Thiết lập đăng nhập, vai trò và trạng thái tài khoản."
          onClose={() => setEditor(undefined)}
        >
          <AccountEditor
            user={editor}
            self={editor?.id === currentUserId}
            onCancel={() => setEditor(undefined)}
            onDone={(signInAgain) => {
              setEditor(undefined);
              if (signInAgain) router.replace("/login");
              else router.refresh();
            }}
          />
        </AdminDialog>
      )}
    </div>
  );
}
