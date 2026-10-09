import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * ORDER MODEL
 *
 * EVERYTHING IS SNAPSHOTTED. Name, colour, size, image and price are copied in
 * at purchase time rather than referenced.
 *
 * This is the exact opposite of the cart, and the reason is the opposite too:
 * a cart is a list of intentions, so a price change should show; an order is a
 * record of what happened, so editing a product next month must not silently
 * rewrite what someone paid last month. A receipt that changes is not a
 * receipt.
 *
 * `product` is kept as a reference too, but only for linking back — never for
 * reading price or name.
 */

export const ORDER_STATUSES = [
  "pending", // created, awaiting payment
  "paid", // payment confirmed (by Stripe webhook, later)
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Which transitions are legal.
 *
 * Encoded as data rather than a chain of ifs, so the rules are reviewable in
 * one place: an order cannot go from delivered back to pending, and a
 * cancelled order is final.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const orderItemSchema = new Schema(
  {
    /** For linking back to the product page. Never read for price or name. */
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true, trim: true, uppercase: true },

    /* --- Snapshot: what was bought, as it was at the time ---------------- */
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    colorName: { type: String, required: true },
    colorSlug: { type: String, required: true },
    size: { type: String, required: true },
    image: { type: String, default: "" },

    quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
    /** Unit price AT PURCHASE TIME, in integer minor units. */
    unitPriceCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    lineTotalCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
  },
  { _id: false },
);

const addressSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    address1: { type: String, required: true, trim: true, maxlength: 200 },
    address2: { type: String, trim: true, maxlength: 200, default: "" },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    region: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, required: true, trim: true, maxlength: 20 },
    country: { type: String, required: true, trim: true, default: "Pakistan" },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    /**
     * Human-readable reference, random rather than sequential.
     *
     * A sequential number leaks how many orders the shop has taken and invites
     * probing for other people's orders by incrementing.
     */
    orderNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },

    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    /** Snapshotted: the account's email can change after the order. */
    email: { type: String, required: true, trim: true, lowercase: true },

    items: { type: [orderItemSchema], required: true },
    shippingAddress: { type: addressSchema, required: true },

    deliveryMethod: { type: String, required: true, enum: ["standard", "express"] },
    notes: { type: String, trim: true, maxlength: 500, default: "" },

    /* --- Money: all integer minor units ---------------------------------- */
    subtotalCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    shippingCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    totalCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },

    status: { type: String, enum: ORDER_STATUSES, default: "pending", index: true },

    /** Set when stock was returned, so a double cancel cannot restock twice. */
    stockRestored: { type: Boolean, default: false },

    paidAt: { type: Date },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        // Internal bookkeeping, not something a customer needs to see.
        delete ret.stockRestored;
        return ret;
      },
    },
  },
);

/** A customer's order history, newest first. */
orderSchema.index({ user: 1, createdAt: -1 });
/** The admin dashboard's default view. */
orderSchema.index({ status: 1, createdAt: -1 });

export type OrderDoc = InferSchemaType<typeof orderSchema>;
export const Order =
  (models.Order as Model<InferSchemaType<typeof orderSchema>>) ?? model("Order", orderSchema);
