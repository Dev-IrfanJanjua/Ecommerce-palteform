import { brand } from "@/config/brand";
import type { Collection, ColorOption, Gender, Product, Variant } from "@/types/catalog";
import {
  COLLECTION_COPY,
  COLLECTION_SOURCE,
  PKR_PRICE_LADDER,
  PRODUCT_SOURCE,
  SALE_DISCOUNT,
  SIZES_BY_GENDER,
  type ProductSource,
} from "./catalog.source";

/* -------------------------------------------------------------------------- */
/* Seeded randomness                                                           */
/* -------------------------------------------------------------------------- */

/**
 * mulberry32 — a tiny, fast pseudo-random generator.
 *
 * `Math.random()` is forbidden here: it would give different stock numbers and
 * ratings on every build, so the server HTML and the browser would disagree,
 * and nothing would be reproducible. Seeding from the product slug means the
 * same product always produces the same numbers.
 */
function mulberry32(seed: number) {
  let a = seed;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turns a string into a stable 32-bit seed. */
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Rounds a rupee amount to a believable retail ending (…,990). */
function snapToNaturalPrice(rupees: number): number {
  const thousands = Math.max(1, Math.round(rupees / 1000));
  return thousands * 1000 - 10;
}

function toPaisa(rupees: number): number {
  return Math.round(rupees * 100);
}

/* -------------------------------------------------------------------------- */
/* Copy generation                                                             */
/* -------------------------------------------------------------------------- */

function buildCopy(source: ProductSource) {
  const copy = COLLECTION_COPY[source.collection];
  const audience = source.gender === "unisex" ? "Made for everyone" : `Made for ${source.gender}`;

  const shortDescription = `The ${source.name} is ${copy.blurb}.`;

  const description = [
    `The ${source.name} is ${copy.blurb}. It keeps the shape simple and the construction honest, so it holds up to daily wear rather than looking good for one season.`,
    `${audience}, in ${source.colors.length} colourway${source.colors.length === 1 ? "" : "s"}. ${copy.material}.`,
  ].join("\n\n");

  // Listed explicitly rather than spreading `copy` — a spread here would
  // silently overwrite the keys above it, and `blurb` is internal to this
  // function, not part of a Product.
  return {
    shortDescription,
    description,
    features: copy.features,
    material: copy.material,
    care: copy.care,
  };
}

/* -------------------------------------------------------------------------- */
/* Stock                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Default stock distribution, tuned so roughly 10% of variants are sold out
 * and roughly 10% are low (1–3), which is what makes every UI state visible.
 */
function defaultStock(random: () => number): number {
  const roll = random();
  if (roll < 0.1) return 0;
  if (roll < 0.2) return 1 + Math.floor(random() * 3);
  return 4 + Math.floor(random() * 37);
}

function stockForVariant(
  source: ProductSource,
  colorIndex: number,
  sizeIndex: number,
  sizes: string[],
  random: () => number,
): number {
  switch (source.stockRule) {
    case "sold-out":
      return 0;
    case "all-low":
      return 1 + Math.floor(random() * 3);
    case "one-colour-sold-out":
      // The first colourway is entirely unavailable; the rest behave normally.
      return colorIndex === 0 ? 0 : defaultStock(random);
    case "edge-sizes-sold-out": {
      const isEdge = sizeIndex === 0 || sizeIndex === 1 || sizeIndex === sizes.length - 1;
      return isEdge ? 0 : defaultStock(random);
    }
    default:
      return defaultStock(random);
  }
}

/* -------------------------------------------------------------------------- */
/* Build                                                                       */
/* -------------------------------------------------------------------------- */

/** Fixed reference date so "new" products stay deterministic across builds. */
const REFERENCE_DATE = new Date("2026-10-01T00:00:00.000Z");

function buildProduct(source: ProductSource, index: number): Product {
  const slug = slugify(source.name);
  const random = mulberry32(hashSeed(slug));

  const isNew = source.flags.includes("N");
  const isBestseller = source.flags.includes("B");
  const isFeatured = source.flags.includes("F");
  const isOnSale = source.flags.includes("S");

  // --- Price ---------------------------------------------------------------
  const ladderRupees = PKR_PRICE_LADDER[source.usd];
  if (ladderRupees === undefined) {
    throw new Error(`No PKR ladder entry for USD ${source.usd} (${source.name})`);
  }

  const compareAtCents = isOnSale ? toPaisa(ladderRupees) : undefined;
  const priceCents = isOnSale
    ? toPaisa(snapToNaturalPrice(ladderRupees * (1 - SALE_DISCOUNT)))
    : toPaisa(ladderRupees);

  // --- Colours -------------------------------------------------------------
  const colors: ColorOption[] = source.colors.map((color) => {
    const colorSlug = slugify(color.name);
    return {
      name: color.name,
      slug: colorSlug,
      hex: color.hex,
      images: [1, 2, 3, 4].map((n) => `/images/products/${slug}/${colorSlug}-${n}.webp`),
    };
  });

  // --- Variants: every colour x every size ---------------------------------
  const sizes = SIZES_BY_GENDER[source.gender];
  const variants: Variant[] = [];

  colors.forEach((color, colorIndex) => {
    sizes.forEach((size, sizeIndex) => {
      variants.push({
        sku: `${brand.name}-${slug}-${color.slug}-${size}`.toUpperCase(),
        colorSlug: color.slug,
        size,
        stock: stockForVariant(source, colorIndex, sizeIndex, sizes, random),
      });
    });
  });

  // --- Ratings and dates ---------------------------------------------------
  const rating = Math.round((3.8 + random() * 1.1) * 10) / 10;
  const reviewCount = 5 + Math.floor(random() * 416);

  // "New" products are dated within the last 30 days; the rest are older.
  const daysAgo = isNew ? Math.floor(random() * 30) : 60 + Math.floor(random() * 500);
  const createdAt = new Date(
    REFERENCE_DATE.getTime() - daysAgo * 24 * 60 * 60 * 1000,
  ).toISOString();

  const copy = buildCopy(source);

  const tags = [
    source.collection,
    source.gender,
    ...(isOnSale ? ["sale"] : []),
    ...(isNew ? ["new"] : []),
    ...(isBestseller ? ["bestseller"] : []),
    ...source.colors.map((c) => slugify(c.name)),
  ];

  return {
    id: `prd_${String(index + 1).padStart(3, "0")}`,
    slug,
    name: source.name,
    collection: source.collection,
    gender: source.gender,
    shortDescription: copy.shortDescription,
    description: copy.description,
    features: copy.features,
    material: copy.material,
    care: copy.care,
    priceCents,
    ...(compareAtCents !== undefined ? { compareAtCents } : {}),
    currency: brand.currency,
    colors,
    sizes,
    variants,
    rating,
    reviewCount,
    tags,
    isNew,
    isBestseller,
    isFeatured,
    createdAt,
  };
}

let cachedProducts: Product[] | null = null;
let cachedCollections: Collection[] | null = null;

/** Expands the compact source into full products. Memoised; deterministic. */
export function buildCatalog(): Product[] {
  if (!cachedProducts) {
    cachedProducts = PRODUCT_SOURCE.map(buildProduct);
  }
  return cachedProducts;
}

export function buildCollections(): Collection[] {
  if (!cachedCollections) {
    cachedCollections = COLLECTION_SOURCE.map((collection) => ({
      ...collection,
      image: `/images/collections/${collection.slug}.webp`,
    }));
  }
  return cachedCollections;
}

/* -------------------------------------------------------------------------- */
/* Derived helpers used by the data layer and the UI                           */
/* -------------------------------------------------------------------------- */

export function totalStock(product: Product): number {
  return product.variants.reduce((sum, variant) => sum + variant.stock, 0);
}

export function isSoldOut(product: Product): boolean {
  return totalStock(product) === 0;
}

export function isOnSale(product: Product): boolean {
  return product.compareAtCents !== undefined && product.compareAtCents > product.priceCents;
}

/** A colour is available if any of its sizes has stock. */
export function colorHasStock(product: Product, colorSlug: string): boolean {
  return product.variants.some((v) => v.colorSlug === colorSlug && v.stock > 0);
}

/** Sizes that are in stock for a given colour. */
export function availableSizesForColor(product: Product, colorSlug: string): string[] {
  return product.variants
    .filter((v) => v.colorSlug === colorSlug && v.stock > 0)
    .map((v) => v.size);
}

export function findVariant(
  product: Product,
  colorSlug: string,
  size: string,
): Variant | undefined {
  return product.variants.find((v) => v.colorSlug === colorSlug && v.size === size);
}

export const GENDER_LABELS: Record<Gender, string> = {
  men: "Men",
  women: "Women",
  unisex: "Unisex",
};
