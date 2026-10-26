import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
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
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Columns3Icon,
  SearchIcon,
} from "lucide-react";
import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 50] as const;

export interface DataTableProps<TData> {
  /** Labels for the column visibility menu (fallback: column id). */
  columnLabels?: Record<string, string>;
  // createColumnHelper yields mixed TValue columns.
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous column value types
  columns: ColumnDef<TData, any>[];
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
  /** Extra controls on the right of the toolbar (after View). */
  toolbarEnd?: ReactNode;
  /** Rows across every page. */
  total: number;
}

/** Column title in the table's header style. */
export function ColumnHeader({ title }: { title: string }) {
  return (
    <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      {title}
    </span>
  );
}

function SelectRowCheckbox({
  selected,
  toggle,
}: {
  selected: boolean;
  toggle: (value: boolean) => void;
}) {
  const handleChange = useCallback(
    (checked: boolean | "indeterminate") => {
      toggle(checked === true);
    },
    [toggle]
  );

  return (
    <Checkbox
      aria-label="Select row"
      checked={selected}
      onCheckedChange={handleChange}
    />
  );
}

function SelectPageCheckbox({
  checked,
  toggleAll,
}: {
  checked: boolean | "indeterminate";
  toggleAll: (value: boolean) => void;
}) {
  const handleChange = useCallback(
    (value: boolean | "indeterminate") => {
      toggleAll(value === true);
    },
    [toggleAll]
  );

  return (
    <Checkbox
      aria-label="Select all rows on this page"
      checked={checked === true}
      indeterminate={checked === "indeterminate"}
      onCheckedChange={handleChange}
    />
  );
}

function ColumnVisibilityItem({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: (visible: boolean) => void;
}) {
  const handleChange = useCallback(
    (value: boolean | "indeterminate") => {
      onToggle(value === true);
    },
    [onToggle]
  );

  return (
    <DropdownMenuCheckboxItem checked={checked} onCheckedChange={handleChange}>
      {label}
    </DropdownMenuCheckboxItem>
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
      <span className="whitespace-nowrap text-muted-foreground">
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

/** Optional first column for row selection (page-scoped). */
export function createSelectColumn<TData>(): ColumnDef<TData, unknown> {
  return {
    cell: ({ row }) => (
      <SelectRowCheckbox
        selected={row.getIsSelected()}
        toggle={row.toggleSelected}
      />
    ),
    enableHiding: false,
    header: ({ table }) => {
      let checked: boolean | "indeterminate" = false;
      if (table.getIsAllPageRowsSelected()) {
        checked = true;
      } else if (table.getIsSomePageRowsSelected()) {
        checked = "indeterminate";
      }
      return (
        <SelectPageCheckbox
          checked={checked}
          toggleAll={table.toggleAllPageRowsSelected}
        />
      );
    },
    id: "select",
  };
}

/**
 * Reusable data table shell (from shadcn/registry data-table), adapted for the
 * app: server-driven paging and search, column visibility, page-scoped
 * selection. It never sorts or filters rows itself — that would only reorder
 * the one page it holds.
 */
export function DataTable<TData>({
  columnLabels = {},
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
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    manualPagination: true,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    rowCount: total,
    state: {
      columnVisibility,
      pagination: { pageIndex: page - 1, pageSize },
      rowSelection,
    },
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
  const selectedCount = Object.keys(rowSelection).length;

  const hideableColumns = useMemo(
    () => table.getAllColumns().filter((column) => column.getCanHide()),
    [table]
  );

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {onSearchChange ? (
          <div className="relative">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
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
          {hideableColumns.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    aria-label="Toggle columns"
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Columns3Icon aria-hidden className="size-3.5" />
                    View
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {hideableColumns.map((column) => (
                    <ColumnVisibilityItem
                      checked={column.getIsVisible()}
                      key={column.id}
                      label={columnLabels[column.id] ?? column.id}
                      onToggle={column.toggleVisibility}
                    />
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {toolbarEnd}
        </div>
      </div>

      <div className="border border-border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                className="border-border border-b bg-muted/40 hover:bg-muted/40"
                key={headerGroup.id}
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    className={cn(
                      "h-9",
                      header.column.id === "select" && "w-10 pl-4",
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
                  className="border-border border-b transition-colors duration-100 last:border-b-0 hover:bg-muted/30"
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  key={row.id}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      className={cn(
                        "py-3",
                        cell.column.id === "select" && "pl-4",
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
                  className="h-24 text-center text-muted-foreground text-sm"
                  colSpan={columns.length}
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-3 border-border border-t bg-muted/20 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">
            <span className="font-medium text-foreground tabular-nums">
              {total}
            </span>{" "}
            {total === 1 ? "result" : "results"}
            {selectedCount > 0 ? (
              <>
                {" · "}
                <span className="font-medium text-foreground tabular-nums">
                  {selectedCount}
                </span>{" "}
                selected
              </>
            ) : null}
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
              <span className="px-1 text-muted-foreground text-xs tabular-nums">
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
