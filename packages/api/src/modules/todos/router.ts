import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../../trpc.js";
import {
  createTodoInput,
  listTodosInput,
  todoIdInput,
  updateTodoMutationInput,
} from "./schema.js";
import {
  createTodo,
  deleteTodo,
  getTodoById,
  listTodos,
  updateTodo,
} from "./service.js";

/**
 * Template demo router. Copy the pattern for real domains; remove when unused.
 */
export const todosRouter = router({
  byId: publicProcedure.input(todoIdInput).query(async ({ ctx, input }) => {
    const todo = await getTodoById(ctx.db, input.id);
    if (!todo) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Todo not found" });
    }
    return todo;
  }),

  create: publicProcedure
    .input(createTodoInput)
    .mutation(({ ctx, input }) => createTodo(ctx.db, input)),

  delete: publicProcedure
    .input(todoIdInput)
    .mutation(async ({ ctx, input }) => {
      const deleted = await deleteTodo(ctx.db, input.id);
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Todo not found" });
      }
      return { ok: true as const };
    }),

  list: publicProcedure
    .input(listTodosInput)
    .query(({ ctx, input }) => listTodos(ctx.db, input)),

  update: publicProcedure
    .input(updateTodoMutationInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      const todo = await updateTodo(ctx.db, id, patch);
      if (!todo) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Todo not found" });
      }
      return todo;
    }),
});
