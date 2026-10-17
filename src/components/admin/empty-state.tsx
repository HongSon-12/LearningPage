import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
export function EmptyState({
  title = "Không có dữ liệu phù hợp",
  description = "Thử thay đổi hoặc xóa bộ lọc.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
      <div className="rounded-2xl bg-muted p-4">
        <Inbox className="size-7 text-muted-foreground" aria-hidden="true" />
      </div>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
