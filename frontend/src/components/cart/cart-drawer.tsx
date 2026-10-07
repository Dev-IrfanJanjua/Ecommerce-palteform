"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { CartLineItem } from "./cart-line-item";
import { FreeShippingBar } from "./free-shipping-bar";
import {
  selectCartCount,
  selectCartDrawerOpen,
  selectCartIsValid,
  selectCartItems,
  selectSubtotalCents,
} from "@/features/cart/selectors";
import { setCartDrawerOpen } from "@/features/ui/ui-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { brand } from "@/config/brand";
import { formatPrice } from "@/lib/format";

/**
 * Cart drawer.
 *
 * Built on the shadcn Sheet (Radix Dialog), so focus trapping, Escape to close,
 * scroll locking and the overlay click are handled correctly rather than
 * hand-rolled.
 *
 * Checkout is blocked while any line is unfulfillable — better to stop here,
 * where the problem can be fixed, than to fail at the payment step.
 */
export function CartDrawer() {
  const dispatch = useAppDispatch();
  const open = useAppSelector(selectCartDrawerOpen);
  const items = useAppSelector(selectCartItems);
  const count = useAppSelector(selectCartCount);
  const subtotal = useAppSelector(selectSubtotalCents);
  const isValid = useAppSelector(selectCartIsValid);

  const close = () => dispatch(setCartDrawerOpen(false));

  return (
    <Sheet open={open} onOpenChange={(next) => dispatch(setCartDrawerOpen(next))}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-border border-b">
          <SheetTitle className="text-h4 text-left">
            Your cart {count > 0 ? `(${count})` : ""}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <ShoppingBag className="text-muted-foreground size-10" aria-hidden="true" />
            <p className="text-body mt-5 font-medium">Your cart is empty</p>
            <p className="text-muted-foreground text-body-sm mt-2">
              Have a look around and find your next pair.
            </p>
            <div className="mt-8 flex flex-col gap-2">
              {brand.nav.slice(0, 3).map((item) => (
                <Button key={item.href} asChild variant="outline" onClick={close}>
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="border-border border-b px-4 py-4">
              <FreeShippingBar />
            </div>

            <ul className="divide-border flex-1 divide-y overflow-y-auto px-4">
              {items.map((item) => (
                <CartLineItem key={item.sku} item={item} onNavigate={close} />
              ))}
            </ul>

            <SheetFooter className="border-border gap-3 border-t">
              <div className="flex items-center justify-between">
                <p className="text-body font-medium">Subtotal</p>
                <p className="text-body font-semibold">{formatPrice(subtotal)}</p>
              </div>
              <p className="text-muted-foreground text-body-xs">
                Shipping and taxes are calculated at checkout.
              </p>

              <Separator />

              {!isValid ? (
                <p role="alert" className="text-destructive text-body-sm">
                  Fix the highlighted items before checking out.
                </p>
              ) : null}

              <Button asChild size="lg" disabled={!isValid} onClick={close}>
                <Link href="/checkout" aria-disabled={!isValid}>
                  Checkout
                </Link>
              </Button>
              <Button variant="ghost" onClick={close}>
                Continue shopping
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
