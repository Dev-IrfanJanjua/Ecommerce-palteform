import { Types } from "mongoose";
import { badRequest, notFound } from "@/common/errors/app-error";
import { Product } from "@/modules/products/product.model";
import { Wishlist } from "./wishlist.model";

/**
 * Every query is scoped by userId — see the ownership note in cart.service.ts.
 * The same rule applies here for the same reason.
 */

const MAX_ITEMS = 100;

export async function getWishlist(userId: string) {
  const wishlist = await Wishlist.findOne({ user: new Types.ObjectId(userId) }).lean();
  if (!wishlist?.products.length) return [];

  // Returns full products so the UI can render cards without a second call.
  const products = await Product.find({
    _id: { $in: wishlist.products.map((entry) => entry.product) },
  });

  // Preserve the order they were added in, newest first.
  const order = new Map(
    wishlist.products.map((entry, index) => [String(entry.product), index]),
  );
  return products.sort(
    (a, b) => (order.get(String(b._id)) ?? 0) - (order.get(String(a._id)) ?? 0),
  );
}

export async function addToWishlist(userId: string, slug: string) {
  const product = await Product.findOne({ slug }).lean();
  if (!product) throw notFound("Product not found");

  const wishlist = await Wishlist.findOneAndUpdate(
    { user: new Types.ObjectId(userId) },
    { $setOnInsert: { user: new Types.ObjectId(userId) } },
    { new: true, upsert: true },
  );

  if (wishlist.products.length >= MAX_ITEMS) {
    throw badRequest(`A wishlist can hold at most ${MAX_ITEMS} products`);
  }

  // $addToSet rather than $push: adding twice is a no-op instead of a
  // duplicate, so the endpoint is idempotent and a double-tap is harmless.
  await Wishlist.updateOne(
    { user: new Types.ObjectId(userId), "products.product": { $ne: product._id } },
    { $push: { products: { product: product._id, addedAt: new Date() } } },
  );

  return getWishlist(userId);
}

export async function removeFromWishlist(userId: string, slug: string) {
  const product = await Product.findOne({ slug }).lean();
  if (!product) throw notFound("Product not found");

  await Wishlist.updateOne(
    { user: new Types.ObjectId(userId) },
    { $pull: { products: { product: product._id } } },
  );

  return getWishlist(userId);
}
