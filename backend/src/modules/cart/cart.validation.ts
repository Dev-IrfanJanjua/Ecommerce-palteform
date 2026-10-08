import { z } from "zod";

/**
 * The client sends a SKU and a quantity. It never sends a price, a product id
 * or a size — those are resolved server-side, so a request cannot assert what
 * something costs.
 */
const sku = z
  .string()
  .trim()
  .toUpperCase()
  .min(1)
  .max(120)
  .regex(/^[A-Z0-9-]+$/, "Invalid SKU");

const quantity = z.coerce.number().int().positive().max(10);

export const addItemSchema = z.object({
  body: z.object({ sku, quantity: quantity.default(1) }).strict(),
});

export const setQuantitySchema = z.object({
  params: z.object({ sku }),
  body: z.object({ quantity }).strict(),
});

export const skuParamSchema = z.object({
  params: z.object({ sku }),
});

export const mergeCartSchema = z.object({
  body: z
    .object({
      items: z.array(z.object({ sku, quantity }).strict()).max(50),
    })
    .strict(),
});

export const productSlugParamSchema = z.object({
  params: z.object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9-]+$/, "Invalid product slug"),
  }),
});
