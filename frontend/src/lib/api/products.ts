import {
  buildCatalog,
  buildCollections,
  colorHasStock,
  isOnSale,
  isSoldOut,
  totalStock,
} from "@/data/catalog";
import { GENDER_LABELS } from "@/data/catalog";
import type {
  Collection,
  FacetBucket,
  Gender,
  PaginationMeta,
  Product,
  ProductFacets,
  ProductListResponse,
  ProductQuery,
} from "@/types/catalog";

/**
 * THE DATA LAYER — the seam between the UI and wherever data comes from.
 *
 * Right now every function reads the local generated catalog. When the Express
 * backend exists, each body is replaced with a fetch() call and NOTHING ELSE
 * CHANGES: the function names, arguments and return shapes already match the
 * REST API, including the `{ items, meta }` envelope and the facet counts.
 *
 * Every function is async for that reason. Pages must await them today so they
 * need no edits tomorrow.
 */

const DEFAULT_LIMIT = 12;

/* -------------------------------------------------------------------------- */
/* Collections                                                                 */
/* -------------------------------------------------------------------------- */

export async function getCollections(): Promise<Collection[]> {
  return [...buildCollections()].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  return buildCollections().find((c) => c.slug === slug) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Filtering                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Filtering rule: within one group, match ANY of the chosen values;
 * across groups, ALL must match. Picking "men" and "women" widens the results;
 * picking "men" and size 42 narrows them.
 *
 * `except` lets facet counting ask "how many results would there be if this
 * one group were ignored?", which is what makes counts stay useful while a
 * group has active selections.
 */
function matchesQuery(product: Product, query: ProductQuery, except?: keyof ProductQuery): boolean {
  if (except !== "collection" && query.collection && query.collection !== "all") {
    if (product.collection !== query.collection) return false;
  }

  if (except !== "gender" && query.gender?.length) {
    if (!query.gender.includes(product.gender)) return false;
  }

  if (except !== "size" && query.size?.length) {
    const hasSize = product.variants.some((v) => query.size!.includes(v.size) && v.stock > 0);
    if (!hasSize) return false;
  }

  if (except !== "color" && query.color?.length) {
    const hasColor = product.colors.some((c) => query.color!.includes(c.slug));
    if (!hasColor) return false;
  }

  if (except !== "minPrice" && query.minPrice !== undefined) {
    if (product.priceCents < query.minPrice) return false;
  }

  if (except !== "maxPrice" && query.maxPrice !== undefined) {
    if (product.priceCents > query.maxPrice) return false;
  }

  if (except !== "availability" && query.availability) {
    if (isSoldOut(product)) return false;
  }

  if (except !== "onSale" && query.onSale) {
    if (!isOnSale(product)) return false;
  }

  if (except !== "isNew" && query.isNew) {
    if (!product.isNew) return false;
  }

  if (query.q) {
    const needle = query.q.toLowerCase().trim();
    const haystack = [product.name, product.collection, product.gender, ...product.tags]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

function sortProducts(products: Product[], sort: ProductQuery["sort"]): Product[] {
  const sorted = [...products];
  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "price-asc":
      return sorted.sort((a, b) => a.priceCents - b.priceCents);
    case "price-desc":
      return sorted.sort((a, b) => b.priceCents - a.priceCents);
    case "top-rated":
      return sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    case "best-selling":
      return sorted.sort(
        (a, b) => Number(b.isBestseller) - Number(a.isBestseller) || b.reviewCount - a.reviewCount,
      );
    case "featured":
    default:
      return sorted.sort(
        (a, b) =>
          Number(b.isFeatured) - Number(a.isFeatured) ||
          Number(b.isBestseller) - Number(a.isBestseller) ||
          a.name.localeCompare(b.name),
      );
  }
}

/* -------------------------------------------------------------------------- */
/* Facets                                                                      */
/* -------------------------------------------------------------------------- */

function countBy(products: Product[], extract: (p: Product) => string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const product of products) {
    for (const value of new Set(extract(product))) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return counts;
}

function buildFacets(all: Product[], query: ProductQuery): ProductFacets {
  // Each group counts against results filtered by every OTHER group, so the
  // numbers answer "how many would I get if I also picked this?"
  const forGroup = (group: keyof ProductQuery) => all.filter((p) => matchesQuery(p, query, group));

  const collectionCounts = countBy(forGroup("collection"), (p) => [p.collection]);
  const genderCounts = countBy(forGroup("gender"), (p) => [p.gender]);
  const sizeCounts = countBy(forGroup("size"), (p) =>
    p.variants.filter((v) => v.stock > 0).map((v) => v.size),
  );
  const colorPool = forGroup("color");
  const colorCounts = countBy(colorPool, (p) => p.colors.map((c) => c.slug));

  const colorHex = new Map<string, { label: string; hex: string }>();
  for (const product of all) {
    for (const color of product.colors) {
      if (!colorHex.has(color.slug))
        colorHex.set(color.slug, { label: color.name, hex: color.hex });
    }
  }

  const collections = buildCollections();
  const matching = all.filter((p) => matchesQuery(p, query));
  const prices = matching.length ? matching.map((p) => p.priceCents) : all.map((p) => p.priceCents);

  const toBuckets = (counts: Map<string, number>, label: (v: string) => string): FacetBucket[] =>
    [...counts.entries()]
      .map(([value, count]) => ({ value, label: label(value), count }))
      .filter((b) => b.count > 0);

  return {
    collection: toBuckets(
      collectionCounts,
      (v) => collections.find((c) => c.slug === v)?.name ?? v,
    ).sort((a, b) => {
      const order = (slug: string) =>
        collections.find((c) => c.slug === slug)?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      return order(a.value) - order(b.value);
    }),

    gender: toBuckets(genderCounts, (v) => GENDER_LABELS[v as Gender] ?? v).sort((a, b) =>
      a.value.localeCompare(b.value),
    ),

    size: toBuckets(sizeCounts, (v) => `EU ${v}`).sort((a, b) => Number(a.value) - Number(b.value)),

    color: [...colorCounts.entries()]
      .map(([value, count]) => ({
        value,
        label: colorHex.get(value)?.label ?? value,
        hex: colorHex.get(value)?.hex,
        count,
      }))
      .filter((b) => b.count > 0)
      .sort((a, b) => a.label.localeCompare(b.label)),

    priceRange: { min: Math.min(...prices), max: Math.max(...prices) },
    onSale: forGroup("onSale").filter(isOnSale).length,
    isNew: forGroup("isNew").filter((p) => p.isNew).length,
    inStock: forGroup("availability").filter((p) => !isSoldOut(p)).length,
  };
}

/* -------------------------------------------------------------------------- */
/* Products                                                                    */
/* -------------------------------------------------------------------------- */

export async function getProducts(query: ProductQuery = {}): Promise<ProductListResponse> {
  const all = buildCatalog();

  const filtered = all.filter((product) => matchesQuery(product, query));
  const sorted = sortProducts(filtered, query.sort);

  const limit = Math.max(1, query.limit ?? DEFAULT_LIMIT);
  const totalPages = Math.max(1, Math.ceil(sorted.length / limit));
  const page = Math.min(Math.max(1, query.page ?? 1), totalPages);
  const start = (page - 1) * limit;

  const meta: PaginationMeta = { page, limit, total: sorted.length, totalPages };

  return {
    items: sorted.slice(start, start + limit),
    meta,
    facets: buildFacets(all, query),
  };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return buildCatalog().find((product) => product.slug === slug) ?? null;
}

export async function getRelatedProducts(productId: string, limit = 4): Promise<Product[]> {
  const all = buildCatalog();
  const product = all.find((p) => p.id === productId);
  if (!product) return [];

  const sameCollection = all.filter(
    (p) => p.id !== product.id && p.collection === product.collection,
  );
  const sameGender = all.filter(
    (p) =>
      p.id !== product.id && p.collection !== product.collection && p.gender === product.gender,
  );

  return [...sameCollection, ...sameGender].slice(0, limit);
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  return buildCatalog()
    .filter((p) => p.isFeatured)
    .slice(0, limit);
}

export async function getNewArrivals(limit = 8): Promise<Product[]> {
  return [...buildCatalog()]
    .filter((p) => p.isNew)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function getBestsellers(limit = 8): Promise<Product[]> {
  return [...buildCatalog()]
    .filter((p) => p.isBestseller)
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, limit);
}

/** Re-exported so UI code imports stock helpers from the data layer, not the
 *  catalog internals — one more thing that will not change with a real API. */
export { colorHasStock, isOnSale, isSoldOut, totalStock };
