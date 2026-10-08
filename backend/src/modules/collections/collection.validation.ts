import { z } from "zod";

export const collectionSlugSchema = z.object({
  params: z.object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9-]+$/, "Invalid collection slug"),
  }),
});
