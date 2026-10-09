import { z } from "zod";
import { ORDER_STATUSES } from "./order.model";

const text = (field: string, max = 200, min = 1) =>
  z.string().trim().min(min, `${field} is required`).max(max);

/**
 * The client sends an address and a delivery choice. It does NOT send items,
 * prices or totals — those come from the cart and the catalogue, server-side.
 * .strict() makes an attempt to send them a visible 400.
 */
export const createOrderSchema = z.object({
  body: z
    .object({
      shippingAddress: z
        .object({
          firstName: text("First name", 80),
          lastName: text("Last name", 80),
          address1: text("Address", 200, 5),
          address2: z.string().trim().max(200).optional(),
          city: text("City", 100),
          region: text("Province", 100),
          postalCode: z
            .string()
            .trim()
            .regex(/^\d{5}$/, "Pakistan postal codes are 5 digits"),
          country: z.string().trim().max(80).optional(),
          phone: z
            .string()
            .trim()
            .refine(
              (value) => /^(\+92|0)?3\d{9}$/.test(value.replace(/[\s-]/g, "")),
              "Enter a valid Pakistani mobile number",
            ),
        })
        .strict(),
      deliveryMethod: z.enum(["standard", "express"]),
      notes: z.string().trim().max(500).optional(),
    })
    .strict(),
});

const orderNumber = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^QD-[A-HJ-NP-Z2-9]{6}$/, "Invalid order number");

export const orderNumberSchema = z.object({ params: z.object({ orderNumber }) });

export const listOrdersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(10),
  }),
});

export const listAllOrdersSchema = z.object({
  query: z.object({
    status: z.enum(ORDER_STATUSES).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

export const updateStatusSchema = z.object({
  params: z.object({ orderNumber }),
  body: z.object({ status: z.enum(ORDER_STATUSES) }).strict(),
});
