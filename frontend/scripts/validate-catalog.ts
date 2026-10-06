/**
 * CATALOG VALIDATION
 *
 * Checks the generated catalog against the checklist in
 * .claude/skills/shoe-storefront/references/catalog-spec.md
 *
 * Run with:  npm run validate:catalog
 *
 * This exists because the catalog is GENERATED. A typo in the source spec or a
 * mistake in the expansion logic would otherwise show up as a broken page much
 * later. Here it fails loudly, immediately.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { buildCatalog, buildCollections, isOnSale, totalStock } from "../src/data/catalog";
import { PRODUCT_SOURCE } from "../src/data/catalog.source";

let failures = 0;
let checks = 0;

function check(label: string, condition: boolean, detail = "") {
  checks++;
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

const products = buildCatalog();
const collections = buildCollections();

/* -------------------------------------------------------------------- */
section("Counts");

check("36 products", products.length === 36, `got ${products.length}`);
check("6 collections", collections.length === 6, `got ${collections.length}`);

const genderCounts = products.reduce<Record<string, number>>((acc, p) => {
  acc[p.gender] = (acc[p.gender] ?? 0) + 1;
  return acc;
}, {});
check("12 men", genderCounts.men === 12, `got ${genderCounts.men}`);
check("11 women", genderCounts.women === 11, `got ${genderCounts.women}`);
check("13 unisex", genderCounts.unisex === 13, `got ${genderCounts.unisex}`);

const saleCount = products.filter(isOnSale).length;
const newCount = products.filter((p) => p.isNew).length;
const bestCount = products.filter((p) => p.isBestseller).length;
const featCount = products.filter((p) => p.isFeatured).length;
check("9 on sale", saleCount === 9, `got ${saleCount}`);
check("9 new", newCount === 9, `got ${newCount}`);
check("6 bestsellers", bestCount === 6, `got ${bestCount}`);
check("8 featured", featCount === 8, `got ${featCount}`);

/* -------------------------------------------------------------------- */
section("Uniqueness");

const ids = new Set(products.map((p) => p.id));
const slugs = new Set(products.map((p) => p.slug));
const skus = products.flatMap((p) => p.variants.map((v) => v.sku));
check("unique ids", ids.size === products.length, `${ids.size}/${products.length}`);
check("unique slugs", slugs.size === products.length, `${slugs.size}/${products.length}`);
check("unique SKUs", new Set(skus).size === skus.length, `${new Set(skus).size}/${skus.length}`);

/* -------------------------------------------------------------------- */
section("Variant integrity");

const everyVariantHasColor = products.every((p) => {
  const colorSlugs = new Set(p.colors.map((c) => c.slug));
  return p.variants.every((v) => colorSlugs.has(v.colorSlug));
});
check("every variant references an existing colour", everyVariantHasColor);

const variantCountCorrect = products.every(
  (p) => p.variants.length === p.colors.length * p.sizes.length,
);
check("variants = colours x sizes for every product", variantCountCorrect);

check(
  "every product has 2–4 colourways",
  products.every((p) => p.colors.length >= 2 && p.colors.length <= 4),
);
check(
  "every colour has 4 images",
  products.every((p) => p.colors.every((c) => c.images.length === 4)),
);
check(
  "stock is a non-negative integer everywhere",
  products.every((p) => p.variants.every((v) => Number.isInteger(v.stock) && v.stock >= 0)),
);

/* -------------------------------------------------------------------- */
section("Pricing");

check(
  "sale products have compareAtCents > priceCents",
  products
    .filter((p) => p.compareAtCents !== undefined)
    .every((p) => p.compareAtCents! > p.priceCents),
);
check(
  "non-sale products have no compareAtCents",
  products.filter((p) => !isOnSale(p)).every((p) => p.compareAtCents === undefined),
);
check(
  "all prices are positive integers (paisa)",
  products.every((p) => Number.isInteger(p.priceCents) && p.priceCents > 0),
);
check(
  "every product carries the brand currency",
  products.every((p) => p.currency === "PKR"),
);

/* -------------------------------------------------------------------- */
section("Special stock rules");

function productBySourceName(name: string) {
  const product = products.find((p) => p.name === name);
  if (!product) throw new Error(`Missing product: ${name}`);
  return product;
}

const tempo = productBySourceName("Tempo Racer");
check(
  "Tempo Racer — every variant is low stock (1–3)",
  tempo.variants.every((v) => v.stock >= 1 && v.stock <= 3),
);

