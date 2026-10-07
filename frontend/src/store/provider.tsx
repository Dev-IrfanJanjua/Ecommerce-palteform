"use client";

import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { cartHydrated, cartStateSchema } from "@/features/cart/cart-slice";
import { makeStore, type AppStore } from "./index";

const STORAGE_KEY = "qadam:cart";

/**
 * Redux provider plus localStorage persistence.
 *
 * HYDRATION SAFETY: the store always starts empty, on both the server and the
 * first client render, so the two agree. Saved items are loaded afterwards in
 * an effect, which only runs in the browser. Reading localStorage during the
 * first render would produce different HTML on each side and React would throw
 * a hydration error.
 *
 * Stored data is parsed with Zod rather than trusted: it can be stale from an
 * older version of the app, or edited by hand in devtools. Anything that does
 * not match the schema is discarded.
 */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Lazy useState initialiser: makeStore() runs exactly once for the lifetime
  // of this component and never on a re-render. (The ref-assignment pattern in
  // older Redux docs reads a ref during render, which React 19's lint rejects.)
  const [store] = useState<AppStore>(makeStore);

  useEffect(() => {
    // --- Load ---------------------------------------------------------------
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = cartStateSchema.safeParse(JSON.parse(raw));
        if (parsed.success) {
          // dispatch, not setState — this is a store update, so it does not
          // trigger the cascading-render warning a synchronous setState would.
          store.dispatch(cartHydrated(parsed.data));
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // Private browsing, blocked storage or corrupt JSON — start empty.
    }

    // --- Save ---------------------------------------------------------------
    const unsubscribe = store.subscribe(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store.getState().cart));
      } catch {
        // Storage full or unavailable; the cart still works for this session.
      }
    });

    return unsubscribe;
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
}
