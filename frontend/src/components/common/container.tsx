import { cn } from "@/lib/utils";

/**
 * Container — the horizontal frame every page sits inside.
 *
 * Centres content, caps it at --container-max, and applies --gutter padding
 * (wider on large screens). Changing page width or side padding is a token
 * edit, not a find-and-replace across every page.
 */
export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("px-gutter lg:px-gutter-lg mx-auto w-full max-w-(--container-max)", className)}
    >
      {children}
    </div>
  );
}
