"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ColorOption } from "@/types/catalog";
import { ProductImage } from "./product-image";

/**
 * Product gallery.
 *
 * Desktop: one large image with thumbnails beside it.
 * Mobile: a horizontal snap-scroll carousel with dot indicators — far better on
 * touch than arrow buttons, and it needs no JavaScript to scroll.
 *
 * The active image resets whenever the colourway changes, which is why
 * `colorSlug` is part of the key: showing view 4 of the previous colour after
 * switching would be confusing.
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

  return (
    <div key={color.slug}>
      {/* Mobile carousel */}
      <div className="lg:hidden">
        <ul
          className="-mx-gutter px-gutter flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden"
          aria-label={`${productName} images`}
        >
          {color.images.map((src, index) => (
            <li key={src} className="w-[82vw] shrink-0 snap-center">
              <div className="bg-surface rounded-image relative aspect-4/5 overflow-hidden">
                <ProductImage
                  alt={`${productName}, ${color.name}, view ${index + 1}`}
                  hex={color.hex}
                  collection={collection}
                  productSlug={productSlug}
                  view={index + 1}
                  priority={index === 0}
                  sizes="82vw"
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Desktop: thumbnails + main image */}
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
                <div className="bg-surface relative aspect-4/5">
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

        <div className="bg-surface rounded-image relative aspect-4/5 overflow-hidden">
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
      </div>
    </div>
  );
}
