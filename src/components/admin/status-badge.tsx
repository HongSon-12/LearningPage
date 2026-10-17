import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statuses: Record<string, { label: string; color: string }> = {
  APPROVED: {
    label: "Đã duyệt",
    color: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  REJECTED: {
    label: "Từ chối",
    color: "border-rose-200 bg-rose-50 text-rose-800",
  },
  OPEN: {
    label: "Đang mở",
    color: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  FULL: { label: "Đã đầy", color: "border-rose-200 bg-rose-50 text-rose-800" },
  DONE: {
    label: "Đã kết thúc",
    color: "border-slate-200 bg-slate-100 text-slate-700",
  },
  PAID: {
    label: "Đã thanh toán",
    color: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  CANCELLED: {
    label: "Đã hủy",
    color: "border-slate-200 bg-slate-100 text-slate-700",
  },
};
export function StatusBadge({
  value,
  kind = "registration",
}: {
  value: string;
  kind?: "registration" | "payment" | "class";
}) {
  const status = statuses[value] ?? {
    label:
      value === "PENDING"
        ? kind === "payment"
          ? "Chờ thanh toán"
          : "Chờ duyệt"
        : value,
    color: "border-amber-200 bg-amber-50 text-amber-800",
  };
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 whitespace-nowrap py-1", status.color)}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {status.label}
    </Badge>
  );
}
