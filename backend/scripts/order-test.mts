/**
 * ORDERS AND INVENTORY TEST — runs against the real database.
 *
 *   npm run order:test
 *
 * The centrepiece is the concurrency test: two shoppers buying the last pair
 * at the same instant. Exactly one must succeed. Everything else in this
 * module is ordinary CRUD; that one case is where money and trust are lost.
 */
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import mongoose from "mongoose";
import { createApp, API_PREFIX } from "../src/app";
import { connectDatabase, disconnectDatabase } from "../src/config/db";
import { User } from "../src/modules/users/user.model";
import { Cart } from "../src/modules/cart/cart.model";
import { Order } from "../src/modules/orders/order.model";
import { Product } from "../src/modules/products/product.model";
import { decrementStockAtomically } from "../src/modules/orders/order.service";

let fails = 0;
const check = (l: string, ok: boolean, got?: unknown) => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${l}${ok ? "" : ` — got ${JSON.stringify(got)}`}`);
  if (!ok) fails++;
};
const section = (t: string) => console.log(`\n${t}`);

await connectDatabase();
const server = createServer(createApp());
await new Promise<void>((r) => server.listen(0, r));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}${API_PREFIX}`;

const RUN = `ordertest_${Date.now()}`;
const PASSWORD = "a sufficiently long passphrase";

