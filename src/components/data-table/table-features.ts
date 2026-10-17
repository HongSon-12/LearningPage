import {
  tableFeatures,
  rowSortingFeature,
  rowPaginationFeature,
  columnVisibilityFeature,
  createSortedRowModel,
  createPaginatedRowModel,
  sortFns,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";

export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns,
});
export type DataColumn<T extends RowData> = ColumnDef<
  typeof dataTableFeatures,
  T
>;
