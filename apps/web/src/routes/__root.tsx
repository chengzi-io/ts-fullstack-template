import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/app-shell.tsx";
import { ThemeProvider } from "@/components/theme-provider.tsx";
import { queryClient } from "@/lib/query-client.ts";

/**
 * Root layout — providers + app chrome only.
 * Page content lives in child routes.
 */
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
      </QueryClientProvider>
    </ThemeProvider>
  );
}
