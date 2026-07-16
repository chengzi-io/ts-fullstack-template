import { z } from "zod";

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type Pagination = z.output<typeof paginationSchema>;

/** Shared list response for tables (Spring Page–like). */
export type PaginatedResult<T> = Pagination & {
  items: T[];
  pageCount: number;
  total: number;
};
