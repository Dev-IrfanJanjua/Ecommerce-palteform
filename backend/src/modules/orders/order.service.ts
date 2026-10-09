import { randomBytes } from "node:crypto";
import mongoose, { Types } from "mongoose";
import { badRequest, conflict, forbidden, notFound } from "@/common/errors/app-error";
import { logger } from "@/common/logger";
import { Cart } from "@/modules/cart/cart.model";
import { Product } from "@/modules/products/product.model";
import { User } from "@/modules/users/user.model";
import { ALLOWED_TRANSITIONS, Order, type OrderStatus } from "./order.model";

/**
 * ORDER SERVICE
 *
 * The hard part of this module is not the CRUD — it is making sure two people
 * cannot buy the same last pair of shoes.
 */

/** Must match the frontend's brand config. */
const SHIPPING = {
  freeThresholdCents: 3_000_000, // Rs 30,000
  standardCents: 29_900, // Rs 299
  expressCents: 79_900, // Rs 799
} as const;

const CURRENCY = "PKR";

/**
 * Order reference. Random, and from an alphabet without I, O, 0 or 1 so it
 * cannot be misread over the phone.
 */
function generateOrderNumber(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  const suffix = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `QD-${suffix}`;
}

function shippingFor(method: "standard" | "express", subtotalCents: number): number {
  if (method === "express") return SHIPPING.expressCents;
  return subtotalCents >= SHIPPING.freeThresholdCents ? 0 : SHIPPING.standardCents;
}

/* -------------------------------------------------------------------------- */
/* Stock                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Decrements stock for one variant, or fails.
 *
 * THIS IS THE ANTI-OVERSELL GUARD.
 *
 * The filter includes `stock: { $gte: quantity }`, so the check and the
 * decrement are ONE atomic document update. MongoDB guarantees a single
 * document update is atomic, so of two racing requests exactly one can match —
 * the loser sees modifiedCount 0 and is told the item is gone.
 *
 * WHAT MEASUREMENT ACTUALLY SHOWED (worth recording, because the obvious
 * claim is wrong): read-then-write is NOT enough on its own. Three concurrent
 * naive decrements of a stock of 1 leave stock at -1. But inside
 * `session.withTransaction` the naive version also behaves, because MongoDB
 * raises a write conflict and withTransaction silently RETRIES the body — the
 * retry re-reads stock 0 and refuses. So callers inside a transaction are
 * protected twice over.
 *
 * The atomic filter is still the right code, for two reasons: it is correct
 * even without a transaction (the only thing standing between a future caller
 * and an oversell), and it settles the contest in one round trip instead of
 * replaying the whole transaction body.
 *
 * `decrementStockAtomically` is exported solely so the test suite can exercise
 * it without a transaction, where this property is the only thing being tested.
 */
export async function decrementStockAtomically(
  productId: Types.ObjectId,
  sku: string,
  quantity: number,
  session?: mongoose.ClientSession,
): Promise<boolean> {
  const result = await Product.updateOne(
    {
      _id: productId,
      variants: { $elemMatch: { sku, stock: { $gte: quantity } } },
    },
    { $inc: { "variants.$.stock": -quantity } },
    { session },
  );

  return result.modifiedCount === 1;
}

/** Puts stock back when an order is cancelled. */
async function restoreStock(
  productId: Types.ObjectId | unknown,
  sku: string,
  quantity: number,
  session: mongoose.ClientSession,
): Promise<void> {
  await Product.updateOne(
    { _id: productId, "variants.sku": sku },
    { $inc: { "variants.$.stock": quantity } },
    { session },
  );
}

/* -------------------------------------------------------------------------- */
/* Create                                                                      */
/* -------------------------------------------------------------------------- */

export interface CreateOrderInput {
  shippingAddress: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    region: string;
    postalCode: string;
    country?: string;
    phone: string;
  };
  deliveryMethod: "standard" | "express";
  notes?: string;
}

/**
 * Creates an order from the user's cart.
 *
 * Four things must happen together or not at all: stock comes down, the order
 * is written, the cart is emptied, and the totals are computed from prices
 * nobody but the server chose. A transaction is what makes "or not at all"
 * true — without it, a failure after decrementing stock would leave inventory
 * reduced with no order to show for it.
 *
 * Requires a replica set. Atlas is one; a standalone mongod is not.
 */
