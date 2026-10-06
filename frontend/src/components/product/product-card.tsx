import Link from "next/link";
import { GENDER_LABELS } from "@/data/catalog";
import { isSoldOut } from "@/lib/api/products";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/catalog";
import { Rating } from "@/components/common/rating";
import { PriceTag } from "./price-tag";
import { ProductBadges } from "./product-badges";
import { ProductImage } from "./product-image";

/**
 * Product card — used on the home page, collection grids and related rails.
 *
 * A Server Component: no state, no handlers, so it ships no JavaScript. The
 * second-image hover swap is pure CSS (group-hover opacity) for the same
 * reason, and it is suppressed on touch devices via `@media (hover: hover)`,
 * which Tailwind exposes as the `hover-hover:` variant below.
 */
export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: Product;
  priority?: boolean;
  className?: string;
}) {
  const soldOut = isSoldOut(product);
  const primary = product.colors[0];
  const secondary = product.colors[1] ?? primary;
  const maxSwatches = 4;

  return (
    <article className={cn("group relative", className)}>
      <Link href={`/products/${product.slug}`} className="focus-visible:outline-none">
        {/* The link covers the whole card, so the entire tile is clickable
            while the accessible name stays just the product name. */}
        <span className="rounded-card group-focus-visible:ring-ring absolute inset-0 z-10 group-focus-visible:ring-2 group-focus-visible:ring-offset-2" />

        <div className="bg-surface rounded-image relative aspect-4/5 overflow-hidden">
          {/* Base image */}
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-300",
              "hover-hover:group-hover:opacity-0",
              soldOut && "opacity-60",
            )}
          >
            <ProductImage
              src={primary.images[0]}
              alt={`${product.name}, ${primary.name}, view 1`}
              hex={primary.hex}
              view={1}
              priority={priority}
            />
          </div>

          {/* Hover image — only revealed on devices with a real pointer. */}
          <div className="hover-hover:group-hover:opacity-100 absolute inset-0 opacity-0 transition-opacity duration-300">
            <ProductImage
              src={secondary.images[1] ?? secondary.images[0]}
              alt=""
              hex={secondary.hex}
              view={2}
            />
          </div>

          <div className="absolute top-2 left-2 z-20">
            <ProductBadges product={product} />
          </div>
        </div>

        <div className="mt-3">
          <h3 className="text-body-sm font-medium">{product.name}</h3>
          <p className="text-muted-foreground text-body-xs mt-0.5">
            {product.collection.charAt(0).toUpperCase() + product.collection.slice(1)} ·{" "}
            {GENDER_LABELS[product.gender]}
          </p>

          <PriceTag
            priceCents={product.priceCents}
            compareAtCents={product.compareAtCents}
            className="mt-2"
          />
        </div>
      </Link>

      {/* Below the link so swatches and rating are not part of its label. */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <ul className="flex items-center gap-1" aria-label={`${product.colors.length} colours`}>
          {product.colors.slice(0, maxSwatches).map((color) => (
            <li key={color.slug}>
              <span
                title={color.name}
                className="border-border block size-3 rounded-full border"
                style={{ backgroundColor: color.hex }}
              />
              <span className="sr-only">{color.name}</span>
            </li>
          ))}
          {product.colors.length > maxSwatches ? (
            <li className="text-muted-foreground text-body-xs">
              +{product.colors.length - maxSwatches}
            </li>
          ) : null}
        </ul>

        <Rating value={product.rating} reviewCount={product.reviewCount} />
      </div>
    </article>
  );
}
