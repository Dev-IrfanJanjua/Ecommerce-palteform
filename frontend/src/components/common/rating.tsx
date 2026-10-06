import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Star rating.
 *
 * The visible stars are decorative (aria-hidden); the real value is exposed to
 * screen readers as text, which is far more useful than five announced icons.
 */
export function Rating({
  value,
  reviewCount,
  showCount = true,
  className,
}: {
  value: number;
  reviewCount?: number;
  showCount?: boolean;
  className?: string;
}) {
  const rounded = Math.round(value);

  return (
    <span className={cn("flex items-center gap-1", className)}>
      <span className="flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn("size-3.5", star <= rounded ? "fill-rating text-rating" : "text-border")}
          />
        ))}
      </span>
      <span className="sr-only">
        Rated {value} out of 5{reviewCount !== undefined ? ` from ${reviewCount} reviews` : ""}
      </span>
      {showCount && reviewCount !== undefined ? (
        <span className="text-muted-foreground text-body-xs" aria-hidden="true">
          {value} ({reviewCount})
        </span>
      ) : null}
    </span>
  );
}