const trek = productBySourceName("Trek Sandal");
const trekFirstColor = trek.colors[0].slug;
check(
  "Trek Sandal — one whole colourway sold out",
  trek.variants.filter((v) => v.colorSlug === trekFirstColor).every((v) => v.stock === 0),
);
check(
  "Trek Sandal — the other colourway is not sold out",
  trek.variants.filter((v) => v.colorSlug !== trekFirstColor).some((v) => v.stock > 0),
);

const aero = productBySourceName("Aero Lite");
const aeroEdges = [aero.sizes[0], aero.sizes[1], aero.sizes[aero.sizes.length - 1]];
check(
  "Aero Lite — two smallest and largest sizes sold out in every colour",
  aero.variants.filter((v) => aeroEdges.includes(v.size)).every((v) => v.stock === 0),
);

const clog = productBySourceName("Pool Clog");
check("Pool Clog — fully sold out", totalStock(clog) === 0);

/* -------------------------------------------------------------------- */
section("Stock distribution");

const allVariants = products.flatMap((p) => p.variants);
const outOfStock = allVariants.filter((v) => v.stock === 0).length;
const lowStock = allVariants.filter((v) => v.stock >= 1 && v.stock <= 3).length;
const outPct = (outOfStock / allVariants.length) * 100;
const lowPct = (lowStock / allVariants.length) * 100;

console.log(
  `  INFO  ${allVariants.length} variants · ${outPct.toFixed(1)}% sold out · ${lowPct.toFixed(1)}% low stock`,
);
check("roughly 10% sold out (5–20% allowing for the special rules)", outPct >= 5 && outPct <= 20);
check("roughly 10% low stock (5–20%)", lowPct >= 5 && lowPct <= 20);

/* -------------------------------------------------------------------- */
section("Determinism");

// buildCatalog() memoises, so calling it twice in THIS process proves nothing.
// A real determinism test needs a second, independent process: if the seeded
// generator were replaced with Math.random(), these two hashes would differ.
const ownHash = createHash("sha256").update(JSON.stringify(products)).digest("hex");

const childHash = execFileSync(
  process.execPath,
  [
    process.argv[1].replace(/validate-catalog\.ts$/, "..") + "/node_modules/.bin/tsx",
    "-e",
    `import { createHash } from "node:crypto";
     import { buildCatalog } from "./src/data/catalog";
     process.stdout.write(createHash("sha256").update(JSON.stringify(buildCatalog())).digest("hex"));`,
  ],
  { cwd: process.cwd(), encoding: "utf8" },
).trim();

check(
  "buildCatalog() produces identical output in a separate process",
  ownHash === childHash,
  `${ownHash.slice(0, 12)} vs ${childHash.slice(0, 12)}`,
);
console.log(`  INFO  catalog fingerprint ${ownHash.slice(0, 16)}`);
check("source spec has 36 entries", PRODUCT_SOURCE.length === 36);

/* -------------------------------------------------------------------- */
section("Content");

check(
  "no product name is empty",
  products.every((p) => p.name.trim().length > 0),
);
check(
  "every product has 4–5 features",
  products.every((p) => p.features.length >= 4 && p.features.length <= 5),
);
check(
  "no hard-coded currency symbol in product copy",
  products.every(
    (p) =>
      !/(Rs\.?\s?\d|₨|\$\d)/.test(`${p.shortDescription} ${p.description} ${p.features.join(" ")}`),
  ),
);
check(
  "ratings are between 3.8 and 4.9",
  products.every((p) => p.rating >= 3.8 && p.rating <= 4.9),
);
check(
  "review counts are between 5 and 420",
  products.every((p) => p.reviewCount >= 5 && p.reviewCount <= 420),
);

const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
const reference = new Date("2026-10-01T00:00:00.000Z").getTime();
check(
  "new products are dated within the last 30 days",
  products
    .filter((p) => p.isNew)
    .every((p) => reference - new Date(p.createdAt).getTime() <= thirtyDaysMs),
);
check(
  "non-new products are older than 30 days",
  products
    .filter((p) => !p.isNew)
    .every((p) => reference - new Date(p.createdAt).getTime() > thirtyDaysMs),
);

/* -------------------------------------------------------------------- */
console.log(
  `\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} FAILED`} (${checks} checks)\n`,
);

if (failures > 0) process.exit(1);
