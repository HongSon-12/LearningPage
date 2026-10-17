import { Skeleton } from "@/components/ui/skeleton";
export default function TableLoading() {
  return (
    <div
      role="status"
      aria-label="Đang tải danh sách"
      className="space-y-4 rounded-xl border bg-card p-5"
    >
      <span className="sr-only">Đang tải danh sách…</span>
      <Skeleton className="h-11 w-64 max-w-full" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
