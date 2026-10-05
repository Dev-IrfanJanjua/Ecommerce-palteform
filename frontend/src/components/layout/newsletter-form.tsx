"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Newsletter signup — UI only. No request is sent; the email backend arrives
 * in a later phase.
 *
 * Shows the form pattern used everywhere in this project:
 *   Zod schema  -> describes what valid data looks like
 *   zodResolver -> hands that schema to React Hook Form
 *   RHF         -> tracks values, validates on submit, exposes errors
 *
 * The same schema shape is reused on the server later, so the browser and the
 * API agree on what "valid" means.
 */
const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;

export function NewsletterForm() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  async function onSubmit() {
    setSubmitted(true);
    reset();
  }

  if (submitted) {
    return (
      <p className="text-body-sm" role="status">
        Thanks — you&apos;re on the list.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full max-w-sm">
      <Label htmlFor="newsletter-email" className="text-footer-foreground text-body-sm">
        Get new arrivals and offers
      </Label>

      <div className="mt-2 flex gap-2">
        <Input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "newsletter-email-error" : undefined}
          className="bg-background text-foreground"
          {...register("email")}
        />
        <Button type="submit" variant="secondary" disabled={isSubmitting}>
          Sign up
        </Button>
      </div>

      {errors.email ? (
        <p id="newsletter-email-error" role="alert" className="text-destructive text-body-sm mt-2">
          {errors.email.message}
        </p>
      ) : null}
    </form>
  );
}
