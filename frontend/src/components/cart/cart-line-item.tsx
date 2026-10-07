"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/product/product-image";
import { removeItem, setQuantity, type CartItem } from "@/features/cart/cart-slice";
import { useAppDispatch } from "@/store/hooks";
import { formatPrice } from "@/lib/format";

/**
 * One line in the cart.
 *
 * Quantity is capped at the variant's stock, and a line whose stock has since
 * dropped is flagged rather than silently corrected — the shopper should be
 * told why their order changed, not have it changed behind their back.
 */
export function CartLineItem({ item, onNavigate }: { item: CartItem; onNavigate?: () => void }) {
  const dispatch = useAppDispatch();

  const soldOut = item.maxStock === 0;
  const overStock = !soldOut && item.quantity > item.maxStock;
  const lineTotal = item.unitPriceCents * item.quantity;

  return (
    <li className="flex gap-4 py-5">
      <Link
        href={`/products/${item.slug}?color=${item.colorSlug}`}
        onClick={onNavigate}
        className="bg-surface rounded-image relative aspect-4/5 w-20 shrink-0 overflow-hidden"
      >
        <ProductImage
          src={item.image}
          alt={`${item.name}, ${item.colorName}`}
          hex={item.colorHex}
          collection={item.collection}
          sizes="5rem"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-body-sm font-medium">
              <Link href={`/products/${item.slug}?color=${item.colorSlug}`} onClick={onNavigate}>
                {item.name}
              </Link>
            </h3>
            <p className="text-muted-foreground text-body-xs mt-0.5">
              {item.colorName} · EU {item.size}
            </p>
            <p className="text-muted-foreground text-body-xs">{formatPrice(item.unitPriceCents)}</p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => dispatch(removeItem(item.sku))}
            aria-label={`Remove ${item.name}, ${item.colorName}, size ${item.size}`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>

        {soldOut || overStock ? (
          <p role="alert" className="text-destructive text-body-xs mt-2 flex items-center gap-1.5">
            <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
            {soldOut
              ? "Sold out — remove to continue"
              : `Only ${item.maxStock} left — reduce the quantity`}
          </p>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={item.quantity <= 1}
              onClick={() => dispatch(setQuantity({ sku: item.sku, quantity: item.quantity - 1 }))}
              aria-label="Decrease quantity"
            >
              <Minus className="size-3.5" aria-hidden="true" />
            </Button>
            <output className="text-body-sm w-9 text-center" aria-live="polite">
              {item.quantity}
            </output>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={item.quantity >= item.maxStock}
              onClick={() => dispatch(setQuantity({ sku: item.sku, quantity: item.quantity + 1 }))}
              aria-label="Increase quantity"
            >
              <Plus className="size-3.5" aria-hidden="true" />
            </Button>
          </div>

          <p className="text-body-sm font-medium">{formatPrice(lineTotal)}</p>
        </div>
      </div>
    </li>
  );
}
