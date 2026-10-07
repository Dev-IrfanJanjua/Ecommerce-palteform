import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** Transient UI state that several components need to agree on. */
interface UiState {
  cartDrawerOpen: boolean;
}

const initialState: UiState = { cartDrawerOpen: false };

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
  },
});

export const { setCartDrawerOpen, openCartDrawer } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
