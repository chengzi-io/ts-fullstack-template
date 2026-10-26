import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

const navLinkClass =
  "rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:text-foreground [&.active]:bg-muted [&.active]:font-medium [&.active]:text-foreground";

/**
 * App chrome: top nav + main content.
 * Keep business links limited to top-level sections.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-border border-b">
        <div className="mx-auto flex h-12 w-full max-w-5xl items-center gap-6 px-4">
          <nav aria-label="Primary" className="flex items-center gap-1 text-sm">
            <Link className={navLinkClass} to="/">
              Home
            </Link>
            <Link className={navLinkClass} to="/posts">
              Posts
            </Link>
            <Link className={navLinkClass} to="/authors">
              Authors
            </Link>
          </nav>
          <p className="ml-auto font-mono text-muted-foreground text-xs">
            Press <kbd className="rounded border px-1">d</kbd> for theme
          </p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
