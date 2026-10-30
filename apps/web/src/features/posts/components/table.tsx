import { Button } from "@workspace/ui/components/button";
import { PlusIcon } from "lucide-react";
import { useMemo } from "react";

import {
  DataTable,
  type DataTableProps,
} from "@/components/blocks/data-table.tsx";

import { createPostColumns, type Post } from "./columns.tsx";

function getPostRowId(row: Post) {
  return String(row.id);
}

/** Paging and search come from the route's URL search params. */
type PagingProps = Pick<
  DataTableProps<Post>,
  | "data"
  | "onPageChange"
  | "onPageSizeChange"
  | "onSearchChange"
  | "page"
  | "pageSize"
  | "search"
  | "total"
>;

interface PostsTableProps extends PagingProps {
  onCreate: () => void;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
}

export function PostsTable({
  onCreate,
  onDelete,
  onEdit,
  ...paging
}: PostsTableProps) {
  const columns = useMemo(
    () => createPostColumns({ onDelete, onEdit }),
    [onDelete, onEdit]
  );

  return (
    <DataTable
      {...paging}
      columns={columns}
      emptyMessage="No posts match your search."
      getRowId={getPostRowId}
      searchPlaceholder="Search posts…"
      toolbarEnd={
        <Button onClick={onCreate} size="sm" type="button">
          <PlusIcon aria-hidden className="size-3.5" />
          New
        </Button>
      }
    />
  );
}
