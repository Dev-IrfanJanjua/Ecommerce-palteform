import Image from "next/image";
import { cn } from "@/lib/utils";
import { ShoeSilhouette, type ShoePaint } from "./shoe-shapes";

/**
 * PRODUCT IMAGE
 *
 * Real photography does not exist yet, so this draws a deterministic SVG
 * placeholder: the silhouette for the product's collection, painted in that
 * colourway's own hex.
 *
 * Why inline SVG rather than ~400 placeholder binaries in git: no 404s, no
 * broken-image flashes, and the grid reads as a real catalogue while layout is
 * being reviewed. When real photos land, drop them at the paths the catalog
 * already generates (`/images/products/{slug}/{colorSlug}-{n}.webp`) and flip
 * HAS_REAL_PHOTOS — every caller already passes the correct `src`.
 */
const HAS_REAL_PHOTOS = false;

/** Mixes a hex colour towards white (amount > 0) or black (amount < 0). */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  const mix = (channel: number) => Math.round(channel + (target - channel) * t);
  return `#${((mix((n >> 16) & 255) << 16) | (mix((n >> 8) & 255) << 8) | mix(n & 255))
    .toString(16)
    .padStart(6, "0")}`;
}

/** Perceived brightness, so pale shoes still get visible shading. */
function isLight(hex: string): boolean {
  const n = parseInt(hex.replace("#", ""), 16);
  return (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 180;
}

/**
 * Builds the shading set for a colourway.
 *
 * Light and dark shoes need opposite treatment: on a near-white shoe the
 * panels must go darker to stay visible, on a near-black shoe they must go
 * lighter. Using one fixed direction is what made the first version look flat.
 */
function buildPaint(hex: string, gradientId: string): ShoePaint {
  const light = isLight(hex);
  return {
    upper: hex,
    sole: shade(hex, light ? -0.62 : -0.3),
    midsole: light ? shade(hex, -0.18) : shade(hex, 0.42),
    panel: light ? shade(hex, -0.1) : shade(hex, 0.16),
    line: light ? shade(hex, -0.45) : shade(hex, 0.34),
    gradientId,
  };
}

interface ProductImageProps {
  src: string;
  alt: string;
  /** The colourway's hex — product data, which is why a literal is fine here. */
  hex: string;
  /** Picks the silhouette: sneakers, running, boots, formal, sandals, training. */
  collection: string;
  /** 1-4. Slight angle and scale changes so a gallery is not four identical views. */
  view?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

export function ProductImage({
  src,
  alt,
  hex,
  collection,
  view = 1,
  className,
  sizes = "(max-width: 768px) 50vw, 25vw",
  priority = false,
}: ProductImageProps) {
  if (HAS_REAL_PHOTOS) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", className)}
      />
    );
  }

  // Deterministic id: identical inputs produce an identical gradient, so
  // repeated ids across the page are the same definition, not a conflict.
  const gradientId = `shoe-${collection}-${hex.replace("#", "")}-${view}`;
  const paint = buildPaint(hex, gradientId);

  const angles = [-4, -11, 3, -7];
  const scales = [1, 0.93, 1.08, 0.88];
  const i = (view - 1) % 4;

  return (
    <svg
      viewBox="0 0 400 500"
      role="img"
      aria-label={alt}
      className={cn("h-full w-full object-cover", className)}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        {/* Soft top-light gradient across the upper, so it reads as a volume
            rather than a flat cut-out. */}
        <linearGradient id={gradientId} x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0%" stopColor={shade(hex, isLight(hex) ? 0.12 : 0.22)} />
          <stop offset="55%" stopColor={hex} />
          <stop offset="100%" stopColor={shade(hex, -0.16)} />
        </linearGradient>

        <radialGradient id={`${gradientId}-bg`} cx="0.5" cy="0.42" r="0.75">
          <stop offset="0%" stopColor="var(--card)" />
          <stop offset="100%" stopColor="var(--surface)" />
        </radialGradient>
      </defs>

      {/* Studio backdrop, built from theme tokens so it follows the palette. */}
      <rect width="400" height="500" fill={`url(#${gradientId}-bg)`} />

      <g
        transform={`translate(200 280) rotate(${angles[i]}) scale(${scales[i]}) translate(-200 -280)`}
      >
        {/* Contact shadow grounds the shoe instead of letting it float. */}
        <ellipse cx="206" cy="380" rx="150" ry="14" fill={paint.sole} opacity="0.16" />
        <ShoeSilhouette collection={collection} paint={paint} />
      </g>
    </svg>
  );
}
