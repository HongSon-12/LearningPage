import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
export function FilterBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="search"
      aria-label="Bộ lọc danh sách"
      className={cn(
        "flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
