import { z } from "zod";

export const paginationInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.output<typeof paginationInput>;

/** Free-text list filter; absent or empty means "no filter". */
export const searchQuery = z.string().trim().max(100).optional();

export function paginatedOutput<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    page: z.number().int().min(1),
    pageCount: z.number().int().min(0),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
  });
}

export function paginationOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

/** `{ items, page, pageCount, pageSize, total }` for list repos. */
export function toPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
) {
  return {
    items,
    page,
    pageCount: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
    pageSize,
    total,
  };
}
