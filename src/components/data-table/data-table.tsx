"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
} from "lucide-react";
import { useTable } from "@tanstack/react-table";
import { dataTableFeatures, type DataColumn } from "./table-features";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/admin/empty-state";

export function DataTable<T extends { id: string }>({
  columns,
  data,
  label,
  emptyTitle,
  emptyDescription,
}: {
  columns: DataColumn<T>[];
  data: T[];
  label: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const table = useTable({
    features: dataTableFeatures,
    data,
    columns,
    getRowId: (row) => row.id,
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  });
  const page = table.state.pagination.pageIndex;
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <p role="status" className="text-sm text-muted-foreground">
          {data.length} {label.toLowerCase()}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Columns3 />
              Cột hiển thị
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Hiển thị trong bảng</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllLeafColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={(value) =>
                    column.toggleVisibility(Boolean(value))
                  }
                >
                  {(column.columnDef.meta as { label?: string } | undefined)
                    ?.label ?? column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="px-4 pb-3 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-muted-foreground md:hidden">
        Vuốt ngang để xem thêm cột.
      </p>
      <div
        role="region"
        aria-label={`Bảng ${label.toLowerCase()}, cuộn ngang để xem thêm`}
        tabIndex={0}
        className="max-w-full overflow-x-auto border-y outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Table containerClassName="overflow-visible" className="min-w-[680px]">
          <caption className="sr-only">{label}</caption>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    aria-sort={
                      header.column.getCanSort()
                        ? header.column.getIsSorted() === "asc"
                          ? "ascending"
                          : header.column.getIsSorted() === "desc"
                            ? "descending"
                            : "none"
                        : undefined
                    }
                    className={`h-12 bg-muted px-4 py-2 text-sm ${header.column.id === "actions" ? "w-px text-right sticky right-0 z-10 md:static" : ""}`}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <Button
                        variant="ghost"
                        onClick={header.column.getToggleSortingHandler()}
                        className="-ml-3 h-9 text-sm"
                      >
                        <table.FlexRender header={header} />
                        {header.column.getIsSorted() === "asc" ? (
                          <ArrowUp />
                        ) : header.column.getIsSorted() === "desc" ? (
                          <ArrowDown />
                        ) : (
                          <ArrowUpDown className="opacity-50" />
                        )}
                      </Button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={`px-4 py-3 align-middle ${cell.column.id === "actions" ? "w-px text-right [&>button]:align-middle sticky right-0 shadow-[-4px_0_6px_-6px_#64748b] md:static md:shadow-none" : ""}`}
                    >
                      {cell.column.id === "actions" ? (
                        <div className="ml-auto w-max min-w-max">
                          <table.FlexRender cell={cell} />
                        </div>
                      ) : (
                        <table.FlexRender cell={cell} />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length}>
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-muted-foreground">
        <p aria-live="polite">
          {data.length ? page * 10 + 1 : 0}–
          {Math.min((page + 1) * 10, data.length)} / {data.length}
        </p>
        <div className="flex items-center gap-2">
          <span className="mr-2 text-[length:var(--ui-caption-size,0.8125rem)] leading-5">
            Trang {page + 1} / {Math.max(1, table.getPageCount())}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Trang trước"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Trang sau"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
