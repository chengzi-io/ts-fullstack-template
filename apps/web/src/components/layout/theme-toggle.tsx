import { Button } from "@workspace/ui/components/button";
import { MoonIcon, SunIcon } from "lucide-react";
import { useCallback } from "react";

import { useTheme } from "@/components/theme-provider.tsx";

/** Flips the rendered theme; a "system" choice becomes an explicit one. */
export function ThemeToggle() {
  const { setTheme } = useTheme();
  const toggle = useCallback(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  }, [setTheme]);

  return (
    <Button
      aria-label="Toggle theme"
      className="ml-auto"
      onClick={toggle}
      size="icon"
      type="button"
      variant="ghost"
    >
      <SunIcon aria-hidden className="size-4 dark:hidden" />
      <MoonIcon aria-hidden className="hidden size-4 dark:block" />
    </Button>
  );
}
