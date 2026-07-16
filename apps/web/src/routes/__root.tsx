import { createRootRoute, Outlet } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/app-shell.tsx";
import { ThemeProvider } from "@/components/theme-provider.tsx";

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
      <AppShell>
        <Outlet />
      </AppShell>
    </ThemeProvider>
  );
}
