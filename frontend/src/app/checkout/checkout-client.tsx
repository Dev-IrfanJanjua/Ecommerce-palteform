"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { selectCartItems } from "@/features/cart/selectors";
import { useAppSelector } from "@/store/hooks";
import { brand } from "@/config/brand";

/**
 * The cart lives in the browser, so checkout cannot be server-rendered from it.
 *
 * On the very first render the store is always empty (see store/provider.tsx),
 * and saved items arrive a tick later. Showing the empty state immediately
 * would flash "your cart is empty" at someone who has items, so `hydrated`
 * gates it until the store has actually been read.
 */
export function CheckoutClient() {
  const items = useAppSelector(selectCartItems);
  const hydrated = useAppSelector((state) => state.ui.storeHydrated);

  if (!hydrated) {
    return (
      <div className="py-24 text-center" aria-busy="true">
        <p className="text-muted-foreground text-body-sm">Loading your cart…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <ShoppingBag className="text-muted-foreground size-10" aria-hidden="true" />
        <h2 className="text-h3 mt-6">Your cart is empty</h2>
        <p className="text-muted-foreground text-body mt-2 max-w-sm">
          Add something to it before checking out.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {brand.nav.slice(0, 3).map((item) => (
            <Button key={item.href} asChild variant="outline">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return <CheckoutForm />;
}
