import * as React from "react"
import {
  Toast as ToastPrimitive,
  type ToastManagerAddOptions,
  type ToastManagerPromiseOptions,
  type ToastManagerUpdateOptions,
} from "@base-ui/react/toast"
import { XIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type ToastType = "default" | "info" | "success" | "error"

type ToastData = object

type ToastAddOptions<Data extends object = ToastData> = Omit<
  ToastManagerAddOptions<Data>,
  "type"
> & {
  type?: ToastType | (string & {}) | undefined
}

type ToastOptions<Data extends object = ToastData> = Omit<
  ToastAddOptions<Data>,
  "title" | "type"
>

type ToasterProps = Omit<
  ToastPrimitive.Provider.Props,
  "children" | "toastManager"
>

/**
 * Shared Base UI toast manager usable both inside React components and in
 * non-React modules.
 */
const toastManager = ToastPrimitive.createToastManager<ToastData>()

/**
 * Ergonomic helpers backed by `toastManager`.
 */
const toast = {
  add<Data extends object = ToastData>(options: ToastAddOptions<Data>): string {
    return toastManager.add(options)
  },
  info<Data extends object = ToastData>(
    title: React.ReactNode,
    options?: ToastOptions<Data>
  ): string {
    return toastManager.add({ ...options, title, type: "info" })
  },
  success<Data extends object = ToastData>(
    title: React.ReactNode,
    options?: ToastOptions<Data>
  ): string {
    return toastManager.add({ ...options, title, type: "success" })
  },
  error<Data extends object = ToastData>(
    title: React.ReactNode,
    options?: ToastOptions<Data>
  ): string {
    return toastManager.add({ ...options, title, type: "error" })
  },
  update<Data extends object = ToastData>(
    id: string,
    updates:
      | ToastManagerUpdateOptions<Data>
      | ((prevToast: ToastPrimitive.Root.ToastObject<Data>) => ToastManagerUpdateOptions<Data>)
  ): void {
    toastManager.update(id, updates)
  },
  promise<Value, Data extends object = ToastData>(
    promise: Promise<Value>,
    options: ToastManagerPromiseOptions<Value, Data>
  ): Promise<Value> {
    return toastManager.promise(promise, options)
  },
  close(id?: string): void {
    toastManager.close(id)
  },
  dismissAll(): void {
    toastManager.close()
  },
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()

  return toasts.map((item) => {
    const fallbackLabel =
      item.title == null && typeof item.description === "string"
        ? item.description
        : undefined

    return (
      <ToastPrimitive.Root
        key={item.id}
        toast={item}
        data-slot="toast"
        aria-label={fallbackLabel}
        className={cn(
          "pointer-events-auto relative flex w-full items-start justify-between gap-3 rounded-2xl border border-border bg-popover p-4 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/5 transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring dark:ring-foreground/10 data-starting-style:translate-y-2 data-starting-style:opacity-0 data-ending-style:opacity-0 data-limited:hidden",
          item.type === "error" && "border-destructive/30"
        )}
      >
        <ToastPrimitive.Content
          data-slot="toast-content"
          className="flex min-w-0 flex-1 flex-col gap-1"
        >
          <ToastPrimitive.Title
            data-slot="toast-title"
            className={cn(
              "font-medium leading-snug",
              item.type === "error" && "text-destructive"
            )}
          />
          <ToastPrimitive.Description
            data-slot="toast-description"
            className="text-muted-foreground leading-snug"
          />
          <ToastPrimitive.Action
            data-slot="toast-action"
            render={
              <Button className="mt-1 self-start" size="xs" variant="outline" />
            }
          />
        </ToastPrimitive.Content>
        <ToastPrimitive.Close
          aria-hidden={undefined}
          aria-label="Close notification"
          data-slot="toast-close"
          render={
            <Button
              className="-mt-1 -mr-1 shrink-0 text-muted-foreground hover:text-foreground"
              size="icon-xs"
              variant="ghost"
            />
          }
        >
          <XIcon />
        </ToastPrimitive.Close>
      </ToastPrimitive.Root>
    )
  })
}

/**
 * Global toast provider and viewport backed by `toastManager`.
 * Mount once near the app root.
 */
function Toaster(props: ToasterProps) {
  return (
    <ToastPrimitive.Provider toastManager={toastManager} {...props}>
      <ToastPrimitive.Portal data-slot="toast-portal">
        <ToastPrimitive.Viewport
          aria-label="Notifications"
          data-slot="toast-viewport"
          className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 outline-none sm:right-6 sm:bottom-6"
        >
          <ToastList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  )
}

export {
  Toaster,
  toast,
  toastManager,
  type ToastAddOptions,
  type ToastOptions,
  type ToastType,
  type ToasterProps,
}
