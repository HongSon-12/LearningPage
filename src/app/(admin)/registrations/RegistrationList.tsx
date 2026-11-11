"use client";
import { can } from "@/lib/permissions";
import type { PermissionKey } from "@/lib/permission-catalog";
import { SelectField, SelectOption } from "@/components/forms/select-field";
import {PendingLink as Link} from "@/components/navigation/navigation-feedback";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataColumn } from "@/components/data-table/table-features";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { UserRole } from "@prisma/client";
import {
  Search,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  ArrowRightLeft,
  Save,
  ExternalLink,
  History,
  Users,
  Loader2,
} from "lucide-react";
import { programs, type ProgramType } from "@/lib/programs";
import {
  transferRegistration,
  updatePaymentStatus,
  deleteRegistration,
  updateRegistrationStatus,
  updateRegistrationCodes,
} from "@/app/actions/adminRegistration";
import RegistrationTools from "./RegistrationTools";
import type { RegistrationPage } from "@/lib/registration-page";
import { registrationFilter, type RegistrationFilter } from "@/lib/registration-filter";
import { searchRegistrationPage, registrationHistory } from "@/app/actions/registration-list";
import AdminDialog from "../components/AdminDialog";
import {
  fieldClass,
  primaryButton,
  secondaryButton,
} from "../components/AdminUI";

type RegistrationData = {
  id: string;
  classId: string;
  rejectionReason: string | null;
  confirmationNumber: string | null;
  certificateDeliveredDirect: boolean;
  certificateSentByPost: boolean;
  registrationMethod: string;
  events: { id: string; action: string; details: unknown; createdAt: Date }[];
  fullName: string;
  phone: string;
  paymentStatus: string;
  status: string;
  createdAt: Date;
  dob: Date;
  gender: string | null;
  email: string | null;
  organization: string | null;
  cccd: string | null;
  workplace: string | null;
  idPhotoUrl: string | null;
  degreeUrl: string | null;
  paymentReceiptUrl: string | null;
  invoiceCode: string | null;
  certificateCode: string | null;
  class: {
    certificateType?: string;
    courseType: string;
    courseBatch: string | null;
    code: string;
    name: string;
  };
};

type Course = {
  id: string;
  code: string;
  name: string;
  courseType: string;
  courseBatch: string | null;
  status: string;
};

const statuses = [
  { value: "", label: "Tất cả", color: "text-slate-600", icon: Users },
  {
    value: "PENDING",
    label: "Chờ duyệt",
    color: "text-amber-600",
    icon: Clock,
  },
  {
    value: "APPROVED",
    label: "Đã duyệt",
    color: "text-emerald-600",
    icon: CheckCircle,
  },
  {
    value: "REJECTED",
    label: "Từ chối",
    color: "text-rose-600",
    icon: XCircle,
  },
];
function Attachment({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-medium text-slate-600">{label}</h4>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
        >
          <div className="relative flex aspect-[16/10] items-center justify-center">
            <span className="flex flex-col items-center gap-2 text-slate-500">
              <FileText size={30} />
              <span className="text-[length:var(--ui-caption-size,0.8125rem)] leading-5">Tài liệu được bảo vệ</span>
            </span>
          </div>
          <span className="flex items-center justify-between border-t border-slate-200 bg-white px-3 py-2.5 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-medium text-blue-700">
            Tải tài liệu
            <ExternalLink size={13} />
          </span>
        </a>
      ) : (
        <div className="flex aspect-[16/10] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-400">
          Chưa có tài liệu
        </div>
      )}
    </div>
  );
}

