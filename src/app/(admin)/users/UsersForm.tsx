"use client";
import { SelectField, SelectOption } from "@/components/forms/select-field";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveUser } from "@/app/actions/users";
import {
  roleLabels,
  roleDescriptions,
  userInput, ssoUserEditorInput,
  type UserInput,
} from "@/lib/user-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type User = { id: string; username: string; role: UserRole; active: boolean; email?: string|null; customRoleId?:string|null; ssoUserId?:string|null; ssoActive?:boolean; appAccessGranted?:boolean };
type CustomRole={id:string;name:string;baseRole:UserRole};
function AccountEditor({
  user,
  customRoles,
  self,
  ssoMode,
  onDone,
  onCancel,
  onBusyChange,
}: {
  user: User | null;
  customRoles:CustomRole[];
  self: boolean;
  ssoMode: boolean;
  onDone: (signInAgain: boolean, saved: User) => void;
  onBusyChange: (busy: boolean) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    setError,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserInput>({
    resolver: zodResolver(ssoMode ? ssoUserEditorInput : userInput),
    defaultValues: {
      id: user?.id || "",
      username: user?.username || "",
      email: user?.email || "",
      customRoleId: user?.customRoleId || "",
      password: "",
      role: user?.role || "CLASS_MANAGER",
      active: ssoMode ? user?.appAccessGranted ?? false : user?.active ?? true,
    },
  });
  const role = useWatch({ control, name: "role" });
  const customRoleId=useWatch({control,name:"customRoleId"});
  async function submit(values: UserInput) {
    onBusyChange(true);
    const form = new FormData();
    for (const [key, value] of Object.entries(values))
      form.set(key, typeof value === "boolean" ? (value ? "on" : "") : value ?? "");
    try {
      const result = await saveUser(form);
      if (!result.success) {
        setError("root", { message: result.error });
        return;
      }
      toast.success("Đã lưu tài khoản.");
      reset({...values,password:""});
      onDone(Boolean(result.signInAgain), {id:result.id,username:values.username,role:values.role,active:ssoMode ? values.active && Boolean(user?.ssoActive) : values.active,email:values.email,customRoleId:values.customRoleId,...(ssoMode ? {ssoUserId:user?.ssoUserId,ssoActive:user?.ssoActive,appAccessGranted:values.active}:{})});
    } catch {
      setError("root", {
        message: "Không thể lưu tài khoản. Vui lòng thử lại.",
      });
    } finally { onBusyChange(false); }
  }
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5"><fieldset disabled={isSubmitting} className="min-w-0 space-y-5">
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
            readOnly={ssoMode}
            {...register("username")}
          />
          {errors.username && (
            <p role="alert" className="text-sm text-destructive">
              {errors.username.message}
            </p>
          )}
        </div>
        {!ssoMode && <div className="space-y-2">
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
        </div>}
        <div className="space-y-2">
          <Label htmlFor="account-role">Vai trò</Label>
          <SelectField id="account-role" disabled={self} value={customRoleId ? `custom:${customRoleId}` : role} onValueChange={value=>{
            const custom=customRoles.find(item=>`custom:${item.id}`===value);
            setValue("role",custom?.baseRole || value as UserRole);setValue("customRoleId",custom?.id || "");
          }}>
            {Object.entries(roleLabels).map(([value,label])=><SelectOption key={value} value={value}>{label}</SelectOption>)}
            {customRoles.map(item=><SelectOption key={item.id} value={`custom:${item.id}`}>{item.name}</SelectOption>)}
          </SelectField>
        </div>
        <div className="space-y-2"><Label htmlFor="account-email">{ssoMode ? "Email từ SSO" : "Email khôi phục"}</Label><Input id="account-email" type="email" autoComplete="email" readOnly={ssoMode} {...register("email")} /><p className="text-sm text-muted-foreground">{ssoMode ? "Tên đăng nhập và email chỉ cập nhật tại SSO." : "Dùng để nhận mã khi quên mật khẩu."}</p>{errors.email && <p role="alert" className="text-sm text-destructive">{errors.email.message}</p>}</div>
        <Label className="flex items-center gap-3 rounded-lg border p-4">
          <input
            type="checkbox"
            {...register("active")}
            disabled={self}
            className="size-4"
          />
          {ssoMode ? "Cấp quyền truy cập edu" : "Cho phép đăng nhập"}
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
            : "Tài khoản mới sử dụng vai trò được chọn. Phân công người phụ trách ở mục Lớp học."}
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
        <Button disabled={ssoMode && !user?.ssoUserId} loading={isSubmitting}>
          {isSubmitting ? "Đang lưu…" : "Lưu"}
        </Button>
      </footer>
    </fieldset></form>
  );
}
export default function UsersForm({ users, currentUserId, customRoles, ssoMode=false }: { users: User[]; currentUserId: string; customRoles:CustomRole[]; ssoMode?:boolean }) {
  const router = useRouter();
  const [editor, setEditor] = useState<User | null>((ssoMode ? users.find(user=>user.ssoUserId) : users[0]) || null);
  const [revision,setRevision] = useState(0);
  const [busy,setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [status, setStatus] = useState("");
  const selected = users.find(user=>user.id === editor?.id) || editor;
  const visibleUsers = users.filter(user => (!roleFilter || user.role === roleFilter) && (!status || (status === "active" ? user.active : !user.active)) && user.username.toLowerCase().includes(query.toLowerCase()));
  return <div className="grid items-start gap-5 lg:grid-cols-[minmax(250px,3fr)_minmax(0,7fr)]" data-slot="master-detail">
    <aside className="min-w-0 space-y-4 rounded-xl border bg-card p-4 lg:sticky lg:top-0" aria-label="Chọn tài khoản" data-slot="master-pane">
      <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Tài khoản <span className="text-sm font-normal text-muted-foreground">({users.length})</span></h2>{!ssoMode && <Button id="user-create" aria-label="Thêm tài khoản" disabled={busy} onClick={()=>{setEditor(null);setRevision(value=>value+1);}}><Plus />Thêm</Button>}</div>
      <div className="space-y-2"><Label htmlFor="users-query">Tìm kiếm</Label><Input id="users-query" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Tên đăng nhập…" /></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="users-role">Lọc vai trò</Label><SelectField id="users-role" value={roleFilter} onValueChange={setRoleFilter}><SelectOption value="">Tất cả</SelectOption>{Object.entries(roleLabels).map(([value,label])=><SelectOption key={value} value={value}>{label}</SelectOption>)}</SelectField></div>
        <div className="space-y-2"><Label htmlFor="users-status">Trạng thái</Label><SelectField id="users-status" value={status} onValueChange={setStatus}><SelectOption value="">Tất cả</SelectOption><SelectOption value="active">Hoạt động</SelectOption><SelectOption value="locked">Đã khóa</SelectOption></SelectField></div>
      </div>
      <p role="status" className="text-xs text-muted-foreground">{visibleUsers.length} tài khoản phù hợp</p>
      <div className="max-h-[50vh] space-y-2 overflow-y-auto" aria-label="Danh sách tài khoản">{visibleUsers.map(user=><button key={user.id} id={`user-edit-${user.id}`} type="button" aria-label={`Chọn tài khoản ${user.username}`} aria-pressed={editor?.id===user.id} disabled={busy} onClick={()=>setEditor(user)} className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 ${editor?.id===user.id?"border-blue-300 bg-blue-50":"border-border hover:bg-muted"}`}>
        <UserRound className="mt-0.5 size-5 shrink-0 text-blue-600" /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 font-medium"><span className="break-all">{user.username}</span>{user.id===currentUserId && <Badge variant="outline">Bạn</Badge>}</span><span className="mt-1 block text-xs text-muted-foreground">{customRoles.find(item=>item.id===user.customRoleId)?.name || roleLabels[user.role]} · {ssoMode ? !user.ssoUserId ? "Tài khoản cục bộ" : !user.ssoActive ? "SSO đã khóa" : !user.appAccessGranted ? "Chờ cấp quyền" : "Đang hoạt động" : user.active?"Đang hoạt động":"Đã khóa"}</span></span>
      </button>)}{!visibleUsers.length && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Không có tài khoản phù hợp.</p>}</div>
    </aside>
    <section aria-label="Thông tin tài khoản" className="min-w-0 rounded-xl border bg-card p-5 sm:p-6" data-slot="detail-pane">
      <div className="mb-5 border-b pb-4"><h2 className="text-lg font-semibold">{selected?selected.username:"Thêm tài khoản"}</h2><p className="mt-1 text-sm text-muted-foreground">{ssoMode ? "Phân vai trò và quyền truy cập. Tài khoản chỉ hoạt động khi SSO cũng đang active." : "Thiết lập đăng nhập, vai trò và trạng thái tài khoản."}</p></div>
      <AccountEditor ssoMode={ssoMode} customRoles={customRoles} key={`${selected?.id || "new"}-${revision}`} user={selected} self={selected?.id===currentUserId} onBusyChange={setBusy} onCancel={()=>{setEditor(selected ? users.find(user=>user.id===selected.id) || users[0] || null : users[0] || null);setRevision(value=>value+1);}} onDone={(signInAgain,saved)=>{setEditor(saved);if(signInAgain) router.replace("/login");else router.refresh();}} />
    </section>
  </div>;
}
