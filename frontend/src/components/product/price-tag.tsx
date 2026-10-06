import { cn } from "@/lib/utils";
import { discountPercent, formatPrice } from "@/lib/format";

/**
 * Price display. The only component that renders money, so currency and
 * locale stay in one place (brand.ts, via formatPrice).
 */
export function PriceTag({
  priceCents,
  compareAtCents,
  size = "sm",
  className,
}: {
  priceCents: number;
  compareAtCents?: number;
  size?: "sm" | "lg";
  className?: string;
}) {
  const onSale = compareAtCents !== undefined && compareAtCents > priceCents;

  return (
    <p className={cn("flex flex-wrap items-baseline gap-2", className)}>
      <span
        className={cn(
          "font-semibold",
          size === "lg" ? "text-h3" : "text-body-sm",
          onSale && "text-sale",
        )}
      >
        {formatPrice(priceCents)}
      </span>

      {onSale ? (
        <>
          <span
            className={cn(
              "text-muted-foreground line-through",
              size === "lg" ? "text-body" : "text-body-xs",
            )}
          >
            {formatPrice(compareAtCents)}
          </span>
          <span className={cn("text-sale", size === "lg" ? "text-body-sm" : "text-body-xs")}>
            −{discountPercent(priceCents, compareAtCents)}%
          </span>
        </>
      ) : null}
    </p>
  );
}
