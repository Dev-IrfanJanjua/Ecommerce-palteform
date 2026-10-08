/**
 * CART AND WISHLIST TEST — runs against the real database.
 *
 *   npm run cart:test
 *
 * The centre of gravity is ownership: two real users exist throughout, and
 * every operation is checked for leakage between them. Broken access control
 * is the top item on the OWASP Top 10 and the thing this module could
 * plausibly get wrong.
 */
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import mongoose from "mongoose";
import { createApp, API_PREFIX } from "../src/app";
import { connectDatabase, disconnectDatabase } from "../src/config/db";
import { User } from "../src/modules/users/user.model";
import { Cart } from "../src/modules/cart/cart.model";
import { Wishlist } from "../src/modules/wishlist/wishlist.model";
import { Product } from "../src/modules/products/product.model";

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

const RUN = `carttest_${Date.now()}`;
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
const post = (p: string, b: unknown, t?: string) =>
  call(p, { method: "POST", body: JSON.stringify(b) }, t);
const patch = (p: string, b: unknown, t?: string) =>
  call(p, { method: "PATCH", body: JSON.stringify(b) }, t);
const del = (p: string, t?: string) => call(p, { method: "DELETE" }, t);
const put = (p: string, t?: string) => call(p, { method: "PUT" }, t);

async function makeUser(label: string) {
  const email = `${RUN}_${label}@example.com`;
  const res = await post("/auth/register", {
    email,
    password: PASSWORD,
    firstName: label,
    lastName: "Test",
  });
  return { email, token: res.body.data.accessToken as string, id: res.body.data.user.id as string };
}

const alice = await makeUser("alice");
const bob = await makeUser("bob");

// Real SKUs from the seeded catalogue.
const inStock = await Product.findOne({ slug: "court-classic-low" }).lean();
const sku = inStock!.variants.find((v) => v.stock > 2)!.sku;
const otherSku = inStock!.variants.find((v) => v.stock > 2 && v.sku !== sku)!.sku;
const soldOut = await Product.findOne({ slug: "pool-clog" }).lean();
const soldOutSku = soldOut!.variants[0]!.sku;
const lowStock = await Product.findOne({ slug: "tempo-racer" }).lean();
const lowVariant = lowStock!.variants.reduce((a, b) => (a.stock < b.stock ? a : b));

/* ------------------------------------------------------------------ */
section("Every cart route requires authentication");
for (const [label, res] of [
  ["GET /cart", await get("/cart")],
  ["POST /cart/items", await post("/cart/items", { sku })],
  ["PATCH /cart/items/:sku", await patch(`/cart/items/${sku}`, { quantity: 1 })],
  ["DELETE /cart/items/:sku", await del(`/cart/items/${sku}`)],
  ["DELETE /cart", await del("/cart")],
  ["GET /wishlist", await get("/wishlist")],
  ["PUT /wishlist/:slug", await put("/wishlist/court-classic-low")],
] as const) {
  check(`${label} without a token -> 401`, res.status === 401, res.status);
}

/* ------------------------------------------------------------------ */
section("Adding to a cart");

const empty = await get("/cart", alice.token);
check("a new user starts with an empty cart", empty.body.data.items.length === 0, empty.body.data);
check("empty cart is valid", empty.body.data.isValid === true);

const added = await post("/cart/items", { sku, quantity: 2 }, alice.token);
check("add -> 200", added.status === 200, added.body);
check("one line", added.body.data.items.length === 1);
check("quantity 2", added.body.data.items[0].quantity === 2);
check("itemCount 2", added.body.data.itemCount === 2);

section("Price is resolved from the product, never sent by the client");
const line = added.body.data.items[0];
check("unit price matches the catalogue", line.unitPriceCents === inStock!.priceCents, {
  line: line.unitPriceCents,
  product: inStock!.priceCents,
});
check("line total is price x quantity", line.lineTotalCents === inStock!.priceCents * 2);
check("subtotal matches", added.body.data.subtotalCents === inStock!.priceCents * 2);
check("reports current stock", typeof line.maxStock === "number" && line.maxStock > 0);
check("resolves the product name", line.name === inStock!.name);