export async function createOrder(userId: string, input: CreateOrderInput) {
  const cart = await Cart.findOne({ user: new Types.ObjectId(userId) }).lean();
  if (!cart?.items.length) throw badRequest("Your cart is empty");

  const user = await User.findById(userId).lean();
  if (!user) throw notFound("Account not found");

  const session = await mongoose.startSession();

  try {
    let created: Awaited<ReturnType<typeof Order.create>>[number] | undefined;

    await session.withTransaction(async () => {
      // Prices are read here, inside the transaction, from the products
      // collection. The client never supplies a price, and the cart does not
      // store one.
      const products = await Product.find({
        _id: { $in: cart.items.map((item) => item.product) },
      })
        .session(session)
        .lean();

      const byId = new Map(products.map((product) => [String(product._id), product]));
      const orderItems = [];
      let subtotalCents = 0;

      for (const line of cart.items) {
        const product = byId.get(String(line.product));
        if (!product) throw conflict(`An item in your cart is no longer available`);

        const variant = product.variants.find((candidate) => candidate.sku === line.sku);
        const color = product.colors.find((candidate) => candidate.slug === line.colorSlug);
        if (!variant || !color) throw conflict(`${product.name} is no longer available`);

        const ok = await decrementStockAtomically(product._id, line.sku, line.quantity, session);
        if (!ok) {
          // Throwing aborts the transaction, so any stock already decremented
          // for earlier lines is rolled back automatically.
          throw conflict(
            `${product.name} (${color.name}, EU ${line.size}) does not have ${line.quantity} left`,
          );
        }

        const unitPriceCents = variant.priceCents ?? product.priceCents;
        const lineTotalCents = unitPriceCents * line.quantity;
        subtotalCents += lineTotalCents;

        orderItems.push({
          product: product._id,
          sku: line.sku,
          name: product.name,
          slug: product.slug,
          colorName: color.name,
          colorSlug: color.slug,
          size: line.size,
          image: color.images[0] ?? "",
          quantity: line.quantity,
          unitPriceCents,
          lineTotalCents,
        });
      }

      const shippingCents = shippingFor(input.deliveryMethod, subtotalCents);

      const [order] = await Order.create(
        [
          {
            orderNumber: generateOrderNumber(),
            user: new Types.ObjectId(userId),
            email: user.email,
            items: orderItems,
            shippingAddress: { ...input.shippingAddress, country: input.shippingAddress.country ?? "Pakistan" },
            deliveryMethod: input.deliveryMethod,
            notes: input.notes ?? "",
            subtotalCents,
            shippingCents,
            totalCents: subtotalCents + shippingCents,
            currency: CURRENCY,
            status: "pending",
          },
        ],
        { session },
      );

      // Emptied inside the transaction: if the order write failed, the cart
      // must still be there.
      await Cart.updateOne(
        { user: new Types.ObjectId(userId) },
        { $set: { items: [] } },
        { session },
      );

      created = order;
    });

    logger.info({ orderNumber: created?.orderNumber, userId }, "Order created");
    return created!;
  } finally {
    await session.endSession();
  }
}

/* -------------------------------------------------------------------------- */
/* Read                                                                        */
/* -------------------------------------------------------------------------- */

export async function listMyOrders(userId: string, page: number, limit: number) {
  const filter = { user: new Types.ObjectId(userId) };
  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  return { items, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

/**
 * Fetches one order, enforcing ownership.
 *
 * A customer may read only their own; an admin may read any. The check lives
 * here rather than in the controller so every caller — including a future
 * webhook handler — gets it.
 *
 * Both "wrong owner" and "does not exist" return 404 on purpose: a 403 would
 * confirm that an order number is real, which is exactly what someone
 * guessing references wants to learn.
 */
export async function getOrder(orderNumber: string, userId: string, role: string) {
  const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase() });
  if (!order) throw notFound("Order not found");

  if (role !== "admin" && String(order.user) !== userId) {
    throw notFound("Order not found");
  }

  return order;
}

/* -------------------------------------------------------------------------- */
/* Admin                                                                       */
/* -------------------------------------------------------------------------- */

export async function listAllOrders(filters: {
  status?: OrderStatus;
  page: number;
  limit: number;
}) {
  const filter = filters.status ? { status: filters.status } : {};
  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((filters.page - 1) * filters.limit)
      .limit(filters.limit),
    Order.countDocuments(filter),
  ]);

  return {
    items,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  };
}

export async function updateStatus(orderNumber: string, next: OrderStatus) {
  const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase() });
  if (!order) throw notFound("Order not found");

  const current = order.status as OrderStatus;
  if (!ALLOWED_TRANSITIONS[current].includes(next)) {
    throw conflict(`An order cannot go from ${current} to ${next}`);
  }

  if (next === "cancelled") return cancelOrder(orderNumber, String(order.user), "admin");

  order.status = next;
  if (next === "paid") order.paidAt = new Date();
  if (next === "shipped") order.shippedAt = new Date();
  if (next === "delivered") order.deliveredAt = new Date();

  await order.save();
  return order;
}

/* -------------------------------------------------------------------------- */
/* Cancel                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Cancels an order and returns its stock, atomically.
 *
 * `stockRestored` guards against restocking twice: two cancel requests racing
 * would otherwise each put the stock back, inventing inventory from nothing.
 * The flag is set inside the same transaction, so only one can win.
 */
export async function cancelOrder(orderNumber: string, userId: string, role: string) {
  const session = await mongoose.startSession();

  try {
    let result: Awaited<ReturnType<typeof Order.findOne>> = null;

    await session.withTransaction(async () => {
      const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase() }).session(session);
      if (!order) throw notFound("Order not found");

      if (role !== "admin" && String(order.user) !== userId) throw notFound("Order not found");

      const current = order.status as OrderStatus;
      if (!ALLOWED_TRANSITIONS[current].includes("cancelled")) {
        throw conflict(
          current === "cancelled"
            ? "This order is already cancelled"
            : `An order that has been ${current} cannot be cancelled`,
        );
      }

      if (!order.stockRestored) {
        for (const item of order.items) {
          await restoreStock(item.product, item.sku, item.quantity, session);
        }
        order.stockRestored = true;
      }

      order.status = "cancelled";
      order.cancelledAt = new Date();
      await order.save({ session });

      result = order;
    });

    logger.info({ orderNumber, userId }, "Order cancelled and stock restored");
    return result!;
  } finally {
    await session.endSession();
  }
}

export { forbidden };
