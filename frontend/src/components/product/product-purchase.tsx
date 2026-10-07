"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ProductGallery } from "./product-gallery";
import { SizeGuideDialog } from "./size-guide-dialog";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/catalog";

/**
 * The interactive half of the product page: gallery, colour, size, quantity
 * and add-to-cart.
 *
 * Colour lives in the URL (`?color=`) so a specific colourway can be shared,
 * and is updated with router.replace so it does not add a history entry per
 * swatch click — the back button should leave the product, not step through
 * every colour that was looked at.
 *
 * Size and quantity are local state: they are a transient choice, not an
 * address.
 */
const MAX_QUANTITY = 10;

export function ProductPurchase({
  product,
  details,
}: {
  product: Product;
  /** Name, rating, price and short description — rendered on the server and
   *  passed in, so this client component does not re-create static markup. */
  details: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const colorFromUrl = params.get("color");
  const initialColor = product.colors.find((c) => c.slug === colorFromUrl) ?? product.colors[0];

  const [colorSlug, setColorSlug] = useState(initialColor.slug);
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showSizeError, setShowSizeError] = useState(false);

  const color = product.colors.find((c) => c.slug === colorSlug) ?? product.colors[0];

  /** Stock for each size in the chosen colour. */
  const stockBySize = new Map(
    product.variants.filter((v) => v.colorSlug === colorSlug).map((v) => [v.size, v.stock]),
  );

  const selectedStock = size ? (stockBySize.get(size) ?? 0) : 0;
  const colorSoldOut = [...stockBySize.values()].every((s) => s === 0);
  const productSoldOut = product.variants.every((v) => v.stock === 0);

  function chooseColor(slug: string) {
    // Changing colour can invalidate the chosen size, so reset it here rather
    // than in an effect watching colorSlug. This is a user event, not a
    // synchronisation with an external system — and a synchronous setState
    // inside an effect forces React into an extra render pass.
    setColorSlug(slug);
    setSize(null);
    setQuantity(1);
    setShowSizeError(false);

    const next = new URLSearchParams(params);
    next.set("color", slug);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function addToCart() {
    if (!size) {
      // Explain rather than silently disabling the button — a disabled control
      // with no reason is the more frustrating failure.
      setShowSizeError(true);
      return;
    }
    // The cart slice and drawer arrive in the next phase.
    toast.success(`${product.name} added`, {
      description: `${color.name} · EU ${size} · Qty ${quantity}`,
    });
  }

  const maxForVariant = Math.min(selectedStock || MAX_QUANTITY, MAX_QUANTITY);

  return (
    <div className="lg:grid lg:grid-cols-2 lg:gap-12">
      <ProductGallery color={color} productName={product.name} collection={product.collection} />

      <div className="mt-8 lg:mt-0">
        {details}

        {/* Colour */}
        <fieldset className="mt-6">
          <legend className="text-body-sm font-medium">
            Colour: <span className="text-muted-foreground font-normal">{color.name}</span>
          </legend>
          <ul className="mt-3 flex flex-wrap gap-2">
            {product.colors.map((option) => {
              const optionSoldOut = product.variants
                .filter((v) => v.colorSlug === option.slug)
                .every((v) => v.stock === 0);
              const selected = option.slug === colorSlug;

              return (
                <li key={option.slug}>
                  <button
                    type="button"
                    onClick={() => chooseColor(option.slug)}
                    aria-pressed={selected}
                    title={optionSoldOut ? `${option.name} — sold out` : option.name}
                    className={cn(
                      "focus-visible:ring-ring relative block size-9 rounded-full border-2 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                      selected ? "border-primary" : "border-border hover:border-muted-foreground",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="block size-full rounded-full border border-black/5"
                      style={{ backgroundColor: option.hex }}
                    />
                    {/* Sold-out colours stay selectable so they can still be
                        viewed, but are visibly struck through. */}
                    {optionSoldOut ? (
                      <span
                        aria-hidden="true"
                        className="bg-foreground/70 absolute top-1/2 left-1/2 h-0.5 w-10 -translate-x-1/2 -translate-y-1/2 -rotate-45"
                      />
                    ) : null}
                    <span className="sr-only">
                      {option.name}
                      {optionSoldOut ? " (sold out)" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>

        {/* Size */}
        <fieldset className="mt-8">
          <div className="flex items-center justify-between">
            <legend className="text-body-sm font-medium">Size (EU)</legend>
            <SizeGuideDialog />
          </div>

          {colorSoldOut ? (
            <p className="text-muted-foreground text-body-sm mt-3">
              This colour is sold out. Try another colour.
            </p>
          ) : (
            <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {product.sizes.map((option) => {
                const stock = stockBySize.get(option) ?? 0;
                const soldOut = stock === 0;
                const selected = option === size;

                return (
                  <li key={option}>
                    <button
                      type="button"
                      disabled={soldOut}
                      aria-pressed={selected}
                      onClick={() => {
                        setSize(option);
                        setQuantity(1);
                        setShowSizeError(false);
                      }}
                      className={cn(
                        "rounded-button focus-visible:ring-ring text-body-sm relative w-full border py-2.5 transition-colors focus-visible:ring-2 focus-visible:outline-none",
                        selected && "bg-primary text-primary-foreground border-primary",
                        !selected && !soldOut && "border-border hover:bg-muted",
                        soldOut && "border-border text-muted-foreground cursor-not-allowed",
                      )}
                    >
                      {option}
                      {soldOut ? (
                        <>
                          <span
                            aria-hidden="true"
                            className="bg-muted-foreground/60 absolute top-1/2 left-1/2 h-px w-3/4 -translate-x-1/2 -translate-y-1/2 -rotate-12"
                          />
                          <span className="sr-only"> — sold out</span>
                        </>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {showSizeError ? (
            <p role="alert" className="text-destructive text-body-sm mt-3">
              Select a size first.
            </p>
          ) : null}

          {/* Low-stock nudge for the exact variant chosen. */}
          {size && selectedStock > 0 && selectedStock <= 3 ? (
            <p className="text-warning text-body-sm mt-3">Only {selectedStock} left</p>
          ) : null}
          {size && selectedStock > 3 ? (
            <p className="text-success text-body-sm mt-3">In stock</p>
          ) : null}
        </fieldset>

        {/* Quantity */}
        {!colorSoldOut ? (
          <div className="mt-8">
            <Label htmlFor="quantity" className="text-body-sm font-medium">
              Quantity
            </Label>
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                <Minus className="size-4" aria-hidden="true" />
              </Button>
              <output
                id="quantity"
                aria-live="polite"
                className="border-border rounded-button text-body-sm w-14 border py-2 text-center"
              >
                {quantity}
              </output>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity((q) => Math.min(maxForVariant, q + 1))}
                disabled={quantity >= maxForVariant}
                aria-label="Increase quantity"
              >
                <Plus className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : null}

        {/* Add to cart */}
        <div className="mt-8">
          {productSoldOut ? (
            <Button size="lg" className="w-full" disabled>
              Sold out
            </Button>
          ) : (
            <Button size="lg" className="w-full" onClick={addToCart} disabled={colorSoldOut}>
              <ShoppingBag className="size-4" aria-hidden="true" />
              Add to cart
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
