import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown when filters match nothing. Always offers a way out. */
export function EmptyState({
  title = "No shoes match those filters",
  description = "Try removing a filter or two to see more.",
  actionHref,
  actionLabel = "Clear filters",
}: {
  title?: string;
  description?: string;
  actionHref: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <SearchX className="text-muted-foreground size-10" aria-hidden="true" />
      <h2 className="text-h3 mt-6">{title}</h2>
      <p className="text-muted-foreground text-body mt-2 max-w-sm">{description}</p>
      <Button asChild className="mt-8">
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  );
}
