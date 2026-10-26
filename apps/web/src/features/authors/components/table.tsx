import { Button } from "@workspace/ui/components/button";
import { PlusIcon } from "lucide-react";
import { useMemo } from "react";

import { DataTable } from "@/components/blocks/data-table.tsx";

import {
  type Author,
  authorColumnLabels,
  createAuthorColumns,
} from "./columns.tsx";

function getAuthorRowId(row: Author) {
  return String(row.id);
}

interface AuthorsTableProps {
  data: Author[];
  onCreate: () => void;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
}

export function AuthorsTable({
  data,
  onCreate,
  onDelete,
  onEdit,
}: AuthorsTableProps) {
  const columns = useMemo(
    () => createAuthorColumns({ onDelete, onEdit }),
    [onDelete, onEdit]
  );

  return (
    <DataTable
      columnLabels={authorColumnLabels}
      columns={columns}
      data={data}
      emptyMessage="No authors match your search."
      filterColumnId="name"
      filterPlaceholder="Search authors…"
      getRowId={getAuthorRowId}
      toolbarEnd={
        <Button onClick={onCreate} size="sm" type="button">
          <PlusIcon aria-hidden className="size-3.5" />
          New
        </Button>
      }
    />
  );
}
