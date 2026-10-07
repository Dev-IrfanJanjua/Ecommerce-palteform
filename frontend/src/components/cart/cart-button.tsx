"use client";

import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { selectCartCount } from "@/features/cart/selectors";
import { openCartDrawer } from "@/features/ui/ui-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/**
 * Header cart button with a live item count.
 *
 * The badge renders only once there is something in the cart, so the first
 * paint matches the server's empty-cart HTML and there is no hydration
 * mismatch when saved items load a moment later.
 */
export function CartButton() {
  const dispatch = useAppDispatch();
  const count = useAppSelector(selectCartCount);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => dispatch(openCartDrawer())}
      aria-label={count > 0 ? `Cart, ${count} items` : "Cart, empty"}
    >
      <ShoppingBag className="size-5" aria-hidden="true" />
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full text-[0.625rem] font-medium tabular-nums"
        >
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Button>
  );
}
