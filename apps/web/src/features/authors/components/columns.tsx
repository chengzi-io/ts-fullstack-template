import type { ColumnDef } from "@tanstack/react-table";
import type { RouterOutputs } from "@workspace/api";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useCallback } from "react";

import {
  ColumnHeader,
  createSelectColumn,
} from "@/components/blocks/data-table.tsx";

export type Author = RouterOutputs["authors"]["list"]["items"][number];

export const authorColumnLabels: Record<string, string> = {
  createdAt: "Created",
  id: "ID",
  name: "Name",
};

function AuthorRowActions({
  id,
  name,
  onDelete,
  onEdit,
}: {
  id: number;
  name: string;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
}) {
  const handleEdit = useCallback(() => {
    onEdit(id);
  }, [id, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(id);
  }, [id, onDelete]);

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={`Actions for ${name}`}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <MoreHorizontalIcon aria-hidden className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={handleEdit}>
            <PencilIcon aria-hidden />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDelete} variant="destructive">
            <Trash2Icon aria-hidden />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function createAuthorColumns(handlers: {
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
}): ColumnDef<Author>[] {
  return [
    createSelectColumn<Author>(),
    {
      accessorKey: "name",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
      header: () => <ColumnHeader title="Name" />,
    },
    {
      accessorKey: "id",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs tabular-nums">
          {row.original.id}
        </span>
      ),
      header: () => <ColumnHeader title="ID" />,
    },
    {
      accessorKey: "createdAt",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs tabular-nums">
          {row.original.createdAt.toLocaleString()}
        </span>
      ),
      header: () => <ColumnHeader title="Created" />,
    },
    {
      cell: ({ row }) => (
        <AuthorRowActions
          id={row.original.id}
          name={row.original.name}
          onDelete={handlers.onDelete}
          onEdit={handlers.onEdit}
        />
      ),
      enableHiding: false,
      header: () => <span className="sr-only">Actions</span>,
      id: "actions",
    },
  ];
}
