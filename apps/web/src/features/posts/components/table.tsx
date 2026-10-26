import { Button } from "@workspace/ui/components/button";
import { PlusIcon } from "lucide-react";
import { useMemo } from "react";

import { DataTable } from "@/components/blocks/data-table.tsx";

import { createPostColumns, type Post, postColumnLabels } from "./columns.tsx";

function getPostRowId(row: Post) {
  return String(row.id);
}

interface PostsTableProps {
  data: Post[];
  onCreate: () => void;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
}

export function PostsTable({
  data,
  onCreate,
  onDelete,
  onEdit,
}: PostsTableProps) {
  const columns = useMemo(
    () => createPostColumns({ onDelete, onEdit }),
    [onDelete, onEdit]
  );

  return (
    <DataTable
      columnLabels={postColumnLabels}
      columns={columns}
      data={data}
      emptyMessage="No posts match your search."
      filterColumnId="title"
      filterPlaceholder="Search posts…"
      getRowId={getPostRowId}
      toolbarEnd={
        <Button onClick={onCreate} size="sm" type="button">
          <PlusIcon aria-hidden className="size-3.5" />
          New
        </Button>
      }
    />
  );
}
