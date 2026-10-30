import { Button } from "@workspace/ui/components/button";
import { PlusIcon } from "lucide-react";
import { useMemo } from "react";

import {
  DataTable,
  type DataTableProps,
} from "@/components/blocks/data-table.tsx";

import { type Author, createAuthorColumns } from "./columns.tsx";

function getAuthorRowId(row: Author) {
  return String(row.id);
}

/** Paging and search come from the route's URL search params. */
type PagingProps = Pick<
  DataTableProps<Author>,
  | "data"
  | "onPageChange"
  | "onPageSizeChange"
  | "onSearchChange"
  | "page"
  | "pageSize"
  | "search"
  | "total"
>;

interface AuthorsTableProps extends PagingProps {
  onCreate: () => void;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
}

export function AuthorsTable({
  onCreate,
  onDelete,
  onEdit,
  ...paging
}: AuthorsTableProps) {
  const columns = useMemo(
    () => createAuthorColumns({ onDelete, onEdit }),
    [onDelete, onEdit]
  );

  return (
    <DataTable
      {...paging}
      columns={columns}
      emptyMessage="No authors match your search."
      getRowId={getAuthorRowId}
      searchPlaceholder="Search authors…"
      toolbarEnd={
        <Button onClick={onCreate} size="sm" type="button">
          <PlusIcon aria-hidden className="size-3.5" />
          New
        </Button>
      }
    />
  );
}
