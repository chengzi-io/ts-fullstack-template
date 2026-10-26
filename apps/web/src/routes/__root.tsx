import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell.tsx";
import { ThemeProvider } from "@/components/theme-provider.tsx";
import { queryClient } from "@/lib/query-client.ts";

/** Lazy so production bundles never pull router/query/agentation tooling. */
const DevTools = import.meta.env.DEV
  ? lazy(() =>
      import("@/components/dev-tools.tsx").then((mod) => ({
        default: mod.DevTools,
      }))
    )
  : null;

/** Providers + chrome; (DEV) tools mount once. Feature dialogs mount in their routes. */
export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AppShell>
          <Outlet />
        </AppShell>
        {DevTools ? (
          <Suspense fallback={null}>
            <DevTools />
          </Suspense>
        ) : null}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
