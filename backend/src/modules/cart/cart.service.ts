import { Types } from "mongoose";
import { badRequest, notFound } from "@/common/errors/app-error";
import { Product } from "@/modules/products/product.model";
import { Cart } from "./cart.model";

/**
 * CART SERVICE
 *
 * OWNERSHIP IS THE POINT OF THIS MODULE. Every function takes a userId and
 * scopes its query by it — `Cart.findOne({ user: userId })`, never
 * `Cart.findById(cartId)`. A cart id is not a secret; a request must not be
 * able to name which cart it wants. This is the "broken access control" item
 * at the top of the OWASP Top 10, and it is an omission rather than a
 * mistake, which is why it is stated here rather than assumed.
 *
 * Prices, names, images and stock are resolved from the products collection on
 * every read, so a cart can never show a stale price or sell something that
 * has since sold out.
 */

/** A cart line with everything the UI needs, resolved from the live product. */
export interface ResolvedCartItem {
  sku: string;
  productId: string;
  slug: string;
  name: string;
  collection: string;
  colorSlug: string;
  colorName: string;
  colorHex: string;
  size: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  /** Stock for THIS variant right now. */
  maxStock: number;
  /** True when the line can no longer be fulfilled as it stands. */
  unavailable: boolean;
  unavailableReason?: "sold out" | "insufficient stock" | "no longer sold";
}

export interface ResolvedCart {
  items: ResolvedCartItem[];
  itemCount: number;
  subtotalCents: number;
  /** False while any line is unfulfillable — checkout must be blocked. */
  isValid: boolean;
}

const MAX_QUANTITY_PER_LINE = 10;
const MAX_DISTINCT_LINES = 50;

/* -------------------------------------------------------------------------- */

async function getOrCreateCart(userId: string) {
  // upsert, not find-then-create: two concurrent adds would otherwise both see
  // "no cart" and try to insert, and the unique index would reject one of them.
  return Cart.findOneAndUpdate(
    { user: new Types.ObjectId(userId) },
    { $setOnInsert: { user: new Types.ObjectId(userId), items: [] } },
    { new: true, upsert: true },
  );
}

/**
 * Joins the stored lines against the live products.
 *
 * A line whose product was deleted, or whose variant vanished, is kept and
 * flagged rather than silently dropped — a cart that quietly empties itself is
 * far more alarming to a shopper than one that explains the problem.
 */
async function resolveCart(items: CartLine[]): Promise<ResolvedCart> {
  if (items.length === 0) {
    return { items: [], itemCount: 0, subtotalCents: 0, isValid: true };
  }

  const products = await Product.find({
    _id: { $in: items.map((item) => item.product) },
  }).lean();

  const byId = new Map(products.map((product) => [String(product._id), product]));

  const resolved: ResolvedCartItem[] = [];

  for (const line of items) {
    const product = byId.get(String(line.product));

    if (!product) {
      resolved.push(deadLine(line, "no longer sold"));
      continue;
    }

    const variant = product.variants.find((candidate) => candidate.sku === line.sku);
    const color = product.colors.find((candidate) => candidate.slug === line.colorSlug);

    if (!variant || !color) {
      resolved.push(deadLine(line, "no longer sold", product.name));
      continue;
    }

    const unitPriceCents = variant.priceCents ?? product.priceCents;
    const maxStock = variant.stock;

    resolved.push({
      sku: line.sku,
      productId: String(product._id),
      slug: product.slug,
      name: product.name,
      collection: product.collectionSlug,
      colorSlug: color.slug,
      colorName: color.name,
      colorHex: color.hex,
      size: line.size,
      quantity: line.quantity,
      unitPriceCents,
      lineTotalCents: unitPriceCents * line.quantity,
      maxStock,
      unavailable: maxStock === 0 || line.quantity > maxStock,
      ...(maxStock === 0
        ? { unavailableReason: "sold out" as const }
        : line.quantity > maxStock
          ? { unavailableReason: "insufficient stock" as const }
          : {}),
    });
  }

  return {
    items: resolved,
    itemCount: resolved.reduce((sum, item) => sum + item.quantity, 0),
    // Unavailable lines are excluded from the subtotal: showing a total that
    // includes something unbuyable sets up a nasty surprise at checkout.
    subtotalCents: resolved
      .filter((item) => !item.unavailable)
      .reduce((sum, item) => sum + item.lineTotalCents, 0),
    isValid: resolved.every((item) => !item.unavailable),
  };
}