// A client claiming a price must have no effect — the field is not even accepted.
const priceAttack = await post(
  "/cart/items",
  { sku, quantity: 1, unitPriceCents: 1, priceCents: 1 },
  alice.token,
);
check("a body asserting a price is REJECTED (400)", priceAttack.status === 400, priceAttack.body);

/* ------------------------------------------------------------------ */
section("Ownership — the point of this module");

const bobCart = await get("/cart", bob.token);
check("Bob's cart is empty while Alice's has an item", bobCart.body.data.items.length === 0, bobCart.body.data);

// Bob tries to operate on the SKU sitting in Alice's cart.
const bobPatch = await patch(`/cart/items/${sku}`, { quantity: 9 }, bob.token);
check("Bob cannot change a line he does not have -> 404", bobPatch.status === 404, bobPatch.status);

const bobDelete = await del(`/cart/items/${sku}`, bob.token);
check("Bob deleting it is a no-op on his own cart", bobDelete.status === 200 && bobDelete.body.data.items.length === 0);

const aliceAfter = await get("/cart", alice.token);
check("Alice's cart is untouched by Bob", aliceAfter.body.data.items.length === 1 && aliceAfter.body.data.items[0].quantity === 2, aliceAfter.body.data);

await post("/cart/items", { sku: otherSku, quantity: 1 }, bob.token);
await del("/cart", bob.token);
const aliceStillThere = await get("/cart", alice.token);
check("Bob clearing HIS cart does not clear Alice's", aliceStillThere.body.data.items.length === 1);

section("Carts are stored per user");
const carts = await Cart.find({ user: { $in: [alice.id, bob.id] } }).lean();
check("two separate cart documents", carts.length === 2, carts.length);
check("each belongs to one user", new Set(carts.map((c) => String(c.user))).size === 2);

/* ------------------------------------------------------------------ */
section("Quantity rules");

const topUp = await post("/cart/items", { sku, quantity: 3 }, alice.token);
check("adding the same SKU tops up rather than duplicating", topUp.body.data.items.length === 1);
check("quantity is now 5", topUp.body.data.items[0].quantity === 5, topUp.body.data.items[0].quantity);

const overCap = await post("/cart/items", { sku, quantity: 99 }, alice.token);
check("quantity above the per-line cap is rejected (400)", overCap.status === 400, overCap.status);

const setZero = await patch(`/cart/items/${sku}`, { quantity: 0 }, alice.token);
check("quantity 0 is rejected -> 400", setZero.status === 400, setZero.status);

const setOne = await patch(`/cart/items/${sku}`, { quantity: 1 }, alice.token);
check("quantity can be reduced", setOne.body.data.items[0].quantity === 1);

/* ------------------------------------------------------------------ */
section("Stock is enforced by the server");

const soldOutAdd = await post("/cart/items", { sku: soldOutSku, quantity: 1 }, alice.token);
check("a sold-out variant cannot be added -> 400", soldOutAdd.status === 400, soldOutAdd.body);

const clamped = await post("/cart/items", { sku: lowVariant.sku, quantity: 10 }, alice.token);
const clampedLine = clamped.body.data.items.find((i: any) => i.sku === lowVariant.sku);
check(
  `asking for 10 of a variant with ${lowVariant.stock} clamps to ${lowVariant.stock}`,
  clampedLine?.quantity === lowVariant.stock,
  clampedLine?.quantity,
);
check("the response reports the real stock so the UI can explain", clampedLine?.maxStock === lowVariant.stock);
check("the clamped line is still valid", clampedLine?.unavailable === false);

const unknownSku = await post("/cart/items", { sku: "QADAM-DOES-NOT-EXIST-99" }, alice.token);
check("an unknown SKU -> 404", unknownSku.status === 404, unknownSku.status);

/* ------------------------------------------------------------------ */
section("Stock changing underneath a cart");

// Simulate the variant selling out after it was added.
await Product.updateOne(
  { "variants.sku": lowVariant.sku },
  { $set: { "variants.$.stock": 0 } },
);
const stale = await get("/cart", alice.token);
const staleLine = stale.body.data.items.find((i: any) => i.sku === lowVariant.sku);
check("the line is flagged unavailable", staleLine?.unavailable === true, staleLine);
check("with a reason the UI can show", staleLine?.unavailableReason === "sold out", staleLine?.unavailableReason);
check("the cart is no longer valid, so checkout must stop", stale.body.data.isValid === false);
check(
  "the unbuyable line is excluded from the subtotal",
  stale.body.data.subtotalCents === stale.body.data.items.filter((i: any) => !i.unavailable).reduce((s: number, i: any) => s + i.lineTotalCents, 0),
);

