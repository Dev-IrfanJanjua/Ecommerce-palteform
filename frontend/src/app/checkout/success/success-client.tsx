"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { clearCart } from "@/features/cart/cart-slice";
import { useAppDispatch } from "@/store/hooks";
import { brand } from "@/config/brand";
import { formatPrice } from "@/lib/format";

/**
 * Order confirmation.
 *
 * The cart is cleared HERE rather than on submit: clearing it in the form
 * would empty the drawer and header badge before this page had rendered, and
 * if navigation failed the shopper would lose their cart with no order to show
 * for it.
 *
 * Nothing real was ordered — the reference is generated client-side. Real
 * orders arrive with the backend, and the confirmation will then be fetched by
 * reference rather than passed through the URL.
 */
export function SuccessClient() {
  const params = useSearchParams();
  const dispatch = useAppDispatch();

  const orderNumber = params.get("order");
  const totalRaw = params.get("total");
  const email = params.get("email");
  const total = totalRaw && /^\d+$/.test(totalRaw) ? Number(totalRaw) : null;

  useEffect(() => {
    // dispatch, not setState — a store update, so no cascading-render warning.
    dispatch(clearCart());
  }, [dispatch]);

  if (!orderNumber) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <h1 className="text-h2">No order to show</h1>
        <p className="text-muted-foreground text-body mt-3 max-w-sm">
          This page is shown after placing an order.
        </p>
        <Button asChild className="mt-8">
          <Link href="/collections/all">Shop all shoes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl py-12 text-center">
      <CheckCircle2 className="text-success mx-auto size-14" aria-hidden="true" />

      <h1 className="text-h1 mt-6">Thank you</h1>
      <p className="text-muted-foreground text-body-lg mt-3">
        Your order is confirmed{email ? <> and a receipt is on its way to {email}</> : null}.
      </p>

      <div className="border-border bg-card rounded-card mt-10 border p-6 text-left">
        <dl className="text-body-sm space-y-3">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Order number</dt>
            <dd className="font-mono font-medium tracking-wider">{orderNumber}</dd>
          </div>
          {total !== null ? (
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Total paid</dt>
              <dd className="font-medium">{formatPrice(total)}</dd>
            </div>
          ) : null}
          <Separator />
          <div className="flex items-start gap-3">
            <Package className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p className="text-muted-foreground">
              Expected delivery in {brand.shipping.estimatedDays}. You have {brand.returns.days}{" "}
              days to return anything unworn.
            </p>
          </div>
        </dl>
      </div>

      {/* Said plainly: this project has no payment processing, and pretending
          otherwise would be dishonest to anyone demoing it. */}
      <p className="text-muted-foreground text-body-xs mt-6">
        This is a demonstration store. No payment was taken and no order was actually placed.
      </p>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/collections/all">Continue shopping</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
