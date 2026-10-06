import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * PRODUCT IMAGE
 *
 * Real photography does not exist yet, so this draws a deterministic SVG
 * placeholder built from the colourway's own hex value.
 *
 * Why inline SVG rather than 400 placeholder files on disk:
 *  - 36 products x up to 4 colours x 4 views is ~400 binaries in git for
 *    something that gets deleted the moment real photos arrive
 *  - no 404s and no broken-image flashes in development
 *  - the placeholder genuinely reflects each shoe's colour, so the grid reads
 *    as a real catalogue while reviewing layout
 *
 * When real photos land, drop them at the paths the catalog already generates
 * (`/images/products/{slug}/{colorSlug}-{n}.webp`) and flip HAS_REAL_PHOTOS.
 * Nothing else changes — every caller already passes the correct `src`.
 */
const HAS_REAL_PHOTOS = false;

/** Mixes a hex colour towards white (amount > 0) or black (amount < 0). */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  const mix = (channel: number) => Math.round(channel + (target - channel) * t);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Perceived brightness, so very pale shoes still get a visible outline. */
function isLight(hex: string): boolean {
  const n = parseInt(hex.replace("#", ""), 16);
  return (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 180;
}

interface ProductImageProps {
  src: string;
  alt: string;
  /** The colourway's hex — product data, which is why a literal is fine here. */
  hex: string;
  /** 1-4. Changes the angle slightly so a gallery does not show four identical views. */
  view?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

export function ProductImage({
  src,
  alt,
  hex,
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

  const sole = shade(hex, -0.45);
  const midsole = isLight(hex) ? shade(hex, -0.12) : shade(hex, 0.3);
  const panel = isLight(hex) ? shade(hex, -0.08) : shade(hex, 0.14);
  const outline = isLight(hex) ? shade(hex, -0.35) : shade(hex, 0.25);

  // Each view is the same shoe at a slightly different angle and scale.
  const angles = [0, -8, 6, -3];
  const scales = [1, 0.94, 1.06, 0.9];
  const angle = angles[(view - 1) % 4];
  const scale = scales[(view - 1) % 4];

  return (
    <svg
      viewBox="0 0 400 500"
      role="img"
      aria-label={alt}
      className={cn("bg-surface h-full w-full object-cover", className)}
      preserveAspectRatio="xMidYMid slice"
    >
      <g transform={`translate(200 270) rotate(${angle}) scale(${scale}) translate(-200 -270)`}>
        {/* Contact shadow */}
        <ellipse cx="200" cy="372" rx="142" ry="16" fill={sole} opacity="0.18" />

        {/* Outsole */}
        <path d="M62 330 Q54 362 92 368 L306 368 Q346 364 342 332 L342 322 L62 322 Z" fill={sole} />
        {/* Midsole stripe */}
        <path d="M62 322 L342 322 L342 306 Q200 296 62 308 Z" fill={midsole} />

        {/* Upper */}
        <path
          d="M66 308 Q72 232 146 214 L206 206 Q258 202 296 238 Q330 270 340 306 Q200 296 66 308 Z"
          fill={hex}
          stroke={outline}
          strokeWidth="2"
        />

        {/* Toe cap */}
        <path d="M296 238 Q330 270 340 306 Q310 300 288 298 Q290 262 296 238 Z" fill={panel} />

        {/* Heel counter */}
        <path d="M66 308 Q72 240 128 218 L132 300 Q96 302 66 308 Z" fill={panel} />

        {/* Lace panel */}
        <g stroke={outline} strokeWidth="5" strokeLinecap="round" opacity="0.65">
          <line x1="152" y1="238" x2="196" y2="226" />
          <line x1="158" y1="258" x2="206" y2="246" />
          <line x1="166" y1="278" x2="216" y2="266" />
        </g>

        {/* Collar */}
        <path
          d="M128 218 Q160 206 206 206"
          fill="none"
          stroke={outline}
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.8"
        />
      </g>
    </svg>
  );
}
