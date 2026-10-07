import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { z } from "zod";

/**
 * CART STATE
 *
 * Items are keyed by variant SKU, because the same product in two sizes is two
 * different things to buy. Prices are integer paisa, copied in at the moment of
 * adding — the cart must not silently re-price itself if the catalogue changes.
 *
 * This is client state (Redux), not server state. When the real API arrives the
 * cart moves server-side, but the shape here already matches what it will send.
 */

/** Validated on read from localStorage — never trust stored data. */
const cartItemSchema = z.object({
  sku: z.string().min(1),
  productId: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  colorName: z.string(),
  colorSlug: z.string(),
  colorHex: z.string(),
  collection: z.string(),
  size: z.string(),
  unitPriceCents: z.number().int().nonnegative(),
  image: z.string(),
  quantity: z.number().int().positive(),
  maxStock: z.number().int().nonnegative(),
});

export const cartStateSchema = z.object({
  items: z.array(cartItemSchema),
});

export type CartItem = z.infer<typeof cartItemSchema>;
export interface CartState {
  items: CartItem[];
}

const initialState: CartState = { items: [] };

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    /** Replaces state from localStorage. Dispatched once, after mount. */
    cartHydrated(_state, action: PayloadAction<CartState>) {
      return action.payload;
    },

    addItem(state, action: PayloadAction<CartItem>) {
      const incoming = action.payload;
      const existing = state.items.find((item) => item.sku === incoming.sku);

      if (existing) {
        // Adding more of something already in the cart tops up the quantity,
        // but never past what is actually in stock.
        existing.quantity = Math.min(existing.quantity + incoming.quantity, incoming.maxStock);
        existing.maxStock = incoming.maxStock;
        existing.unitPriceCents = incoming.unitPriceCents;
      } else {
        state.items.push({
          ...incoming,
          quantity: Math.min(incoming.quantity, incoming.maxStock),
        });
      }
    },

    setQuantity(state, action: PayloadAction<{ sku: string; quantity: number }>) {
      const item = state.items.find((i) => i.sku === action.payload.sku);
      if (!item) return;
      const next = Math.max(1, Math.min(action.payload.quantity, item.maxStock));
      item.quantity = next;
    },

    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.sku !== action.payload);
    },

    clearCart(state) {
      state.items = [];
    },
  },
});

export const { cartHydrated, addItem, setQuantity, removeItem, clearCart } = cartSlice.actions;
export const cartReducer = cartSlice.reducer;