export default function RegistrationList({
  initialPage,
  courses,
  role,
  permissions,
  mode,
  fixedClassId,
  view = "students",
}: {
  initialPage: RegistrationPage;
  courses: Course[];
  role: UserRole | null;
  permissions: PermissionKey[];
  mode: "manage" | "review";
  fixedClassId?: string;
  view?: "students" | "documents";
}) {
  const [pageData,setPageData]=useState(initialPage);
  const initialData=pageData.items;
  const [pageIndex,setPageIndex]=useState(1);
  const [sorting,setSorting]=useState({sort:"createdAt",desc:true});
  const [loading,setLoading]=useState(false);
  const [loadError,setLoadError]=useState("");
  const completedRequest=useRef({data:initialPage,key:JSON.stringify({...registrationFilter,classId:fixedClassId || "",state:mode === "review" ? "PENDING" : ""})});
  const [history,setHistory]=useState<{id:string;items:RegistrationData["events"];page:number;more:boolean;loading:boolean}>({id:"",items:[],page:1,more:false,loading:false});
  const historyRequest=useRef(0);
  async function loadHistory(id:string,page=1) {
    const request=++historyRequest.current;
    setHistory(previous=>({...previous,id,loading:true}));
    const result=await registrationHistory(id,page).catch(()=>null);
    if(request!==historyRequest.current)return;
    if(result?.success)setHistory(previous=>({id,items:page===1?result.items:[...previous.items,...result.items],page,more:result.more,loading:false}));
    else {setHistory(previous=>({...previous,loading:false}));toast.error(result?.error || "Không tải được lịch sử.");}
  }
  const [documentFilter,setDocumentFilterValue] = useState("");
  const setDocumentFilter=(value:string)=>{if(value===documentFilter && pageIndex===1)return;setLoading(true);setPageIndex(1);setDocumentFilterValue(value);};
  const [query,setQueryValue] = useState("");
  const setQuery=(value:string)=>{if(value===query && pageIndex===1)return;setLoading(true);setPageIndex(1);setQueryValue(value);};
  const [classId,setClassIdValue] = useState("");
  const setClassId=(value:string)=>{if(value===classId && pageIndex===1)return;setLoading(true);setPageIndex(1);setClassIdValue(value);};
  const [type,setTypeValue] = useState("");
  const setType=(value:string)=>{if(value===type && pageIndex===1)return;setLoading(true);setPageIndex(1);setTypeValue(value);};
  const [batch,setBatchValue] = useState("");
  const setBatch=(value:string)=>{if(value===batch && pageIndex===1)return;setLoading(true);setPageIndex(1);setBatchValue(value);};
  const [state,setStateValue] = useState(mode === "review" ? "PENDING" : "");
  const setState=(value:string)=>{if(value===state && pageIndex===1)return;setLoading(true);setPageIndex(1);setStateValue(value);};
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRow = initialData.find((reg) => reg.id === selectedId);
  const selected = selectedRow ? {...selectedRow,events:history.id === selectedId ? history.items : []} : undefined;
  const [tab, setTab] = useState("info");
  const [busy, setBusy] = useState<string | null>(null);
  const mutationLock=useRef(false);
  const [notice, setNotice] = useState<{
    text: string;
    success: boolean;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [invoice, setInvoice] = useState("");
  const [certificate, setCertificate] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [delivered, setDelivered] = useState(false);
  const [posted, setPosted] = useState(false);
  const actor = { id: "", username: "", role, permissions };
  const canManage = can(actor, "registrations.review");
  const canTransfer = can(actor, "registrations.transfer");
  const canIdentity = can(actor, "students.identity");
  const canReceipt = can(actor, "receipts.view");
  const canInvoice = can(actor, "invoices.manage");
  const canCertificate = can(actor, "certificates.manage");
  const canPay = can(actor, "payments.manage");
  useEffect(()=>{
    const input:RegistrationFilter={query,classId:fixedClassId || classId,type,batch,state:state as RegistrationFilter["state"],document:(view==="documents"?documentFilter:"") as RegistrationFilter["document"],page:pageIndex,...sorting};
    const key=JSON.stringify({...registrationFilter,...input});
    if(completedRequest.current.data===initialPage && completedRequest.current.key===key){setLoading(false);return;}
    const initialKey=JSON.stringify({...registrationFilter,classId:fixedClassId || "",state:mode === "review" ? "PENDING" : ""});
    if(completedRequest.current.data!==initialPage && key===initialKey){completedRequest.current={data:initialPage,key};setPageData(initialPage);setLoading(false);return;}
    let stale=false;
    const timer=setTimeout(async()=>{
      setLoading(true);setLoadError("");
      try {
        const result=await searchRegistrationPage(input);
        if(stale)return;
        if(result.success){completedRequest.current={data:initialPage,key};setPageData(result.data);}else setLoadError(result.error);
      } catch {if(!stale)setLoadError("Không tải được danh sách. Vui lòng thử lại.");}
      finally{if(!stale)setLoading(false);}
    },200);
    return ()=>{stale=true;clearTimeout(timer);};
  },[query,classId,type,batch,state,documentFilter,fixedClassId,view,pageIndex,sorting,initialPage,mode]);
  const visible=initialData;
  const [deleteTarget, setDeleteTarget] = useState<RegistrationData | null>(
    null,
  );
  const transferCourses = selected
    ? courses.filter(
        (course) =>
          course.id !== selected.classId &&
          course.courseType === selected.class.courseType &&
          course.status === "OPEN",
      )
    : [];
  const open = useCallback((reg: RegistrationData) => {
    ++historyRequest.current;
    setHistory({id:reg.id,items:[],page:1,more:false,loading:false});
    setSelectedId(reg.id);
    setTab(view === "documents" ? "documents" : "info");
    setNotice(null);
    setReason(reg.rejectionReason || "");
    setTarget("");
    setTransferReason("");
    setInvoice(reg.invoiceCode || "");
    setCertificate(reg.certificateCode || "");
    setConfirmation(reg.confirmationNumber || "");
    setDelivered(reg.certificateDeliveredDirect);
    setPosted(reg.certificateSentByPost);
  }, [view]);
  const perform = useCallback(
    async (
      id: string,
      operation: () => Promise<{ success: boolean; error?: string }>,
      message: string,
      close = false,
    ) => {
      if(mutationLock.current)return;mutationLock.current=true;
      setBusy(id);
      setNotice(null);
      try {
        const result = await operation();
        if (result.success) toast.success(message);
        else toast.error(result.error || "Không thể thực hiện thao tác.");
        setNotice({
          text: result.success
            ? message
            : result.error || "Không thể thực hiện thao tác.",
          success: result.success,
        });
        if (result.success) {
          if (close) setSelectedId(null);
        }
      } catch {
        toast.error("Không thể thực hiện thao tác. Vui lòng thử lại.");
        setNotice({
          text: "Không thể thực hiện thao tác. Vui lòng thử lại.",
          success: false,
        });
      } finally {
        mutationLock.current=false;setBusy(null);
      }
    },
    [],
  );
  function reset() {
    setDocumentFilter("");
    setQuery("");
    setClassId("");
    setType("");
    setBatch("");
    setState("");
  }
  const columns = useMemo<DataColumn<RegistrationData>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Học viên",
        meta: { label: "Học viên" },
        enableHiding: false,
        cell: ({ row }) => {
          const reg = row.original;
          return (
            <div className="flex min-w-48 items-start gap-3">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-bold text-blue-700"
              >
                {reg.fullName
                  .split(" ")
                  .filter(Boolean)
                  .slice(-2)
                  .map((word) => word[0])
                  .join("")
                  .toUpperCase()}
              </span>
              <div>
                <p className="font-semibold text-slate-900">{reg.fullName}</p>
                <p className="mt-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-500">
                  {view === "documents" ? reg.phone : `CCCD: ${reg.cccd || "Chưa cập nhật"}`}
                </p>
                {view !== "documents" && <p className="mt-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-400">
                  Đăng ký {new Date(reg.createdAt).toLocaleDateString("vi-VN")}
                </p>}
              </div>
            </div>
          );
        },
      },
      {
        id: "contact",
        accessorFn: (reg) => reg.phone,
        header: "Liên hệ",
        meta: { label: "Liên hệ" },
        cell: ({ row }) => (
          <div>
            <p>{row.original.phone}</p>
            {row.original.email && (
              <p className="mt-1 min-w-48 max-w-72 whitespace-normal break-words text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">
                {row.original.email}
              </p>
            )}
          </div>
        ),
      },
      ...(!fixedClassId
        ? [
            {
              id: "class",
              accessorFn: (reg: RegistrationData) => reg.class.code,
              header: "Lớp học",
              meta: { label: "Lớp học" },
              cell: ({ row }: { row: { original: RegistrationData } }) => (
                <div>
                  <span className="text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-semibold text-blue-700">
                    {row.original.class.code}
                  </span>
                  <p className="mt-1 max-w-44 whitespace-normal text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">
                    {row.original.class.name}
                  </p>
                </div>
              ),
            },
          ]
        : []),
      {
        accessorKey: "paymentStatus",
        header: "Thanh toán",
        meta: { label: "Thanh toán" },
        cell: ({ row }) => {
          const reg = row.original;
          return canPay ? (
            <SelectField
              className="min-w-48"
              aria-label={`Thanh toán ${reg.fullName}`}
              disabled={busy !== null}
              value={reg.paymentStatus}
              onValueChange={(value) =>
                void perform(
                  reg.id,
                  () =>
                    updatePaymentStatus(
                      reg.id,
                      value as "PENDING" | "PAID" | "CANCELLED",
                    ),
                  "Đã cập nhật thanh toán.",
                )
              }
            >
              <SelectOption value="PENDING">Chờ thanh toán</SelectOption>
              <SelectOption value="PAID">Đã thanh toán</SelectOption>
              <SelectOption value="CANCELLED">Đã hủy</SelectOption>
            </SelectField>
          ) : (
            <StatusBadge value={reg.paymentStatus} kind="payment" />
          );
        },
      },
      {
        accessorKey: "status",
        header: "Hồ sơ",
        meta: { label: "Hồ sơ" },
        cell: ({ row }) => {
          const reg = row.original;
          return (
            <div>
              <StatusBadge value={reg.status} />
              <p className="mt-2 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">
                {reg.registrationMethod === "LATE"
                  ? "Đăng ký vét"
                  : reg.registrationMethod === "MANUAL"
                    ? "Thủ công"
                    : "Trực tuyến"}
              </p>
              {reg.rejectionReason && (
                <p
                  title={reg.rejectionReason}
                  className="mt-1 max-w-36 truncate text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-rose-600"
                >
                  {reg.rejectionReason}
                </p>
              )}
            </div>
          );
        },
      },
      ...(view === "documents" ? [
        {id:"invoice",header:"Hóa đơn",accessorFn:(reg:RegistrationData)=>reg.invoiceCode || "",meta:{label:"Hóa đơn"},cell:({row}:{row:{original:RegistrationData}})=><span className={row.original.invoiceCode?"font-medium":"text-muted-foreground"}>{row.original.invoiceCode || "Chưa có mã"}</span>},
        {id:"certificate",header:"GCN / GXN",accessorFn:(reg:RegistrationData)=>(reg.class.certificateType === "CONFIRMATION" ? reg.confirmationNumber : reg.certificateCode) || "",meta:{label:"GCN / GXN"},cell:({row}:{row:{original:RegistrationData}})=><span className="font-medium">{(row.original.class.certificateType === "CONFIRMATION" ? row.original.confirmationNumber : row.original.certificateCode) || "Chưa có số"}</span>},
        {id:"delivery",header:"Bàn giao",accessorFn:(reg:RegistrationData)=>reg.certificateDeliveredDirect || reg.certificateSentByPost,meta:{label:"Bàn giao"},cell:({row}:{row:{original:RegistrationData}})=><span className="text-sm">{row.original.certificateDeliveredDirect?"Trực tiếp":row.original.certificateSentByPost?"Bưu điện":"Chưa gửi"}</span>},
      ] : []),
      {
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              id={`student-detail-${row.original.id}`}
              variant="action"
              size="row"
              disabled={loading || busy !== null}
              onClick={() => open(row.original)}
            >
              <Eye />
              {mode === "review" ? "Kiểm tra" : view === "documents" ? "Cập nhật" : "Chi tiết"}
            </Button>
            {can(actor,"registrations.delete") && mode === "manage" && view !== "documents" && (
              <Button
                variant="danger-outline"
                size="icon-row"
                id={`student-delete-${row.original.id}`}
                aria-label={`Xóa đăng ký ${row.original.fullName}`}
                disabled={busy !== null}
                onClick={() => setDeleteTarget(row.original)}
                className="text-destructive"
              >
                <Trash2 />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [busy, loading, canPay, fixedClassId, mode, open, perform, role, setDeleteTarget, view],
  );
  const modalTabs = [
    { id: "info", label: "Hồ sơ", icon: FileText },
    ...(mode === "manage" && canTransfer
      ? [{ id: "transfer", label: "Chuyển lớp", icon: ArrowRightLeft }]
      : []),
    ...(mode === "manage"
      ? [{ id: "documents", label: "Chứng từ", icon: Save }]
      : []),
    { id: "history", label: "Lịch sử", icon: History },
  ];

  return (
    <div className="space-y-5" aria-busy={busy!==null}>
      {busy!==null&&<p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin"/>Đang cập nhật hồ sơ, vui lòng chờ…</p>}
      {mode === "manage" && (
        <RegistrationTools
          courses={courses.filter(
            (course) => !fixedClassId || course.id === fixedClassId,
          )}
          role={role} permissions={permissions}
          classId={fixedClassId || classId}
          allowCreate={view !== "documents"}
        />
      )}
      {notice && !selected && (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${notice.success ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-rose-100 bg-rose-50 text-rose-700"}`}
        >
          {notice.text}
        </p>
      )}
      {loadError && <p role="alert" className="text-sm text-destructive">{loadError}</p>}
      {loading && <p role="status" className="text-sm text-muted-foreground">Đang tải danh sách…</p>}
      <section aria-busy={loading} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">
                {mode === "review" ? "Hồ sơ đăng ký" : view === "documents" ? "Thanh toán và chứng từ" : "Học viên"}
              </h2>
              <p className="mt-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-500">
                {mode === "review"
                  ? "Chọn Kiểm tra để đối chiếu thông tin và tài liệu."
                  : view === "documents" ? "Kế toán cập nhật học phí, hóa đơn; quản lý lớp ghi số GCN / GXN và bàn giao." : "Xem hồ sơ, duyệt đăng ký và chuyển lớp."}
              </p>
            </div>
            <button
              onClick={reset}
              className="text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-medium text-blue-600 hover:underline"
            >
              Xóa bộ lọc
            </button>
          </div>
          <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label
              className={`relative ${view === "documents" ? "sm:col-span-1 xl:col-span-3" : "sm:col-span-2 xl:col-span-4"}`}
            >
              <span className="sr-only">Tra cứu học viên</span>
              <Search
                size={17}
                className="absolute left-3 top-3 text-slate-400"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm họ tên, số điện thoại, CCCD hoặc mã hồ sơ…"
                className={`${fieldClass} pl-10`}
              />
            </label>
            {view === "documents" && <label className="space-y-2"><span className="text-sm">Lọc chứng từ</span><SelectField value={documentFilter} onValueChange={setDocumentFilter}><SelectOption value="">Tất cả chứng từ</SelectOption><SelectOption value="unpaid">Chờ thanh toán</SelectOption><SelectOption value="invoice">Chưa có hóa đơn</SelectOption><SelectOption value="certificate">Chưa có GCN / GXN</SelectOption><SelectOption value="delivery">Chưa bàn giao</SelectOption></SelectField></label>}
            {!fixedClassId && (
              <>
                <label className="space-y-1.5 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-medium text-slate-500">
                  Chương trình
                  <SelectField
                    value={type}
                    onValueChange={(value) => {
                      setType(value);
                      setClassId("");
                      setBatch("");
                    }}
                  >
                    <SelectOption value="">Tất cả chương trình</SelectOption>
                    {[
                      ...new Set(courses.map((course) => course.courseType)),
                    ].map((value) => (
                      <SelectOption key={value} value={value}>
                        {programs[value as ProgramType]?.name ||
                          "Chương trình khác"}
                      </SelectOption>
                    ))}
                  </SelectField>
                </label>
                <label className="space-y-1.5 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-medium text-slate-500">
                  Khóa
                  <SelectField
                    value={batch}
                    onValueChange={(value) => {
                      setBatch(value);
                      setClassId("");
                    }}
                  >
                    <SelectOption value="">Tất cả khóa</SelectOption>
                    {[
                      ...new Set(
                        courses
                          .filter(
                            (course) => !type || course.courseType === type,
                          )
                          .map((course) => course.courseBatch)
                          .filter(Boolean),
                      ),
                    ].map((value) => (
                      <SelectOption key={value!} value={value!}>
                        {value}
                      </SelectOption>
                    ))}
                  </SelectField>
                </label>
                <label className="space-y-1.5 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-medium text-slate-500 sm:col-span-2">
                  Lớp học
                  <SelectField
                    value={classId}
                    onValueChange={(value) => setClassId(value)}
                  >
                    <SelectOption value="">Tất cả lớp</SelectOption>
                    {courses
                      .filter(
                        (course) =>
                          (!type || course.courseType === type) &&
                          (!batch || course.courseBatch === batch),
                      )
                      .map((course) => (
                        <SelectOption key={course.id} value={course.id}>
                          {course.code} — {course.name}
                        </SelectOption>
                      ))}
                  </SelectField>
                </label>
              </>
            )}
          </div>
        </div>
        {view !== "documents" && <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
          {statuses.map((item) => {
            const Icon = item.icon;
            const count = pageData.summary[item.value] || 0;
            return (
              <button
                key={item.value}
                aria-pressed={state === item.value}
                onClick={() => setState(item.value)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-semibold transition ${state === item.value ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"}`}
              >
                <Icon
                  size={14}
                  className={state === item.value ? "" : item.color}
                />
                {item.label}
                <span className="rounded-full bg-white px-1.5 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-500">
                  {count}
                </span>
              </button>
            );
          })}
        </div>}
        <DataTable
          columns={columns.filter(column => {
            const id="id" in column && column.id ? column.id : "accessorKey" in column ? String(column.accessorKey) : "";
            return view === "documents" ? !["contact","status"].includes(id) : !(fixedClassId && id === "paymentStatus");
          })}
          server={{page:pageData.page,pages:pageData.pages,total:pageData.total,...sorting,pending:loading,onPage:setPageIndex,onSort:(sort,desc)=>{setPageIndex(1);setSorting({sort,desc});}}}
          data={visible}
          label="Hồ sơ"
          emptyTitle="Không có hồ sơ phù hợp"
          emptyDescription="Thử chọn trạng thái khác hoặc thay đổi bộ lọc."
        />
        <footer className="px-5 pb-3 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground">
          {pageData.scopeTotal} hồ sơ trong phạm vi quản lý.
        </footer>
      </section>

      {selected && (
        <AdminDialog
          busy={busy !== null}
          returnFocusId={`student-detail-${selected.id}`}
          title={selected.fullName}
          subtitle={`${selected.class.code} · ${selected.class.name}`}
          onClose={() => {
            if (!busy) setSelectedId(null);
          }}
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StatusBadge value={selected.status} />
              <span className="text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-500">
                Đăng ký ngày{" "}
                {new Date(selected.createdAt).toLocaleDateString("vi-VN")}
              </span>
            </div>
            <nav
              aria-label="Chi tiết học viên"
              className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1"
            >
              {modalTabs.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    aria-pressed={tab === item.id}
                    onClick={() => {setTab(item.id);if(item.id === "history" && selected)void loadHistory(selected.id);}}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-semibold transition ${tab === item.id ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    <Icon size={15} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            {notice && (
              <p
                role="status"
                className={`rounded-xl px-4 py-3 text-sm ${notice.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
              >
                {notice.text}
              </p>
            )}
            {tab === "info" && (
              <div className="space-y-6">
                <section>
                  <h3 className="mb-4 text-sm font-semibold text-slate-900">
                    Thông tin cá nhân
                  </h3>
                  <dl className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      ["Họ và tên", selected.fullName],
                      [
                        "Ngày sinh",
                        new Date(selected.dob).toLocaleDateString("vi-VN"),
                      ],
                      [
                        "Giới tính",
                        selected.gender === "FEMALE"
                          ? "Nữ"
                          : selected.gender === "MALE"
                            ? "Nam"
                            : "Khác",
                      ],
                      ["Số CCCD", selected.cccd],
                      ["Số điện thoại", selected.phone],
                      ["Email", selected.email],
                      [
                        "Đơn vị công tác",
                        selected.workplace || selected.organization,
                      ],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-500">{label}</dt>
                        <dd className="mt-1 break-words text-sm font-medium text-slate-800">
                          {value || "Chưa cung cấp"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
                <section>
                  <h3 className="mb-4 text-sm font-semibold text-slate-900">
                    Tài liệu đính kèm
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {canIdentity && (
                      <Attachment
                        label="Hồ sơ CCCD"
                        url={selected.idPhotoUrl}
                      />
                    )}
                    {canIdentity && (
                      <Attachment
                        label={
                          selected.class.courseType === "AMBULANCE_DRIVER"
                            ? "Bằng lái xe"
                            : "Văn bằng chuyên môn"
                        }
                        url={selected.degreeUrl}
                      />
                    )}
                    {canReceipt && <Attachment
                      label="Biên lai thanh toán"
                      url={selected.paymentReceiptUrl}
                    />}
                  </div>
                </section>
                <section className="space-y-4 rounded-xl border border-slate-200 p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Kết quả kiểm tra hồ sơ
                    </h3>
                    <p className="mt-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-500">
                      Đối chiếu thông tin và tài liệu trước khi duyệt. Ghi rõ lý
                      do nếu hồ sơ không phù hợp.
                    </p>
                  </div>
                  {canManage ? (
                    <>
                      <label className="block space-y-2 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-medium text-slate-600">
                        Lý do từ chối
                        <Textarea
                          rows={2}
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                          placeholder="Nhập lý do nếu từ chối hồ sơ…"
                          className={fieldClass}
                        />
                      </label>
                      <div className="flex flex-wrap gap-3">
                        <button
                          disabled={
                            busy !== null || selected.status === "APPROVED"
                          }
                          onClick={() =>
                            void perform(
                              selected.id,
                              () =>
                                updateRegistrationStatus(
                                  selected.id,
                                  "APPROVED",
                                ),
                              "Đã duyệt hồ sơ.",
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle size={16} />
                          Duyệt hồ sơ
                        </button>
                        <button
                          disabled={
                            busy !== null ||
                            selected.status === "REJECTED" ||
                            !reason.trim()
                          }
                          onClick={() =>
                            void perform(
                              selected.id,
                              () =>
                                updateRegistrationStatus(
                                  selected.id,
                                  "REJECTED",
                                  reason,
                                ),
                              "Đã từ chối hồ sơ.",
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                        >
                          <XCircle size={16} />
                          Từ chối
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-500">
                      Tài khoản kế toán có thể xem hồ sơ. Việc duyệt do Quản trị
                      hoặc Quản lý lớp thực hiện.
                    </p>
                  )}
                  {selected.rejectionReason && (
                    <p className="text-sm text-rose-700">
                      Lý do đã ghi nhận: {selected.rejectionReason}
                    </p>
                  )}
                </section>
                {mode === "review" && (
                  <Link
                    href={`/courses/${selected.classId}`}
                    className={secondaryButton}
                  >
                    <Users size={16} />
                    Quản lý học viên của lớp {selected.class.code}
                  </Link>
                )}
              </div>
            )}
            {tab === "transfer" && mode === "manage" && canTransfer && (
              <section className="space-y-5">
                <div className="rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                  Hồ sơ và trạng thái được giữ nguyên khi chuyển. Lớp đích cần
                  cùng chương trình, cùng học phí và còn chỗ; học viên chưa được
                  phát hành chứng từ.
                </div>
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  Lớp chuyển đến
                  <SelectField
                    value={target}
                    onValueChange={(value) => setTarget(value)}
                  >
                    <SelectOption value="">Chọn lớp đích</SelectOption>
                    {transferCourses.map((course) => (
                      <SelectOption key={course.id} value={course.id}>
                        {course.code} — {course.name}
                      </SelectOption>
                    ))}
                  </SelectField>
                </label>
                {transferCourses.length === 0 && (
                  <p className="text-sm text-amber-700">
                    Hiện chưa có lớp đang mở khác trong phạm vi quản lý.
                  </p>
                )}
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  Lý do chuyển lớp
                  <Textarea
                    rows={3}
                    value={transferReason}
                    onChange={(event) => setTransferReason(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                <div className="flex justify-end">
                  <button
                    disabled={
                      busy !== null || !target || !transferReason.trim()
                    }
                    onClick={() =>
                      void perform(
                        selected.id,
                        () =>
                          transferRegistration(
                            selected.id,
                            target,
                            transferReason,
                          ),
                        "Đã chuyển học viên sang lớp mới.",
                        true,
                      )
                    }
                    className={primaryButton}
                  >
                    <ArrowRightLeft size={16} />
                    Chuyển lớp
                  </button>
                </div>
              </section>
            )}
            {tab === "documents" && mode === "manage" && (
              <section className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    Mã hóa đơn điện tử
                    <input
                      disabled={!canInvoice}
                      value={invoice}
                      onChange={(event) => setInvoice(event.target.value)}
                      className={fieldClass}
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    Số GCN / Chứng chỉ
                    <input
                      disabled={!canCertificate}
                      value={certificate}
                      onChange={(event) => setCertificate(event.target.value)}
                      className={fieldClass}
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    Số GXN
                    <input
                      disabled={!canCertificate}
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      className={fieldClass}
                    />
                  </label>
                </div>
                <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <legend className="px-2 text-sm font-semibold text-slate-700">
                    Tình trạng gửi giấy chứng nhận
                  </legend>
                  <label className="flex items-center gap-3 text-sm text-slate-600">
                    <input
                      disabled={!canCertificate}
                      type="checkbox"
                      checked={delivered}
                      onChange={(event) => setDelivered(event.target.checked)}
                      className="h-4 w-4 accent-blue-600"
                    />
                    Đã gửi GCN trực tiếp
                  </label>
                  <label className="flex items-center gap-3 text-sm text-slate-600">
                    <input
                      disabled={!canCertificate}
                      type="checkbox"
                      checked={posted}
                      onChange={(event) => setPosted(event.target.checked)}
                      className="h-4 w-4 accent-blue-600"
                    />
                    Đã gửi GCN qua bưu điện
                  </label>
                </fieldset>
                <div className="flex justify-end">
                  <button
                    aria-busy={busy === selected.id} disabled={busy !== null || (!canInvoice && !canCertificate)}
                    onClick={() =>
                      void perform(
                        selected.id,
                        () =>
                          updateRegistrationCodes(
                            selected.id,
                            invoice,
                            certificate,
                            confirmation,
                            delivered,
                            posted,
                          ),
                        "Đã lưu thông tin chứng từ.",
                      )
                    }
                    className={primaryButton}
                  >
                    {busy ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Lưu chứng từ
                  </button>
                </div>
              </section>
            )}
            {tab === "history" && (
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Lịch sử thay đổi hồ sơ
                </h3>
                {history.loading && <p role="status">Đang tải lịch sử…</p>}
                {history.more && <Button variant="outline" loading={history.loading} onClick={()=>void loadHistory(selected.id,history.page+1)}>Xem thêm lịch sử</Button>}
                {selected.events.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
                    Chưa có thay đổi được ghi nhận.
                  </p>
                ) : (
                  <ol className="space-y-4 border-l border-slate-200 pl-5">
                    {selected.events.map((event) => {
                      const details = event.details as {
                        from?: string;
                        to?: string;
                        reason?: string;
                      };
                      return (
                        <li
                          key={event.id}
                          className="relative rounded-xl border border-slate-100 p-4"
                        >
                          <span className="absolute -left-[25px] top-5 h-2 w-2 rounded-full bg-blue-400 ring-4 ring-white" />
                          <p className="text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-500">
                            {new Date(event.createdAt).toLocaleString("vi-VN")}
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {(
                              {
                                TRANSFER: "Chuyển lớp",
                                STATUS: "Cập nhật duyệt hồ sơ",
                                PAYMENT: "Cập nhật thanh toán",
                                DOCUMENTS: "Cập nhật chứng từ",
                                IMPORT: "Nhập Excel",
                                CREATE: "Thêm học viên",
                              } as Record<string, string>
                            )[event.action] || "Cập nhật hồ sơ"}
                          </p>
                          {event.action === "TRANSFER" && (
                            <p className="mt-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-600">
                              {details.from} → {details.to}
                            </p>
                          )}
                          {details.reason && (
                            <p className="mt-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-500">
                              {details.reason}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            )}
          </div>
        </AdminDialog>
      )}
      <ConfirmDialog
        returnFocusId={
          deleteTarget ? `student-delete-${deleteTarget.id}` : undefined
        }
        open={Boolean(deleteTarget)}
        onOpenChange={(value) => {
          if (!value) setDeleteTarget(null);
        }}
        title="Xóa lượt đăng ký?"
        description={`Xóa hồ sơ của ${deleteTarget?.fullName || "học viên"}? Dữ liệu không thể khôi phục.`}
        pending={busy !== null}
        onConfirm={() => {
          if (deleteTarget)
            void perform(
              deleteTarget.id,
              () => deleteRegistration(deleteTarget.id),
              "Đã xóa lượt đăng ký.",
            ).then(() => setDeleteTarget(null));
        }}
      />
    </div>
  );
}
