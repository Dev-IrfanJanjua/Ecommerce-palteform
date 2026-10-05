import { cn } from "@/lib/utils";
import { Container } from "./container";

/**
 * Section — one vertical band of a page.
 *
 * Applies the --section-y rhythm so spacing between page sections is
 * consistent everywhere and adjustable from one token.
 *
 * `surface` paints the alternate background used to separate bands visually.
 * `bleed` skips the Container, for sections whose background must span the
 * full viewport width while their content stays contained.
 */
export function Section({
  className,
  surface = false,
  bleed = false,
  children,
}: {
  className?: string;
  surface?: boolean;
  bleed?: boolean;
  children: React.ReactNode;
}) {
  const content = bleed ? children : <Container>{children}</Container>;

  return (
    <section
      className={cn(
        "py-section lg:py-section-lg",
        surface && "bg-surface text-surface-foreground",
        className,
      )}
    >
      {content}
    </section>
  );
}

/** Heading + optional description + optional trailing action (e.g. "View all"). */
export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        <h2 className="text-h2">{title}</h2>
        {description ? (
          <p className="text-muted-foreground text-body mt-2 max-w-prose">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
