import { brand } from "@/config/brand";

/**
 * FORMATTING HELPERS
 *
 * Every price on the site goes through formatPrice(). No component ever writes
 * a currency symbol, so switching currency is one edit in brand.ts.
 */

/**
 * Money is stored as integer MINOR units (paisa for PKR, cents for USD) to
 * avoid floating-point rounding errors. 0.1 + 0.2 !== 0.3 in JavaScript, which
 * is exactly the kind of bug you cannot have in a cart total.
 *
 * formatPrice(2499000) -> "Rs 24,990"
 */
export function formatPrice(minorUnits: number): string {
  return new Intl.NumberFormat(brand.locale, {
    style: "currency",
    currency: brand.currency,
    minimumFractionDigits: brand.currencyFractionDigits,
    maximumFractionDigits: brand.currencyFractionDigits,
  }).format(minorUnits / 100);
}

/** Discount as a whole percentage, e.g. 2499000 from 3199000 -> 22 */
export function discountPercent(priceMinor: number, compareAtMinor: number): number {
  if (compareAtMinor <= priceMinor) return 0;
  return Math.round(((compareAtMinor - priceMinor) / compareAtMinor) * 100);
}

/** Absolute amount saved, in minor units. */
export function savingsMinor(priceMinor: number, compareAtMinor: number): number {
  return Math.max(0, compareAtMinor - priceMinor);
}

/** How much more a shopper must spend to earn free delivery. 0 once reached. */
export function freeShippingRemaining(subtotalMinor: number): number {
  return Math.max(0, brand.shipping.freeThresholdCents - subtotalMinor);
}
