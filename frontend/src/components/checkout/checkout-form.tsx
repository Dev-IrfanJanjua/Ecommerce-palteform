"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrderSummary } from "./order-summary";
import { selectCartItems, selectSubtotalCents } from "@/features/cart/selectors";
import { useAppSelector } from "@/store/hooks";
import {
  checkoutSchema,
  generateOrderNumber,
  getDeliveryOptions,
  PK_REGIONS,
  type CheckoutValues,
} from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Checkout form — UI only. No payment is taken and no request is sent; the
 * orders API and Stripe arrive in later blueprint steps.
 *
 * React Hook Form + Zod, with the same schema the server will use. Errors
 * appear under their field, and `shouldFocusError` moves focus to the first
 * invalid input on submit so a keyboard or screen-reader user is taken to the
 * problem rather than left guessing why nothing happened.
 */
export function CheckoutForm() {
  const router = useRouter();
  const items = useAppSelector(selectCartItems);
  const subtotal = useAppSelector(selectSubtotalCents);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    shouldFocusError: true,
    defaultValues: { deliveryMethod: "standard", address2: "", notes: "" },
  });

  // useWatch subscribes to just this field. `watch()` re-renders the whole
  // form on every keystroke, and React Compiler cannot memoize around it.
  const deliveryMethod = useWatch({ control, name: "deliveryMethod" });
  const deliveryOptions = getDeliveryOptions(subtotal);

  async function onSubmit(values: CheckoutValues) {
    // Where the orders API call will go. For now: mint a reference, hand it to
    // the success page, and let that page clear the cart — clearing it here
    // would empty the cart before the confirmation had rendered.
    const orderNumber = generateOrderNumber();
    const total =
      subtotal + (deliveryOptions.find((o) => o.id === values.deliveryMethod)?.priceCents ?? 0);

    router.push(
      `/checkout/success?order=${encodeURIComponent(orderNumber)}&total=${total}&email=${encodeURIComponent(values.email)}`,
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="lg:grid lg:grid-cols-[1fr_24rem] lg:items-start lg:gap-12"
    >
      {/* First in the DOM so mobile sees the summary above the form, but placed
          in the right-hand column on desktop. OrderSummary renders its own
          mobile and desktop variants, so it is used once here. */}
      <div className="lg:col-start-2 lg:row-start-1">
        <OrderSummary deliveryMethod={deliveryMethod} />
      </div>

      <div className="mt-8 space-y-10 lg:col-start-1 lg:row-start-1 lg:mt-0">
        {/* ---------------- Contact ---------------- */}
        <section>
          <h2 className="text-h4">Contact</h2>
          <p className="text-muted-foreground text-body-sm mt-1">
            We will send your order confirmation here.
          </p>

          <Field id="email" label="Email" error={errors.email?.message} className="mt-4">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
          </Field>
        </section>

        {/* ---------------- Shipping address ---------------- */}
        <section>
          <h2 className="text-h4">Shipping address</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field id="firstName" label="First name" error={errors.firstName?.message}>
              <Input
                id="firstName"
                autoComplete="given-name"
                aria-invalid={Boolean(errors.firstName)}
                {...register("firstName")}
              />
            </Field>

            <Field id="lastName" label="Last name" error={errors.lastName?.message}>
              <Input
                id="lastName"
                autoComplete="family-name"
                aria-invalid={Boolean(errors.lastName)}
                {...register("lastName")}
              />
            </Field>

            <Field
              id="address1"
              label="Address"
              error={errors.address1?.message}
              className="sm:col-span-2"
            >
              <Input
                id="address1"
                autoComplete="address-line1"
                placeholder="House and street"
                aria-invalid={Boolean(errors.address1)}
                {...register("address1")}
              />
            </Field>

            <Field
              id="address2"
              label="Apartment, suite, etc."
              optional
              error={errors.address2?.message}
              className="sm:col-span-2"
            >
              <Input id="address2" autoComplete="address-line2" {...register("address2")} />
            </Field>

            <Field id="city" label="City" error={errors.city?.message}>
              <Input
                id="city"
                autoComplete="address-level2"
                aria-invalid={Boolean(errors.city)}
                {...register("city")}
              />
            </Field>

            <Field id="region" label="Province" error={errors.region?.message}>
              {/* Radix Select is not a native <select>, so it cannot be
                  registered directly. Controller is RHF's supported way to
                  bind a controlled third-party input. */}
              <Controller
                control={control}
                name="region"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="region"
                      aria-invalid={Boolean(errors.region)}
                      className="w-full"
                      onBlur={field.onBlur}
                    >
                      <SelectValue placeholder="Select a province" />
                    </SelectTrigger>
                    <SelectContent>
                      {PK_REGIONS.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field id="postalCode" label="Postal code" error={errors.postalCode?.message}>
              <Input
                id="postalCode"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="54000"
                aria-invalid={Boolean(errors.postalCode)}
                {...register("postalCode")}
              />
            </Field>

            <Field id="phone" label="Phone" error={errors.phone?.message}>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0301 2345678"
                aria-invalid={Boolean(errors.phone)}
                {...register("phone")}
              />
            </Field>
          </div>
        </section>

        {/* ---------------- Delivery ---------------- */}
        <section>
          <h2 className="text-h4">Delivery</h2>

          <Controller
            control={control}
            name="deliveryMethod"
            render={({ field }) => (
              <RadioGroup value={field.value} onValueChange={field.onChange} className="mt-4 gap-3">
                {deliveryOptions.map((option) => (
                  <Label
                    key={option.id}
                    htmlFor={`delivery-${option.id}`}
                    className={cn(
                      "rounded-card flex cursor-pointer items-center justify-between gap-4 border p-4 transition-colors",
                      deliveryMethod === option.id
                        ? "border-primary bg-muted"
                        : "border-border hover:bg-muted/60",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <RadioGroupItem value={option.id} id={`delivery-${option.id}`} />
                      <span>
                        <span className="text-body-sm block font-medium">{option.label}</span>
                        <span className="text-muted-foreground text-body-xs block">
                          {option.description}
                        </span>
                      </span>
                    </span>
                    <span className="text-body-sm font-medium">
                      {option.priceCents === 0 ? (
                        <span className="text-success">Free</span>
                      ) : (
                        formatPrice(option.priceCents)
                      )}
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            )}
          />
        </section>

        {/* ---------------- Payment ---------------- */}
        <section>
          <h2 className="text-h4">Payment</h2>
          <div className="border-border bg-muted/40 rounded-card mt-4 border border-dashed p-5">
            <p className="text-body-sm flex items-center gap-2 font-medium">
              <CreditCard className="size-4" aria-hidden="true" />
              Payment is not connected yet
            </p>
            <p className="text-muted-foreground text-body-sm mt-2">
              This is a demonstration checkout. No card details are collected and no money is taken.
              Card payment arrives when Stripe is integrated.
            </p>
          </div>
        </section>

        {/* ---------------- Notes ---------------- */}
        <section>
          <h2 className="text-h4">Order notes</h2>
          <Field id="notes" label="Anything we should know?" optional error={errors.notes?.message}>
            <textarea
              id="notes"
              rows={3}
              className="border-input bg-card rounded-input focus-visible:ring-ring text-body-sm mt-1 w-full border px-3 py-2 focus-visible:ring-2 focus-visible:outline-none"
              placeholder="Delivery instructions, landmark, preferred timing"
              {...register("notes")}
            />
          </Field>
        </section>

        <div>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting || !items.length}
          >
            <Lock className="size-4" aria-hidden="true" />
            {isSubmitting ? "Placing order…" : "Place order"}
          </Button>
          <p className="text-muted-foreground text-body-xs mt-3 text-center">
            By placing this order you agree to our terms and privacy policy.
          </p>
        </div>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */

/** Label + control + error message, wired together for screen readers. */
function Field({
  id,
  label,
  error,
  optional,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="text-body-sm">
        {label}
        {optional ? <span className="text-muted-foreground font-normal"> (optional)</span> : null}
      </Label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-destructive text-body-xs mt-1.5">
          {error}
        </p>
      ) : null}
    </div>
  );
}
