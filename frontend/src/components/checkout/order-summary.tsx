"use client";

import { ChevronDown } from "lucide-react";
import { ProductImage } from "@/components/product/product-image";
import { Separator } from "@/components/ui/separator";
import { selectCartItems, selectSubtotalCents } from "@/features/cart/selectors";
import { useAppSelector } from "@/store/hooks";
import { getDeliveryPrice, type DeliveryMethod } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import { brand } from "@/config/brand";

/**
 * Order summary.
 *
 * Totals are computed from the cart and the chosen delivery method, never
 * passed in pre-calculated — a number that travels separately from the thing
 * it describes is a number that eventually disagrees with it.
 *
 * On mobile it collapses into a <details> disclosure at the top of the page, so
 * the form is reachable without scrolling past a long item list. That is a
 * native element: it works before hydration and needs no JavaScript.
 */
export function OrderSummary({ deliveryMethod }: { deliveryMethod: DeliveryMethod }) {
  const items = useAppSelector(selectCartItems);
  const subtotal = useAppSelector(selectSubtotalCents);
  const shipping = getDeliveryPrice(deliveryMethod, subtotal);
  const total = subtotal + shipping;

  const body = (
    <>
      <ul className="divide-border divide-y">
        {items.map((item) => (
          <li key={item.sku} className="flex gap-3 py-3">
            <div className="bg-surface rounded-image relative size-16 shrink-0 overflow-hidden">
              <ProductImage
                alt={`${item.name}, ${item.colorName}`}
                hex={item.colorHex}
                collection={item.collection}
                productSlug={item.slug}
                sizes="4rem"
              />
              <span
                aria-hidden="true"
                className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full text-[0.625rem] font-medium"
              >
                {item.quantity}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-body-sm font-medium">{item.name}</p>
              <p className="text-muted-foreground text-body-xs">
                {item.colorName} · EU {item.size}
              </p>
            </div>

            <p className="text-body-sm font-medium">
              {formatPrice(item.unitPriceCents * item.quantity)}
            </p>
          </li>
        ))}
      </ul>

      <Separator className="my-4" />

      <dl className="text-body-sm space-y-2">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">
            Delivery
            <span className="text-body-xs block">
              {deliveryMethod === "standard"
                ? brand.shipping.estimatedDays
                : brand.shipping.expressEstimatedDays}
            </span>
          </dt>
          <dd>
            {shipping === 0 ? <span className="text-success">Free</span> : formatPrice(shipping)}
          </dd>
        </div>
      </dl>

      <Separator className="my-4" />

      <div className="flex items-baseline justify-between">
        <p className="text-body font-medium">Total</p>
        <p className="text-h3 font-semibold">{formatPrice(total)}</p>
      </div>
      <p className="text-muted-foreground text-body-xs mt-1">
        Including all applicable charges. No hidden fees.
      </p>
    </>
  );

  return (
    <>
      {/* Mobile: collapsible, so the form is not buried under the item list. */}
      <details className="border-border bg-card rounded-card group border p-4 lg:hidden">
        <summary className="text-body-sm flex items-center justify-between gap-2 font-medium">
          <span>
            Order summary{" "}
            <span className="text-muted-foreground font-normal">
              ({items.length} {items.length === 1 ? "item" : "items"})
            </span>
          </span>
          <span className="flex items-center gap-2">
            {formatPrice(total)}
            <ChevronDown
              className="size-4 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </span>
        </summary>
        <div className="mt-4">{body}</div>
      </details>

      {/* Desktop: always visible, sticky beside the form. */}
      <aside className="border-border bg-card rounded-card sticky top-24 hidden border p-6 lg:block">
        <h2 className="text-h4">Order summary</h2>
        <div className="mt-4">{body}</div>
      </aside>
    </>
  );
}
