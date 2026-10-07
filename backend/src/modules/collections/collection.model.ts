import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * COLLECTION MODEL (the storefront's six product groupings).
 *
 * The Mongo collection is named "productcollections" to avoid any confusion
 * with the database's own notion of a collection.
 */
const collectionSchema = new Schema(
  {
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    image: { type: String, required: true, trim: true },
    sortOrder: { type: Number, required: true, default: 0, index: true },
  },
  {
    collection: "productcollections",
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.createdAt;
        delete ret.updatedAt;
        return ret;
      },
    },
  },
);

export type CollectionDoc = InferSchemaType<typeof collectionSchema>;
export const ProductCollection = model("ProductCollection", collectionSchema);
