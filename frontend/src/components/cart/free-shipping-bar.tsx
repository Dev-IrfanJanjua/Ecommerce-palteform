"use client";

import { useAppSelector } from "@/store/hooks";
import {
  selectFreeShippingRemaining,
  selectQualifiesForFreeShipping,
  selectSubtotalCents,
} from "@/features/cart/selectors";
import { brand } from "@/config/brand";
import { formatPrice } from "@/lib/format";

/**
 * Progress towards free delivery.
 *
 * The threshold comes from brand config, the same value checkout charges
 * against, so this bar can never promise something the order summary then
 * contradicts.
 */
export function FreeShippingBar() {
  const subtotal = useAppSelector(selectSubtotalCents);
  const remaining = useAppSelector(selectFreeShippingRemaining);
  const qualifies = useAppSelector(selectQualifiesForFreeShipping);

  const threshold = brand.shipping.freeThresholdCents;
  const percent = Math.min(100, Math.round((subtotal / threshold) * 100));

  return (
    <div>
      <p className="text-body-sm">
        {qualifies ? (
          <span className="text-success font-medium">You have free delivery</span>
        ) : (
          <>
            Spend <span className="font-medium">{formatPrice(remaining)}</span> more for free
            delivery
          </>
        )}
      </p>

      <div
        className="bg-muted mt-2 h-1.5 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progress towards free delivery"
      >
        <div
          className={
            qualifies ? "bg-success h-full transition-all" : "bg-primary h-full transition-all"
          }
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
