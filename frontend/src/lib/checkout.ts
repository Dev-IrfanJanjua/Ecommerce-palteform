import { z } from "zod";
import { brand } from "@/config/brand";

/**
 * CHECKOUT SCHEMA AND RULES
 *
 * The same Zod schema will be reused on the server when the orders API exists,
 * so the browser and the API agree on what "valid" means. Client-side
 * validation is a convenience for the shopper, never a security boundary — the
 * server will validate this again regardless.
 */

/** Administrative units used for the address form. */
export const PK_REGIONS = [
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Islamabad Capital Territory",
  "Gilgit-Baltistan",
  "Azad Jammu and Kashmir",
] as const;

export type DeliveryMethod = "standard" | "express";

export interface DeliveryOption {
  id: DeliveryMethod;
  label: string;
  description: string;
  priceCents: number;
}

/**
 * Delivery options, priced from brand config.
 *
 * The free-shipping threshold waives the STANDARD rate only. Express is a paid
 * upgrade on top, which is the normal retail rule — and saying so explicitly
 * here stops the order summary and the free-shipping bar disagreeing.
 */
export function getDeliveryOptions(subtotalCents: number): DeliveryOption[] {
  const qualifiesForFree = subtotalCents >= brand.shipping.freeThresholdCents;

  return [
    {
      id: "standard",
      label: "Standard delivery",
      description: brand.shipping.estimatedDays,
      priceCents: qualifiesForFree ? 0 : brand.shipping.flatRateCents,
    },
    {
      id: "express",
      label: "Express delivery",
      description: brand.shipping.expressEstimatedDays,
      priceCents: brand.shipping.expressRateCents,
    },
  ];
}

export function getDeliveryPrice(method: DeliveryMethod, subtotalCents: number): number {
  return getDeliveryOptions(subtotalCents).find((o) => o.id === method)?.priceCents ?? 0;
}

/* -------------------------------------------------------------------------- */

const requiredText = (field: string, min = 2) =>
  z.string().trim().min(1, `${field} is required`).min(min, `${field} looks too short`);

export const checkoutSchema = z.object({
  // Contact
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),

  // Shipping address
  firstName: requiredText("First name"),
  lastName: requiredText("Last name"),
  address1: requiredText("Address", 5),
  address2: z.string().trim().optional(),
  city: requiredText("City"),
  region: z.enum(PK_REGIONS, { message: "Select a province" }),
  postalCode: z
    .string()
    .trim()
    .min(1, "Postal code is required")
    .regex(/^\d{5}$/, "Pakistan postal codes are 5 digits"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    // Accepts 03xxxxxxxxx, +923xxxxxxxxx and spaced or dashed variants.
    .refine(
      (value) => /^(\+92|0)?3\d{9}$/.test(value.replace(/[\s-]/g, "")),
      "Enter a valid Pakistani mobile number, e.g. 0301 2345678",
    ),

  deliveryMethod: z.enum(["standard", "express"]),
  notes: z.string().trim().max(500, "Keep notes under 500 characters").optional(),
});

export type CheckoutValues = z.infer<typeof checkoutSchema>;

/**
 * Human-readable order reference.
 *
 * Deliberately not sequential: a guessable order number leaks how many orders
 * a shop has taken, and lets someone probe for other people's orders. The real
 * identifier will be generated server-side with the order record.
 */
export function generateOrderNumber(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1
  const random = Array.from(
    { length: 6 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join("");
  return `QD-${random}`;
}
