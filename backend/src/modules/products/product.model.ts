import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

/**
 * PRODUCT MODEL
 *
 * The shape mirrors the frontend's `Product` type so the API can be swapped in
 * without changing a single page — with two deliberate renames.
 *
 * RESERVED NAMES: Mongoose reserves `collection` and `isNew` on documents
 * (`doc.collection` is the driver Collection, `doc.isNew` is its dirty flag).
 * Using them as schema paths triggers a "may break some functionality" warning
 * and risks real breakage, so they are stored as `collectionSlug` and
 * `isNewArrival` and mapped back to `collection` / `isNew` in toJSON. The API
 * contract is unchanged; only the storage names differ.
 *
 * MONEY: integer minor units (paisa), never floats.
 */

const colorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    /** Swatch colour — product data, not theme. */
    hex: {
      type: String,
      required: true,
      trim: true,
      match: [/^#[0-9a-fA-F]{6}$/, "hex must be a 6-digit colour, e.g. #1A1A1A"],
    },
    images: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) => value.length > 0,
        message: "a colourway needs at least one image",
      },
    },
  },
  { _id: false },
);

const variantSchema = new Schema(
  {
    sku: { type: String, required: true, trim: true, uppercase: true },
    colorSlug: { type: String, required: true, trim: true, lowercase: true },
    /** EU size, stored as a string because "42.5" must stay exact. */
    size: { type: String, required: true, trim: true },
    stock: { type: Number, required: true, min: 0, default: 0, validate: Number.isInteger },
    /** Optional per-variant override; omitted unless genuinely different. */
    priceCents: { type: Number, min: 0, validate: Number.isInteger },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },

    /** Renamed: `collection` is reserved by Mongoose. */
    collectionSlug: { type: String, required: true, trim: true, lowercase: true, index: true },
    gender: { type: String, required: true, enum: ["men", "women", "unisex"], index: true },

    shortDescription: { type: String, required: true, trim: true, maxlength: 400 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    features: { type: [String], default: [] },
    material: { type: String, required: true, trim: true },
    care: { type: String, required: true, trim: true },

    priceCents: { type: Number, required: true, min: 0, validate: Number.isInteger, index: true },
    compareAtCents: { type: Number, min: 0, validate: Number.isInteger },
    currency: { type: String, required: true, trim: true, uppercase: true, minlength: 3, maxlength: 3 },

    colors: { type: [colorSchema], required: true },
    sizes: { type: [String], required: true },
    variants: { type: [variantSchema], required: true },

    rating: { type: Number, required: true, min: 0, max: 5 },
    reviewCount: { type: Number, required: true, min: 0, validate: Number.isInteger },

    tags: { type: [String], default: [], index: true },

    /** Renamed: `isNew` is reserved by Mongoose. */
    isNewArrival: { type: Boolean, default: false, index: true },
    isBestseller: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false, index: true },

    /** When the product was published — distinct from the document's own
     *  createdAt, which records when the row was written. */
    publishedAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      /**
       * Serialises to exactly the shape the frontend already consumes:
       * `id` not `_id`, `collection` not `collectionSlug`, `isNew` not
       * `isNewArrival`, and no Mongoose internals.
       */
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        ret.collection = ret.collectionSlug;
        ret.isNew = ret.isNewArrival;
        ret.createdAt = ret.publishedAt;
        delete ret._id;
        delete ret.__v;
        delete ret.collectionSlug;
        delete ret.isNewArrival;
        delete ret.publishedAt;
        delete ret.updatedAt;
        return ret;
      },
    },
  },
);

/* -------------------------------------------------------------------------- */
/* Indexes                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Compound indexes follow the queries the collection page actually makes.
 * Order matters: MongoDB can use a prefix of a compound index, so the most
 * selective equality field goes first and the sort field last.
 */
productSchema.index({ collectionSlug: 1, priceCents: 1 });
productSchema.index({ gender: 1, priceCents: 1 });
productSchema.index({ collectionSlug: 1, gender: 1 });

/** Sorting the full catalogue. */
productSchema.index({ publishedAt: -1 });
productSchema.index({ rating: -1, reviewCount: -1 });

/** Variant lookups: finding a SKU, and checking stock for a size. */
productSchema.index({ "variants.sku": 1 }, { unique: true, sparse: true });
productSchema.index({ "variants.size": 1, "variants.stock": 1 });

/** Colour facet. */
productSchema.index({ "colors.slug": 1 });

/**
 * Text search across the fields a shopper would type.
 * Weighted so a name match outranks a tag match.
 */
productSchema.index(
  { name: "text", shortDescription: "text", tags: "text" },
  { weights: { name: 10, tags: 4, shortDescription: 1 }, name: "product_text" },
);

/* -------------------------------------------------------------------------- */

export type ProductDoc = InferSchemaType<typeof productSchema>;
export type ProductHydrated = HydratedDocument<ProductDoc>;

export const Product = model("Product", productSchema);