interface CartLine {
  product: Types.ObjectId | unknown;
  sku: string;
  colorSlug: string;
  size: string;
  quantity: number;
}

function deadLine(line: CartLine, reason: "no longer sold", name = "This item"): ResolvedCartItem {
  return {
    sku: line.sku,
    productId: String(line.product),
    slug: "",
    name,
    collection: "",
    colorSlug: line.colorSlug,
    colorName: "",
    colorHex: "#000000",
    size: line.size,
    quantity: line.quantity,
    unitPriceCents: 0,
    lineTotalCents: 0,
    maxStock: 0,
    unavailable: true,
    unavailableReason: reason,
  };
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

export async function getCart(userId: string): Promise<ResolvedCart> {
  const cart = await Cart.findOne({ user: new Types.ObjectId(userId) }).lean();
  return resolveCart((cart?.items ?? []) as CartLine[]);
}

export async function addItem(
  userId: string,
  input: { sku: string; quantity: number },
): Promise<ResolvedCart> {
  // The SKU is the only thing the client sends. Everything else — which
  // product, which colour, which size, what it costs — is looked up here, so a
  // request cannot claim a size or price that does not exist.
  const product = await Product.findOne({ "variants.sku": input.sku }).lean();
  if (!product) throw notFound("That product option does not exist");

  const variant = product.variants.find((candidate) => candidate.sku === input.sku);
  if (!variant) throw notFound("That product option does not exist");
  if (variant.stock === 0) throw badRequest("That option is sold out");

  const cart = await getOrCreateCart(userId);
  const existing = cart.items.find((item) => item.sku === input.sku);

  if (!existing && cart.items.length >= MAX_DISTINCT_LINES) {
    throw badRequest(`A cart can hold at most ${MAX_DISTINCT_LINES} different items`);
  }

  // Clamped rather than rejected: asking for 5 when 3 remain should put 3 in
  // the cart and say so, not fail. The response carries maxStock so the UI can
  // explain the adjustment.
  const requested = (existing?.quantity ?? 0) + input.quantity;
  const quantity = Math.min(requested, variant.stock, MAX_QUANTITY_PER_LINE);

  if (existing) {
    existing.quantity = quantity;
  } else {
    cart.items.push({
      product: product._id,
      sku: input.sku,
      colorSlug: variant.colorSlug,
      size: variant.size,
      quantity,
      addedAt: new Date(),
    });
  }

  await cart.save();
  return resolveCart(cart.items as CartLine[]);
}

export async function setQuantity(
  userId: string,
  sku: string,
  quantity: number,
): Promise<ResolvedCart> {
  const cart = await Cart.findOne({ user: new Types.ObjectId(userId) });
  if (!cart) throw notFound("Cart not found");

  const line = cart.items.find((item) => item.sku === sku);
  if (!line) throw notFound("That item is not in your cart");

  const product = await Product.findOne({ "variants.sku": sku }).lean();
  const stock = product?.variants.find((v) => v.sku === sku)?.stock ?? 0;
  if (stock === 0) throw badRequest("That option is sold out");

  line.quantity = Math.min(quantity, stock, MAX_QUANTITY_PER_LINE);
  await cart.save();

  return resolveCart(cart.items as CartLine[]);
}

export async function removeItem(userId: string, sku: string): Promise<ResolvedCart> {
  const cart = await Cart.findOneAndUpdate(
    { user: new Types.ObjectId(userId) },
    { $pull: { items: { sku } } },
    { new: true },
  );
  return resolveCart((cart?.items ?? []) as CartLine[]);
}

export async function clearCart(userId: string): Promise<ResolvedCart> {
  await Cart.findOneAndUpdate(
    { user: new Types.ObjectId(userId) },
    { $set: { items: [] } },
    { upsert: true },
  );
  return { items: [], itemCount: 0, subtotalCents: 0, isValid: true };
}

/**
 * Merges a guest cart into the user's cart on sign-in.
 *
 * Quantities are summed and then clamped, rather than the guest cart replacing
 * the stored one: someone who added items on their phone and then signed in
 * should not silently lose either set.
 */
export async function mergeCart(
  userId: string,
  guestItems: { sku: string; quantity: number }[],
): Promise<ResolvedCart> {
  let cart = await getCart(userId);

  for (const item of guestItems) {
    try {
      cart = await addItem(userId, item);
    } catch {
      // A guest cart can contain something since deleted or sold out. Skip it
      // rather than failing the whole sign-in.
    }
  }

  return cart;
}
