import {
  type ColumnDef,
  flexRender,
  type RowData,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react";
import { type ChangeEvent, type ReactNode, useCallback } from "react";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 50] as const;

// No optional features: the server pages and searches, so the table only
// renders the rows it is handed.
const dataTableFeatures = tableFeatures({});
export type DataTableFeatures = typeof dataTableFeatures;

export interface DataTableProps<TData extends RowData> {
  // createColumnHelper yields mixed TValue columns.
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous column value types
  columns: ColumnDef<DataTableFeatures, TData, any>[];
  /** The current page's rows only — paging and search happen on the server. */
  data: TData[];
  emptyMessage?: string;
  getRowId: (row: TData) => string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  /** Omit to hide the search box. */
  onSearchChange?: (search: string) => void;
  /** 1-based. */
  page: number;
  pageSize: number;
  search?: string;
  searchPlaceholder?: string;
  /** Extra controls on the right of the toolbar. */
  toolbarEnd?: ReactNode;
  /** Rows across every page. */
  total: number;
}

/** Column title in the table's header style. */
export function ColumnHeader({ title }: { title: string }) {
  return (
    <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
      {title}
    </span>
  );
}

function PageSizeSelect({
  onPageSizeChange,
  pageSize,
}: {
  onPageSizeChange: (size: number) => void;
  pageSize: number;
}) {
  const handleValueChange = useCallback(
    (value: string | null) => {
      if (value === null) {
        return;
      }
      onPageSizeChange(Number(value));
    },
    [onPageSizeChange]
  );

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground whitespace-nowrap">
        Rows per page
      </span>
      <Select onValueChange={handleValueChange} value={String(pageSize)}>
        <SelectTrigger
          aria-label="Rows per page"
          className="min-w-16 px-2.5 tabular-nums"
          size="sm"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" alignItemWithTrigger={false}>
          {PAGE_SIZE_OPTIONS.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Reusable data table shell, adapted for the app: server-driven paging and
 * search. It never sorts or filters rows itself — that would only reorder the
 * one page it holds.
 */
export function DataTable<TData extends RowData>({
  columns,
  data,
  emptyMessage = "No results.",
  getRowId,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  page,
  pageSize,
  search = "",
  searchPlaceholder = "Search…",
  toolbarEnd,
  total,
}: DataTableProps<TData>) {
  const table = useTable({
    columns,
    data,
    features: dataTableFeatures,
    getRowId,
  });

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onSearchChange?.(event.target.value);
    },
    [onSearchChange]
  );

  const goPrevious = useCallback(() => {
    onPageChange(page - 1);
  }, [onPageChange, page]);

  const goNext = useCallback(() => {
    onPageChange(page + 1);
  }, [onPageChange, page]);

  const { rows } = table.getRowModel();
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {onSearchChange ? (
          <div className="relative">
            <SearchIcon
              aria-hidden
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
            />
            <Input
              aria-label={searchPlaceholder}
              className="h-7 w-48 pl-8 text-sm sm:w-56"
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
              type="search"
              value={search}
            />
          </div>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {toolbarEnd}
        </div>
      </div>

      <div className="border-border bg-card border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                className="border-border bg-muted/40 hover:bg-muted/40 border-b"
                key={headerGroup.id}
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    className={cn(
                      "h-9",
                      header.column.id === "actions" && "w-10 pr-4"
                    )}
                    key={header.id}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <TableRow
                  className="border-border hover:bg-muted/30 border-b transition-colors duration-100 last:border-b-0"
                  key={row.id}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell
                      className={cn(
                        "py-3",
                        cell.column.id === "actions" && "pr-4"
                      )}
                      key={cell.id}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  className="text-muted-foreground h-24 text-center text-sm"
                  colSpan={columns.length}
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="border-border bg-muted/20 flex flex-col gap-3 border-t px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">
            <span className="text-foreground font-medium tabular-nums">
              {total}
            </span>{" "}
            {total === 1 ? "result" : "results"}
          </p>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <PageSizeSelect
              onPageSizeChange={onPageSizeChange}
              pageSize={pageSize}
            />

            <div className="flex items-center gap-1.5">
              <Button
                aria-label="Previous page"
                className="size-7"
                disabled={page <= 1}
                onClick={goPrevious}
                size="icon"
                type="button"
                variant="outline"
              >
                <ChevronLeftIcon aria-hidden className="size-3.5" />
              </Button>
              <span className="text-muted-foreground px-1 text-xs tabular-nums">
                Page {page} of {pageCount}
              </span>
              <Button
                aria-label="Next page"
                className="size-7"
                disabled={page >= pageCount}
                onClick={goNext}
                size="icon"
                type="button"
                variant="outline"
              >
                <ChevronRightIcon aria-hidden className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
