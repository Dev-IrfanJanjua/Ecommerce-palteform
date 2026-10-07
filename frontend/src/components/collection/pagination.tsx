import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaginationMeta } from "@/types/catalog";

/**
 * Numbered pagination.
 *
 * Real <a> links, not buttons: each page is a distinct URL, so it can be
 * shared, bookmarked, opened in a new tab and crawled. This is also why it can
 * stay a Server Component.
 */
export function Pagination({
  meta,
  pathname,
  params,
}: {
  meta: PaginationMeta;
  pathname: string;
  params: URLSearchParams;
}) {
  if (meta.totalPages <= 1) return null;

  const href = (page: number) => {
    const next = new URLSearchParams(params);
    if (page === 1) next.delete("page");
    else next.set("page", String(page));
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const pages = pageWindow(meta.page, meta.totalPages);

  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-1">
      <PageLink
        href={href(meta.page - 1)}
        disabled={meta.page === 1}
        label="Previous page"
        icon={<ChevronLeft className="size-4" aria-hidden="true" />}
      />

      {pages.map((page, index) =>
        page === "gap" ? (
          <span key={`gap-${index}`} className="text-muted-foreground px-2" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={page}
            href={href(page)}
            aria-current={page === meta.page ? "page" : undefined}
            className={cn(
              "rounded-button focus-visible:ring-ring text-body-sm inline-flex size-9 items-center justify-center transition-colors focus-visible:ring-2 focus-visible:outline-none",
              page === meta.page
                ? "bg-primary text-primary-foreground"
                : "border-border hover:bg-muted border",
            )}
          >
            {page}
          </Link>
        ),
      )}

      <PageLink
        href={href(meta.page + 1)}
        disabled={meta.page === meta.totalPages}
        label="Next page"
        icon={<ChevronRight className="size-4" aria-hidden="true" />}
      />
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  icon,
}: {
  href: string;
  disabled: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  // A disabled control must not be a link — otherwise it is still clickable
  // and focusable. Render a real disabled element instead.
  if (disabled) {
    return (
      <span
        aria-hidden="true"
        className="border-border text-muted-foreground rounded-button inline-flex size-9 items-center justify-center border opacity-40"
      >
        {icon}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className="border-border hover:bg-muted focus-visible:ring-ring rounded-button inline-flex size-9 items-center justify-center border transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      {icon}
    </Link>
  );
}

/** 1 … 4 5 [6] 7 8 … 12 — keeps the control a fixed width on long result sets. */
function pageWindow(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < total) pages.add(current + 1);
  if (current <= 3) pages.add(2).add(3).add(4);
  if (current >= total - 2)
    pages
      .add(total - 1)
      .add(total - 2)
      .add(total - 3);

  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1] > 1) out.push("gap");
    out.push(page);
  });
  return out;
}