async function call(path: string, init: RequestInit = {}, token?: string) {
  const res = await fetch(base + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  return { status: res.status, body: (await res.json().catch(() => null)) as any };
}
const get = (p: string, t?: string) => call(p, {}, t);
const post = (p: string, b?: unknown, t?: string) =>
  call(p, { method: "POST", ...(b ? { body: JSON.stringify(b) } : {}) }, t);
const patch = (p: string, b: unknown, t?: string) =>
  call(p, { method: "PATCH", body: JSON.stringify(b) }, t);

async function makeUser(label: string, role: "customer" | "admin" = "customer") {
  const email = `${RUN}_${label}@example.com`;
  const res = await post("/auth/register", { email, password: PASSWORD, firstName: label, lastName: "T" });
  if (role === "admin") {
    await User.updateOne({ email }, { role: "admin" });
    const again = await post("/auth/login", { email, password: PASSWORD });
    return { email, token: again.body.data.accessToken as string, id: again.body.data.user.id as string };
  }
  return { email, token: res.body.data.accessToken as string, id: res.body.data.user.id as string };
}

const ADDRESS = {
  shippingAddress: {
    firstName: "Test", lastName: "Buyer", address1: "12 Jail Road, Gulberg",
    city: "Lahore", region: "Punjab", postalCode: "54000", phone: "0301 2345678",
  },
  deliveryMethod: "standard" as const,
};

const alice = await makeUser("alice");
const bob = await makeUser("bob");
const admin = await makeUser("admin", "admin");

const product = await Product.findOne({ slug: "court-classic-low" }).lean();
const variant = product!.variants.find((v) => v.stock > 5)!;
const originalStock = variant.stock;
const originalPrice = product!.priceCents;

/* ------------------------------------------------------------------ */
section("Authentication is required");
for (const [label, res] of [
  ["POST /orders", await post("/orders", ADDRESS)],
  ["GET /orders", await get("/orders")],
  ["GET /orders/:n", await get("/orders/QD-ABC234")],
] as const) check(`${label} without a token -> 401`, res.status === 401, res.status);

/* ------------------------------------------------------------------ */
section("Creating an order");

check("an empty cart cannot be ordered -> 400", (await post("/orders", ADDRESS, alice.token)).status === 400);

await post("/cart/items", { sku: variant.sku, quantity: 2 }, alice.token);
const created = await post("/orders", ADDRESS, alice.token);
check("create -> 201", created.status === 201, created.body);

const order = created.body.data;
check("has an order number", /^QD-[A-HJ-NP-Z2-9]{6}$/.test(order.orderNumber), order.orderNumber);
check("starts as pending", order.status === "pending");
check("one line, quantity 2", order.items.length === 1 && order.items[0].quantity === 2);
check("subtotal computed server-side", order.subtotalCents === originalPrice * 2, {
  got: order.subtotalCents, expected: originalPrice * 2,
});
check("shipping applied", order.shippingCents === (order.subtotalCents >= 3_000_000 ? 0 : 29_900), order.shippingCents);
check("total = subtotal + shipping", order.totalCents === order.subtotalCents + order.shippingCents);

section("The order SNAPSHOTS the product");
check("name copied in", order.items[0].name === product!.name);
check("colour and size copied in", Boolean(order.items[0].colorName && order.items[0].size));
check("unit price copied in", order.items[0].unitPriceCents === originalPrice);

// Change the product; the order must not follow.
await Product.updateOne({ _id: product!._id }, { $set: { priceCents: originalPrice + 500000, name: "RENAMED" } });
const afterEdit = await get(`/orders/${order.orderNumber}`, alice.token);
check("a later price change does NOT alter the order", afterEdit.body.data.items[0].unitPriceCents === originalPrice, afterEdit.body.data.items[0].unitPriceCents);
check("a later rename does NOT alter the order", afterEdit.body.data.items[0].name === product!.name, afterEdit.body.data.items[0].name);
await Product.updateOne({ _id: product!._id }, { $set: { priceCents: originalPrice, name: product!.name } });

section("Side effects");
const stockNow = (await Product.findOne({ "variants.sku": variant.sku }).lean())!
  .variants.find((v) => v.sku === variant.sku)!.stock;
check(`stock decremented by 2 (${originalStock} -> ${stockNow})`, stockNow === originalStock - 2, stockNow);
const cartNow = await get("/cart", alice.token);
check("the cart was emptied", cartNow.body.data.items.length === 0);

section("The client cannot dictate price or items");
await post("/cart/items", { sku: variant.sku, quantity: 1 }, alice.token);
const tampered = await post("/orders", { ...ADDRESS, totalCents: 1, items: [] }, alice.token);
check("a body carrying totals or items -> 400", tampered.status === 400, tampered.body);

/* ------------------------------------------------------------------ */
section("THE RACE: two shoppers, one pair left");

// Put exactly 1 in stock, and one in each shopper's cart.
await Product.updateOne({ "variants.sku": variant.sku }, { $set: { "variants.$.stock": 1 } });
await call("/cart", { method: "DELETE" }, alice.token);
await call("/cart", { method: "DELETE" }, bob.token);
await post("/cart/items", { sku: variant.sku, quantity: 1 }, alice.token);
await post("/cart/items", { sku: variant.sku, quantity: 1 }, bob.token);

// Fired together, deliberately not awaited in sequence.
const [raceA, raceB] = await Promise.all([
  post("/orders", ADDRESS, alice.token),
  post("/orders", ADDRESS, bob.token),
]);

const winners = [raceA, raceB].filter((r) => r.status === 201);
const losers = [raceA, raceB].filter((r) => r.status !== 201);

check("exactly ONE order succeeded", winners.length === 1, { a: raceA.status, b: raceB.status });
check("the other was refused with 409", losers.length === 1 && losers[0]!.status === 409, losers[0]?.status);
check("the refusal explains why", /does not have|no longer/i.test(String(losers[0]?.body?.message)), losers[0]?.body?.message);

const afterRace = (await Product.findOne({ "variants.sku": variant.sku }).lean())!
  .variants.find((v) => v.sku === variant.sku)!.stock;
check("stock is 0 — not -1, which would be an oversell", afterRace === 0, afterRace);

const ordersForVariant = await Order.countDocuments({
  "items.sku": variant.sku,
  user: { $in: [alice.id, bob.id] },
  status: { $ne: "cancelled" },
});
check("only the expected orders exist (no phantom order)", ordersForVariant === 2, ordersForVariant);

section("The guard itself, with no transaction to hide behind");

/**
 * The race test above passes even with a naive read-then-write guard, because
 * withTransaction retries on write conflict. That makes it a good test of
 * checkout, but a useless test OF THE GUARD — it cannot tell the two
 * implementations apart.
 *
 * This calls the guard directly, with no session, where the atomic filter is
 * the only thing preventing an oversell. Swap in a read-then-write and this
 * section fails: three concurrent buyers leave stock at -1.
 */
await Product.updateOne({ "variants.sku": variant.sku }, { $set: { "variants.$.stock": 1 } });
const contenders = await Promise.all(
  [1, 2, 3].map(() => decrementStockAtomically(product!._id, variant.sku, 1)),
);
const bareStock = (await Product.findOne({ "variants.sku": variant.sku }).lean())!
  .variants.find((v) => v.sku === variant.sku)!.stock;

check("3 concurrent decrements, exactly 1 wins", contenders.filter(Boolean).length === 1, contenders);
check("stock never goes negative without a transaction", bareStock === 0, bareStock);

await Product.updateOne({ "variants.sku": variant.sku }, { $set: { "variants.$.stock": 0 } });

/* ------------------------------------------------------------------ */
section("The loser's cart survives the failure");
const loserToken = raceA.status === 201 ? bob.token : alice.token;
const loserCart = await get("/cart", loserToken);
check("a failed order does not empty the cart", loserCart.body.data.items.length === 1, loserCart.body.data);

/* ------------------------------------------------------------------ */
section("Ownership");

const aliceOrders = await get("/orders", alice.token);
const bobOrders = await get("/orders", bob.token);
check("each user sees only their own orders", aliceOrders.body.data.every((o: any) => o.email === alice.email), aliceOrders.body.data.map((o: any) => o.email));
check("Bob's list excludes Alice's orders", bobOrders.body.data.every((o: any) => o.email === bob.email));

const aliceOrderNumber = aliceOrders.body.data[0].orderNumber;
const bobPeeking = await get(`/orders/${aliceOrderNumber}`, bob.token);
check("Bob reading Alice's order -> 404, not 403", bobPeeking.status === 404, bobPeeking.status);
check("the 404 does not confirm the order exists", !/forbidden|not allowed/i.test(String(bobPeeking.body?.message)));
check("an admin CAN read any order", (await get(`/orders/${aliceOrderNumber}`, admin.token)).status === 200);

/* ------------------------------------------------------------------ */
section("Admin routes are admin-only");
check("a customer listing all orders -> 403", (await get("/orders/admin/all", alice.token)).status === 403);
check("a customer changing status -> 403", (await patch(`/orders/admin/${aliceOrderNumber}/status`, { status: "paid" }, alice.token)).status === 403);
check("an admin can list all orders", (await get("/orders/admin/all", admin.token)).status === 200);
check("admin list can filter by status", (await get("/orders/admin/all?status=pending", admin.token)).body.data.every((o: any) => o.status === "pending"));

/* ------------------------------------------------------------------ */
section("Status transitions are enforced");

check("pending -> paid is allowed", (await patch(`/orders/admin/${aliceOrderNumber}/status`, { status: "paid" }, admin.token)).status === 200);
const illegal = await patch(`/orders/admin/${aliceOrderNumber}/status`, { status: "pending" }, admin.token);
check("paid -> pending is refused -> 409", illegal.status === 409, illegal.status);
check("the refusal names both states", /paid.*pending/i.test(String(illegal.body?.message)), illegal.body?.message);
check("paid -> shipped is allowed", (await patch(`/orders/admin/${aliceOrderNumber}/status`, { status: "shipped" }, admin.token)).status === 200);
check("shipped -> cancelled is refused", (await patch(`/orders/admin/${aliceOrderNumber}/status`, { status: "cancelled" }, admin.token)).status === 409);
check("an unknown status -> 400", (await patch(`/orders/admin/${aliceOrderNumber}/status`, { status: "refunded" }, admin.token)).status === 400);

/* ------------------------------------------------------------------ */
section("Cancelling restores stock, exactly once");

await Product.updateOne({ "variants.sku": variant.sku }, { $set: { "variants.$.stock": 5 } });
await call("/cart", { method: "DELETE" }, bob.token);
await post("/cart/items", { sku: variant.sku, quantity: 3 }, bob.token);
const toCancel = (await post("/orders", ADDRESS, bob.token)).body.data;

const beforeCancel = (await Product.findOne({ "variants.sku": variant.sku }).lean())!
  .variants.find((v) => v.sku === variant.sku)!.stock;
check(`stock dropped to ${beforeCancel} after ordering 3`, beforeCancel === 2, beforeCancel);

const cancelled = await post(`/orders/${toCancel.orderNumber}/cancel`, undefined, bob.token);
check("cancel -> 200", cancelled.status === 200, cancelled.body);
check("status is cancelled", cancelled.body.data.status === "cancelled");

const afterCancel = (await Product.findOne({ "variants.sku": variant.sku }).lean())!
  .variants.find((v) => v.sku === variant.sku)!.stock;
check(`stock restored to ${beforeCancel + 3}`, afterCancel === beforeCancel + 3, afterCancel);

// Two cancels racing must not restock twice.
const [c1, c2] = await Promise.all([
  post(`/orders/${toCancel.orderNumber}/cancel`, undefined, bob.token),
  post(`/orders/${toCancel.orderNumber}/cancel`, undefined, bob.token),
]);
check("a second cancel is refused", [c1.status, c2.status].some((s) => s === 409), { c1: c1.status, c2: c2.status });
const afterDouble = (await Product.findOne({ "variants.sku": variant.sku }).lean())!
  .variants.find((v) => v.sku === variant.sku)!.stock;
check("stock was NOT restored twice", afterDouble === afterCancel, { afterCancel, afterDouble });

check("another user cannot cancel this order -> 404", (await post(`/orders/${toCancel.orderNumber}/cancel`, undefined, alice.token)).status === 404);

/* ------------------------------------------------------------------ */
section("Cleanup");
const users = await User.find({ email: new RegExp(`^${RUN}_`) }).lean();
const ids = users.map((u) => u._id);
await Promise.all([
  Order.deleteMany({ user: { $in: ids } }),
  Cart.deleteMany({ user: { $in: ids } }),
  User.deleteMany({ _id: { $in: ids } }),
]);
await Product.updateOne({ "variants.sku": variant.sku }, { $set: { "variants.$.stock": originalStock } });
await Product.updateOne({ _id: product!._id }, { $set: { priceCents: originalPrice, name: product!.name } });

const restored = await Product.findOne({ _id: product!._id }).lean();
check("catalogue restored: stock", restored!.variants.find((v) => v.sku === variant.sku)?.stock === originalStock);
check("catalogue restored: price and name", restored!.priceCents === originalPrice && restored!.name === product!.name);
check(`removed ${ids.length} test users and their orders`, ids.length === 3);

console.log(`\n${fails === 0 ? "ALL ORDER TESTS PASSED" : fails + " FAILED"}\n`);
server.close();
await disconnectDatabase();
await mongoose.disconnect().catch(() => {});
process.exit(fails ? 1 : 0);
