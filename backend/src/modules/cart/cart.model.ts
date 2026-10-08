import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * CART MODEL
 *
 * One document per user.
 *
 * WHAT IS DELIBERATELY *NOT* STORED: price, name, image or stock. A cart is a
 * list of intentions, not a receipt — if a price changes between adding an
 * item and checking out, the shopper should see the new price, so those fields
 * are resolved from the product on every read.
 *
 * Orders are the opposite: they snapshot everything at purchase time, because
 * a receipt must not change when a product is later edited. That contrast is
 * the whole reason these are two different models.
 */

const cartItemSchema = new Schema(
  {
    /** The product this line belongs to; lets one lookup resolve the rest. */
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    /** The exact variant. Colour and size together are what gets shipped. */
    sku: { type: String, required: true, trim: true, uppercase: true },
    colorSlug: { type: String, required: true, trim: true, lowercase: true },
    size: { type: String, required: true, trim: true },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
      validate: { validator: Number.isInteger, message: "quantity must be a whole number" },
    },
    addedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const cartSchema = new Schema(
  {
    /**
     * Unique: a user has exactly one cart. The index enforces it at the
     * database level, so two concurrent "add to cart" requests from the same
     * user cannot race into two carts.
     */
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    items: { type: [cartItemSchema], default: [] },
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

/** One line per variant: the same SKU must never appear twice in a cart. */
cartSchema.index({ user: 1, "items.sku": 1 });

export type CartDoc = InferSchemaType<typeof cartSchema>;
export const Cart =
  (models.Cart as Model<InferSchemaType<typeof cartSchema>>) ?? model("Cart", cartSchema);
