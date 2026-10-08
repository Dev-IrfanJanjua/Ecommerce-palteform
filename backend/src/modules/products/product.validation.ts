import { z } from "zod";

/**
 * PRODUCT VALIDATION
 *
 * The field names mirror the frontend's `ProductQuery` type exactly, so its
 * data layer can serialise a query object straight into a query string.
 *
 * Everything here is a security boundary, not a convenience. `req.query` must
 * never reach `Model.find()`: a raw object lets a caller send
 * `?priceCents[$ne]=0` and query by operator. Only the validated, typed fields
 * below are used to build a filter.
 */

export const GENDERS = ["men", "women", "unisex"] as const;

export const SORT_OPTIONS = [
  "featured",
  "newest",
  "price-asc",
  "price-desc",
  "top-rated",
  "best-selling",
] as const;

/**
 * `?gender=men,women` and `?gender=men&gender=women` both become
 * ["men","women"], so the frontend can serialise either way.
 *
 * Written as a single transform rather than transform().pipe(): piping an
 * optional array through a second schema loses the element type, and the
 * result widens to unknown[].
 */
function csv<T extends string>(options?: {
  allowed?: readonly T[];
  lowercase?: boolean;
}) {
  return z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value, ctx): T[] | undefined => {
      if (value === undefined) return undefined;

      const parts = (Array.isArray(value) ? value : [value])
        .flatMap((part) => part.split(","))
        .map((part) => (options?.lowercase ? part.trim().toLowerCase() : part.trim()))
        .filter(Boolean);

      if (!parts.length) return undefined;

      if (options?.allowed) {
        for (const part of parts) {
          if (!options.allowed.includes(part as T)) {
            ctx.addIssue({ code: "custom", message: `Invalid value: ${part}` });
            return z.NEVER;
          }
        }
      }

      return parts as T[];
    });
}

/** Accepts "1"/"true" as true; anything else is absent rather than false, so
 *  `?onSale=0` means "do not filter" rather than "find non-sale products". */
const flag = z
  .union([z.string(), z.boolean()])
  .optional()
  .transform((value) => (value === true || value === "1" || value === "true" ? true : undefined));

export const listProductsSchema = z.object({
  query: z.object({
    collection: z.string().trim().toLowerCase().optional(),
    gender: csv({ allowed: GENDERS }),
    size: csv(),
    color: csv({ lowercase: true }),

    /** Inclusive bounds, in integer minor units (paisa). */
    minPrice: z.coerce.number().int().nonnegative().optional(),
    maxPrice: z.coerce.number().int().nonnegative().optional(),

    availability: flag,
    onSale: flag,
    isNew: flag,

    sort: z.enum(SORT_OPTIONS).optional(),

    page: z.coerce.number().int().positive().default(1),
    // Capped: an uncapped limit lets one request pull the whole collection.
    limit: z.coerce.number().int().positive().max(100).default(12),

    q: z.string().trim().min(1).max(100).optional(),
  }),
});

export const productSlugSchema = z.object({
  params: z.object({
    // Constrained rather than free text: the slug goes into a query, and a
    // narrow character set removes a whole class of injection worry.
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9-]+$/, "Invalid product slug"),
  }),
});

export const relatedProductsSchema = z.object({
  params: productSlugSchema.shape.params,
  query: z.object({
    limit: z.coerce.number().int().positive().max(24).default(4),
  }),
});

export const productRailSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().positive().max(24).default(8),
  }),
});

export type ListProductsQuery = z.infer<typeof listProductsSchema>["query"];
