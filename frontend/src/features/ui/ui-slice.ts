import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** Transient UI state that several components need to agree on. */
interface UiState {
  cartDrawerOpen: boolean;
  /**
   * True once the store has been read from localStorage.
   *
   * The cart is always empty on the first render (server and client must
   * agree), so "empty" and "not loaded yet" are indistinguishable without
   * this. Checkout uses it to avoid flashing "your cart is empty" at someone
   * who has items.
   */
  storeHydrated: boolean;
}

const initialState: UiState = { cartDrawerOpen: false, storeHydrated: false };

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setCartDrawerOpen(state, action: PayloadAction<boolean>) {
      state.cartDrawerOpen = action.payload;
    },
    openCartDrawer(state) {
      state.cartDrawerOpen = true;
    },
    storeHydrated(state) {
      state.storeHydrated = true;
    },
  },
});

export const { setCartDrawerOpen, openCartDrawer, storeHydrated } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
