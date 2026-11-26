import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@workspace/ui/components/button";

/**
 * Default fallback rendered when no route matches the current URL.
 */
export function NotFound() {
  return (
    <section className="bg-muted/30 flex flex-col items-start gap-4 rounded-2xl border border-dashed px-6 py-8">
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-sm font-medium">404</p>
        <h1 className="text-lg font-medium tracking-tight">Page not found</h1>
        <p className="text-muted-foreground max-w-prose text-sm">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>
      <Link className={buttonVariants({ variant: "outline" })} to="/">
        Back to home
      </Link>
    </section>
  );
}