// Restore, so the suite leaves the catalogue as it found it.
await Product.updateOne(
  { "variants.sku": lowVariant.sku },
  { $set: { "variants.$.stock": lowVariant.stock } },
);

section("Price changes are reflected, not frozen");
const original = inStock!.priceCents;
await Product.updateOne({ _id: inStock!._id }, { $set: { priceCents: original + 100000 } });
const reprice = await get("/cart", alice.token);
const repriced = reprice.body.data.items.find((i: any) => i.sku === sku);
check("the cart shows the NEW price", repriced?.unitPriceCents === original + 100000, repriced?.unitPriceCents);
await Product.updateOne({ _id: inStock!._id }, { $set: { priceCents: original } });

/* ------------------------------------------------------------------ */
section("Merging a guest cart on sign-in");

await del("/cart", bob.token);
await post("/cart/items", { sku, quantity: 1 }, bob.token);
const merged = await post(
  "/cart/merge",
  { items: [{ sku, quantity: 2 }, { sku: otherSku, quantity: 1 }, { sku: "QADAM-GONE-01", quantity: 1 }] },
  bob.token,
);
check("merge -> 200 despite an unknown SKU in the guest cart", merged.status === 200, merged.body);
const mergedLine = merged.body.data.items.find((i: any) => i.sku === sku);
check("quantities are summed, not replaced", mergedLine?.quantity === 3, mergedLine?.quantity);
check("the other guest item is added", merged.body.data.items.some((i: any) => i.sku === otherSku));
check("the unknown SKU is skipped, not fatal", merged.body.data.items.length === 2, merged.body.data.items.length);

/* ------------------------------------------------------------------ */
section("Wishlist");

const wlEmpty = await get("/wishlist", alice.token);
check("starts empty", Array.isArray(wlEmpty.body.data) && wlEmpty.body.data.length === 0);

const wlAdd = await put("/wishlist/court-classic-low", alice.token);
check("add -> 200", wlAdd.status === 200);
check("contains the product", wlAdd.body.data.some((p: any) => p.slug === "court-classic-low"));

const wlAgain = await put("/wishlist/court-classic-low", alice.token);
check("adding twice is idempotent, not a duplicate", wlAgain.body.data.length === 1, wlAgain.body.data.length);

check("unknown product -> 404", (await put("/wishlist/not-a-real-shoe", alice.token)).status === 404);

const bobWl = await get("/wishlist", bob.token);
check("Bob's wishlist is separate from Alice's", bobWl.body.data.length === 0, bobWl.body.data.length);

const wlRemove = await del("/wishlist/court-classic-low", alice.token);
check("remove works", wlRemove.body.data.length === 0);

/* ------------------------------------------------------------------ */
section("Cleanup");
const users = await User.find({ email: new RegExp(`^${RUN}_`) }).lean();
const ids = users.map((u) => u._id);
await Promise.all([
  Cart.deleteMany({ user: { $in: ids } }),
  Wishlist.deleteMany({ user: { $in: ids } }),
  User.deleteMany({ _id: { $in: ids } }),
]);
check(`removed ${ids.length} test users and their carts`, ids.length === 2);

// The catalogue must be exactly as it was, or later runs drift.
const restored = await Product.findOne({ slug: "court-classic-low" }).lean();
check("product price restored", restored!.priceCents === original, restored!.priceCents);
const restoredStock = await Product.findOne({ "variants.sku": lowVariant.sku }).lean();
check(
  "variant stock restored",
  restoredStock!.variants.find((v) => v.sku === lowVariant.sku)?.stock === lowVariant.stock,
);

console.log(`\n${fails === 0 ? "ALL CART TESTS PASSED" : fails + " FAILED"}\n`);
server.close();
await disconnectDatabase();
await mongoose.disconnect().catch(() => {});
process.exit(fails ? 1 : 0);
