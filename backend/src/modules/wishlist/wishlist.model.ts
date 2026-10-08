import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * WISHLIST MODEL
 *
 * One document per user, holding product references only — a wishlist is
 * "remember this", not "I intend to buy this at this price", so there is
 * nothing to snapshot.
 */
const wishlistSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    products: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        addedAt: { type: Date, default: () => new Date() },
        _id: false,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export type WishlistDoc = InferSchemaType<typeof wishlistSchema>;
export const Wishlist =
  (models.Wishlist as Model<InferSchemaType<typeof wishlistSchema>>) ??
  model("Wishlist", wishlistSchema);
