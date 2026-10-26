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

export type Post = RouterOutputs["posts"]["list"]["items"][number];

export const postColumnLabels: Record<string, string> = {
  authorName: "Author",
  body: "Body",
  createdAt: "Created",
  title: "Title",
};

function PostRowActions({
  id,
  onDelete,
  onEdit,
  title,
}: {
  id: number;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
  title: string;
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
              aria-label={`Actions for ${title}`}
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

export function createPostColumns(handlers: {
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
}): ColumnDef<Post>[] {
  return [
    createSelectColumn<Post>(),
    {
      accessorKey: "title",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
      header: () => <ColumnHeader title="Title" />,
    },
    {
      accessorKey: "author.name",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.author.name}
        </span>
      ),
      header: () => <ColumnHeader title="Author" />,
      id: "authorName",
    },
    {
      accessorKey: "body",
      cell: ({ row }) => (
        <span className="line-clamp-1 text-muted-foreground">
          {row.original.body || "—"}
        </span>
      ),
      header: () => <ColumnHeader title="Body" />,
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
        <PostRowActions
          id={row.original.id}
          onDelete={handlers.onDelete}
          onEdit={handlers.onEdit}
          title={row.original.title}
        />
      ),
      enableHiding: false,
      header: () => <span className="sr-only">Actions</span>,
      id: "actions",
    },
  ];
}
