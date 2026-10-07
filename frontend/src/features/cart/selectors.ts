import { createSelector } from "@reduxjs/toolkit";
import { brand } from "@/config/brand";
import type { RootState } from "@/store";

/**
 * Derived cart values.
 *
 * createSelector memoises, so the subtotal is only recomputed when the items
 * actually change rather than on every render of every subscribing component.
 *
 * Totals are computed here, never stored — a stored total can drift out of
 * step with the items it is supposed to describe.
 */

export const selectCartItems = (state: RootState) => state.cart.items;

export const selectCartCount = createSelector(selectCartItems, (items) =>
  items.reduce((sum, item) => sum + item.quantity, 0),
);

export const selectSubtotalCents = createSelector(selectCartItems, (items) =>
  items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0),
);

/** How much more is needed for free delivery; 0 once the threshold is met. */
export const selectFreeShippingRemaining = createSelector(selectSubtotalCents, (subtotal) =>
  Math.max(0, brand.shipping.freeThresholdCents - subtotal),
);

export const selectQualifiesForFreeShipping = createSelector(
  selectFreeShippingRemaining,
  (remaining) => remaining === 0,
);

/** Shipping that would be charged at checkout for the current subtotal. */
export const selectShippingCents = createSelector(
  selectSubtotalCents,
  selectQualifiesForFreeShipping,
  (subtotal, free) => (subtotal === 0 || free ? 0 : brand.shipping.flatRateCents),
);

export const selectTotalCents = createSelector(
  selectSubtotalCents,
  selectShippingCents,
  (subtotal, shipping) => subtotal + shipping,
);

/**
 * Lines that can no longer be fulfilled — the stock dropped below the quantity
 * in the cart, or the variant sold out entirely while it sat there.
 * Checkout is blocked until these are fixed.
 */
export const selectInvalidItems = createSelector(selectCartItems, (items) =>
  items.filter((item) => item.maxStock === 0 || item.quantity > item.maxStock),
);

export const selectCartIsValid = createSelector(
  selectInvalidItems,
  (invalid) => invalid.length === 0,
);

export const selectCartDrawerOpen = (state: RootState) => state.ui.cartDrawerOpen;
