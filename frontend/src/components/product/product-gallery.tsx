"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ColorOption } from "@/types/catalog";
import { ProductImage } from "./product-image";

/**
 * Product gallery.
 *
 * Mobile: a real swipe carousel. The images sit in a scroll-snap container so
 * the browser handles the gesture natively (smoother than any JS drag), and an
 * onScroll handler keeps the dot indicators in step with where the user
 * stopped. Arrows are provided too, because snap scrolling gives no visual
 * hint that there is more to see.
 *
 * Desktop: square thumbnails drive the main image, with arrows for keyboard
 * and trackpad users who do not want to aim at a 5rem target.
 *
 * `active` is shared by both layouts, so switching breakpoint mid-session
 * never shows two different images.
 */
export function ProductGallery({
  color,
  productName,
  productSlug,
  collection,
}: {
  color: ColorOption;
  productName: string;
  productSlug: string;
  collection: string;
}) {
  const [active, setActive] = useState(0);
  const scroller = useRef<HTMLUListElement>(null);
  const count = color.images.length;

  /** Scrolls the mobile carousel to an index and records it. */
  function goTo(index: number) {
    const next = (index + count) % count;
    setActive(next);
    const el = scroller.current;
    if (el) {
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }
  }

  /** Keeps the dots in step when the user swipes rather than taps. */
  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index !== active && index >= 0 && index < count) setActive(index);
  }

  return (
    // Remounting on colour change resets to the first view — showing view 4 of
    // the previous colourway after switching would be confusing.
    <div key={color.slug}>
      {/* ---------------- Mobile: swipe carousel ---------------- */}
      <div className="lg:hidden">
        <div className="relative">
          <ul
            ref={scroller}
            onScroll={onScroll}
            className="rounded-image flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
            aria-label={`${productName} images`}
          >
            {color.images.map((src, index) => (
              <li key={src} className="w-full shrink-0 snap-center">
                <div className="bg-surface relative aspect-square overflow-hidden">
                  <ProductImage
                    alt={`${productName}, ${color.name}, view ${index + 1}`}
                    hex={color.hex}
                    collection={collection}
                    productSlug={productSlug}
                    view={index + 1}
                    priority={index === 0}
                    sizes="100vw"
                  />
                </div>
              </li>
            ))}
          </ul>

          <CarouselArrow side="left" onClick={() => goTo(active - 1)} />
          <CarouselArrow side="right" onClick={() => goTo(active + 1)} />
        </div>

        {/* Dots */}
        <ul className="mt-4 flex items-center justify-center gap-2">
          {color.images.map((src, index) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Go to image ${index + 1}`}
                aria-current={index === active}
                className={cn(
                  "focus-visible:ring-ring block h-2 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                  index === active ? "bg-primary w-6" : "bg-border w-2",
                )}
              />
            </li>
          ))}
        </ul>
      </div>

      {/* ---------------- Desktop: thumbnails + main ---------------- */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-[5rem_1fr]">
        <ul className="flex flex-col gap-3" aria-label="Choose image">
          {color.images.map((src, index) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`View ${index + 1}`}
                aria-current={index === active}
                className={cn(
                  "rounded-image focus-visible:ring-ring block w-full overflow-hidden border-2 transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  index === active ? "border-primary" : "hover:border-border border-transparent",
                )}
              >
                {/* Square: a 4:5 thumbnail of a square crop letterboxes badly
                    at 5rem, and a row of squares reads as a filmstrip. */}
                <div className="bg-surface relative aspect-square overflow-hidden">
                  <ProductImage
                    alt=""
                    hex={color.hex}
                    collection={collection}
                    productSlug={productSlug}
                    view={index + 1}
                    sizes="5rem"
                  />
                </div>
              </button>
            </li>
          ))}
        </ul>

        <div className="group relative">
          <div className="bg-surface rounded-image relative aspect-square overflow-hidden">
            <ProductImage
              alt={`${productName}, ${color.name}, view ${active + 1}`}
              hex={color.hex}
              collection={collection}
              productSlug={productSlug}
              view={active + 1}
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
            />
          </div>

          {/* Revealed on hover so they do not sit over the product all the
              time, but always reachable by keyboard via focus-within. */}
          <div className="opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            <CarouselArrow side="left" onClick={() => setActive((i) => (i - 1 + count) % count)} />
            <CarouselArrow side="right" onClick={() => setActive((i) => (i + 1) % count)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CarouselArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous image" : "Next image"}
      className={cn(
        "bg-card/90 text-foreground shadow-card focus-visible:ring-ring hover:bg-card absolute top-1/2 z-10 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full backdrop-blur transition-colors focus-visible:ring-2 focus-visible:outline-none",
        side === "left" ? "left-2" : "right-2",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
