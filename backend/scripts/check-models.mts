/**
 * MODEL CHECKS — no database required.
 *
 *   npm run db:check
 *
 * Mongoose validates documents in memory, so schema rules, defaults, indexes
 * and the toJSON contract can all be verified without a connection. That keeps
 * most of the risk testable before Atlas exists, and keeps it testable in CI
 * without spinning up a database.
 *
 * What it CANNOT check: that the indexes actually build, that a unique index
 * rejects a duplicate, or that a query plan uses them. Those need a real
 * server and are covered by the live check after seeding.
 */
import mongoose from "mongoose";
import { Product } from "../src/modules/products/product.model";
import { ProductCollection } from "../src/modules/collections/collection.model";
import { buildCatalog, buildCollections } from "../../frontend/src/data/catalog";
import type { Product as CatalogProduct } from "../../frontend/src/types/catalog";

let failures = 0;
const check = (label: string, ok: boolean, got?: unknown) => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : ` — got ${JSON.stringify(got)}`}`);
  if (!ok) failures++;
};
const section = (t: string) => console.log(`\n${t}`);

function toDoc(product: CatalogProduct) {
  const { collection, isNew, createdAt, id: _ignored, ...rest } = product;
  return { ...rest, collectionSlug: collection, isNewArrival: isNew, publishedAt: new Date(createdAt) };
}

const catalog = buildCatalog();
const collections = buildCollections();

/* -------------------------------------------------------------------------- */
section("Every generated product is a valid document");

let invalid = 0;
let firstError = "";
for (const product of catalog) {
  const doc = new Product(toDoc(product));
  const error = doc.validateSync();
  if (error) {
    invalid++;
    if (!firstError) firstError = `${product.slug}: ${error.message.slice(0, 150)}`;
  }
}
check(`all ${catalog.length} products validate`, invalid === 0, firstError);

let invalidCollections = 0;
for (const collection of collections) {
  if (new ProductCollection(collection).validateSync()) invalidCollections++;
}
check(`all ${collections.length} collections validate`, invalidCollections === 0);

/* -------------------------------------------------------------------------- */
section("Schema rules actually reject bad data");

const base = toDoc(catalog[0]!);

const cases: [string, Record<string, unknown>][] = [
  ["missing name", { name: undefined }],
  ["missing slug", { slug: undefined }],
  ["unknown gender", { gender: "robot" }],
  ["negative price", { priceCents: -1 }],
  ["fractional price (money must be integer paisa)", { priceCents: 2499.5 }],
  ["rating above 5", { rating: 7 }],
  ["negative review count", { reviewCount: -3 }],
  ["bad currency length", { currency: "RUPEES" }],
  ["malformed hex in a colourway", { colors: [{ ...base.colors[0], hex: "navy" }] }],
  ["colourway with no images", { colors: [{ ...base.colors[0], images: [] }] }],
  ["negative stock", { variants: [{ ...base.variants[0], stock: -2 }] }],
  ["fractional stock", { variants: [{ ...base.variants[0], stock: 1.5 }] }],
];

for (const [label, override] of cases) {
  const doc = new Product({ ...base, ...override });
  check(`rejects ${label}`, doc.validateSync() !== undefined);
}

check("accepts a valid document", new Product(base).validateSync() === undefined);

/* -------------------------------------------------------------------------- */
section("Normalisation");

const messy = new Product({
  ...base,
  slug: "  Court-Classic-LOW  ",
  currency: "pkr",
  gender: "unisex",
  variants: [{ ...base.variants[0], sku: "qadam-test-sku-42", colorSlug: " BLACK " }],
});
check("slug trimmed and lowercased", messy.slug === "court-classic-low", messy.slug);
check("currency uppercased", messy.currency === "PKR", messy.currency);
check("SKU uppercased", messy.variants[0]?.sku === "QADAM-TEST-SKU-42", messy.variants[0]?.sku);
check("colorSlug trimmed and lowercased", messy.variants[0]?.colorSlug === "black", messy.variants[0]?.colorSlug);

// Omit the optional fields entirely rather than overriding one of them — the
// source product has isFeatured: true, so a partial override tested nothing.
const withoutOptionals = { ...base };
delete (withoutOptionals as Record<string, unknown>).tags;
delete (withoutOptionals as Record<string, unknown>).isNewArrival;
delete (withoutOptionals as Record<string, unknown>).isBestseller;
delete (withoutOptionals as Record<string, unknown>).isFeatured;

const defaults = new Product(withoutOptionals);
check("tags default to an empty array", Array.isArray(defaults.tags) && defaults.tags.length === 0);
check(
  "flags default to false",
  defaults.isNewArrival === false && defaults.isBestseller === false && defaults.isFeatured === false,
  {
    isNewArrival: defaults.isNewArrival,
    isBestseller: defaults.isBestseller,
    isFeatured: defaults.isFeatured,
  },
);

/* -------------------------------------------------------------------------- */
section("Reserved-name mapping (toJSON must match the frontend contract)");

const source = catalog.find((p) => p.isNew && p.compareAtCents === undefined) ?? catalog[0]!;
const json = new Product(toDoc(source)).toJSON() as Record<string, unknown>;

check("exposes `collection`, not `collectionSlug`", json.collection === source.collection, json.collection);
check("exposes `isNew`, not `isNewArrival`", json.isNew === source.isNew, json.isNew);
check("exposes `createdAt` from publishedAt", json.createdAt instanceof Date, json.createdAt);
check("storage-only names are hidden", !("collectionSlug" in json) && !("isNewArrival" in json));
check("Mongo internals hidden", !("_id" in json) && !("__v" in json));
check("has an `id`", typeof json.id === "string" && (json.id as string).length > 0);

const frontendKeys = Object.keys(source).sort();
const apiKeys = Object.keys(json).sort();
const missingKeys = frontendKeys.filter((k) => !apiKeys.includes(k));
check(
  "every field the frontend expects is present",
  missingKeys.length === 0,
  { missing: missingKeys },
);

/* -------------------------------------------------------------------------- */
section("Indexes are declared for the queries the storefront makes");

const productIndexes = Product.schema.indexes().map(([fields]) => Object.keys(fields).join("+"));
const expected = [
  "collectionSlug",
  "gender",
  "priceCents",
  "publishedAt",
  "variants.sku",
  "colors.slug",
];
for (const field of expected) {
  check(
    `indexed: ${field}`,
    productIndexes.some((index) => index.split("+").includes(field)),
    productIndexes,
  );
}
check(
  "text index for search",
  Product.schema.indexes().some(([fields]) => Object.values(fields).includes("text")),
);
check(
  "variant SKU index is unique",
  Product.schema.indexes().some(([fields, opts]) => "variants.sku" in fields && opts?.unique === true),
);

/* -------------------------------------------------------------------------- */
section("Reserved names are genuinely avoided");

const paths = Object.keys(Product.schema.paths);
check("no schema path named `collection`", !paths.includes("collection"), paths.filter((p) => p === "collection"));
check("no schema path named `isNew`", !paths.includes("isNew"));

console.log(`\n${failures === 0 ? "ALL MODEL CHECKS PASSED" : `${failures} FAILED`}\n`);
await mongoose.disconnect().catch(() => {});
process.exit(failures === 0 ? 0 : 1);
