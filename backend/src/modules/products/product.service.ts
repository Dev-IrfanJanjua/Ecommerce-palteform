import type { PipelineStage } from "mongoose";
import { notFound } from "@/common/errors/app-error";
import { Product } from "./product.model";
import { ProductCollection } from "@/modules/collections/collection.model";
import type { ListProductsQuery } from "./product.validation";

/**
 * PRODUCT SERVICE
 *
 * Business logic only — no Request, no Response. That keeps it unit-testable
 * and reusable: a webhook handler and a controller can call the same function.
 *
 * Returns the exact shape the frontend's data layer already consumes, so
 * swapping it in changes one folder and no pages.
 */

/**
 * Mongoose 9 no longer re-exports a usable filter type (`FilterQuery` was
 * removed and `Filter` is not exported), so the filter is typed structurally.
 *
 * Safety does not come from this type: it comes from the fact that every
 * condition below is built from VALIDATED fields. `req.query` is never spread
 * into a filter, which is what would allow `?priceCents[$ne]=0` to become a
 * query operator.
 */
type ProductFilter = Record<string, unknown>;

/** Groups whose own filter is excluded when counting that group's facets. */
type FacetGroup = "collection" | "gender" | "size" | "color" | "price" | "availability" | "onSale" | "isNew";

/**
 * Builds a Mongo filter from VALIDATED fields only.
 *
 * `except` omits one group, which is what makes facet counts useful: a count
 * beside "Boots" must answer "how many if I also picked this", not "how many
 * match the filter I already applied", or every other option shows (0) and the
 * shopper can never switch.
 */
function buildFilter(
  query: ListProductsQuery,
  except?: FacetGroup,
  options?: { withoutText?: boolean },
): ProductFilter {
  const and: ProductFilter[] = [];

  if (except !== "collection" && query.collection && query.collection !== "all") {
    and.push({ collectionSlug: query.collection });
  }

  if (except !== "gender" && query.gender?.length) {
    and.push({ gender: { $in: query.gender } });
  }

  if (except !== "size" && query.size?.length) {
    // elemMatch, not two separate conditions: without it Mongo would match a
    // product having SOME variant in that size and SOME OTHER variant in
    // stock, which is not the same thing as that size being buyable.
    and.push({ variants: { $elemMatch: { size: { $in: query.size }, stock: { $gt: 0 } } } });
  }

  if (except !== "color" && query.color?.length) {
    and.push({ "colors.slug": { $in: query.color } });
  }

  if (except !== "price") {
    if (query.minPrice !== undefined) and.push({ priceCents: { $gte: query.minPrice } });
    if (query.maxPrice !== undefined) and.push({ priceCents: { $lte: query.maxPrice } });
  }

  if (except !== "availability" && query.availability) {
    and.push({ variants: { $elemMatch: { stock: { $gt: 0 } } } });
  }

  if (except !== "onSale" && query.onSale) {
    // On sale means there IS an original price above the current one.
    and.push({ compareAtCents: { $exists: true, $ne: null } });
  }

  if (except !== "isNew" && query.isNew) {
    and.push({ isNewArrival: true });
  }

  // Hoisted out when building facets — see buildFacets.
  if (query.q && !options?.withoutText) {
    and.push({ $text: { $search: query.q } });
  }

  return and.length ? { $and: and } : {};
}

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { publishedAt: -1 },
  "price-asc": { priceCents: 1 },
  "price-desc": { priceCents: -1 },
  "top-rated": { rating: -1, reviewCount: -1 },
  "best-selling": { isBestseller: -1, reviewCount: -1 },
  featured: { isFeatured: -1, isBestseller: -1, name: 1 },
};

/* -------------------------------------------------------------------------- */
/* Facets                                                                      */
/* -------------------------------------------------------------------------- */

interface FacetBucket {
  value: string;
  label: string;
  count: number;
  hex?: string;
}

const GENDER_LABELS: Record<string, string> = { men: "Men", women: "Women", unisex: "Unisex" };

/**
 * All facet counts in ONE round trip.
 *
 * Each group needs results filtered by every OTHER group, which is eight
 * different filters. Running them as eight queries would be eight round trips
 * to Atlas on every page load; $facet runs them as one.
 */
async function buildFacets(query: ListProductsQuery) {
  // $text is NOT permitted inside a $facet sub-pipeline — MongoDB rejects it
  // with "query requires text score metadata, but it is not available". It is
  // also not a facet group (a search term narrows every group equally), so it
  // is hoisted to the front of the pipeline where $text is legal.
  const textStage: PipelineStage[] = query.q
    ? [{ $match: { $text: { $search: query.q } } }]
    : [];

  const sub = (group: FacetGroup, stages: PipelineStage.FacetPipelineStage[]) =>
    [
      { $match: buildFilter(query, group, { withoutText: true }) },
      ...stages,
    ] as PipelineStage.FacetPipelineStage[];

  const [result] = await Product.aggregate([
    ...textStage,
    {
      $facet: {
        collection: sub("collection", [{ $group: { _id: "$collectionSlug", count: { $sum: 1 } } }]),
        gender: sub("gender", [{ $group: { _id: "$gender", count: { $sum: 1 } } }]),

        // A size is only offered if some variant in it is actually in stock.
        size: sub("size", [
          { $unwind: "$variants" },
          { $match: { "variants.stock": { $gt: 0 } } },
          { $group: { _id: { product: "$_id", size: "$variants.size" } } },
          { $group: { _id: "$_id.size", count: { $sum: 1 } } },
        ]),

        color: sub("color", [
          { $unwind: "$colors" },
          {
            $group: {
              _id: "$colors.slug",
              count: { $sum: 1 },
              label: { $first: "$colors.name" },
              hex: { $first: "$colors.hex" },
            },
          },
        ]),

        price: sub("price", [
          { $group: { _id: null, min: { $min: "$priceCents" }, max: { $max: "$priceCents" } } },
        ]),

        onSale: sub("onSale", [
          { $match: { compareAtCents: { $exists: true, $ne: null } } },
          { $count: "count" },
        ]),
        isNew: sub("isNew", [{ $match: { isNewArrival: true } }, { $count: "count" }]),
        inStock: sub("availability", [
          { $match: { variants: { $elemMatch: { stock: { $gt: 0 } } } } },
          { $count: "count" },
        ]),
      },
    },
  ]);

  const rows = (result ?? {}) as Record<string, { _id: unknown; count?: number; label?: string; hex?: string; min?: number; max?: number }[]>;

  // Collection names come from the collections table so one source names them.
  const collections = await ProductCollection.find().sort({ sortOrder: 1 }).lean();
  const collectionMeta = new Map(collections.map((c) => [c.slug, c]));

  const toBuckets = (
    group: { _id: unknown; count?: number; label?: string; hex?: string }[] = [],
    label: (value: string, row: { label?: string }) => string,
  ): FacetBucket[] =>
    group
      .filter((row) => typeof row._id === "string")
      .map((row) => ({
        value: row._id as string,
        label: label(row._id as string, row),
        count: row.count ?? 0,
        ...(row.hex ? { hex: row.hex } : {}),
      }));

  const priceRow = rows.price?.[0];

  return {
    collection: toBuckets(rows.collection, (value) => collectionMeta.get(value)?.name ?? value).sort(
      (a, b) =>
        (collectionMeta.get(a.value)?.sortOrder ?? 99) - (collectionMeta.get(b.value)?.sortOrder ?? 99),
    ),
    gender: toBuckets(rows.gender, (value) => GENDER_LABELS[value] ?? value).sort((a, b) =>
      a.value.localeCompare(b.value),
    ),
    size: toBuckets(rows.size, (value) => `EU ${value}`).sort(
      (a, b) => Number(a.value) - Number(b.value),
    ),
    color: toBuckets(rows.color, (value, row) => row.label ?? value).sort((a, b) =>
      a.label.localeCompare(b.label),
    ),
    priceRange: { min: priceRow?.min ?? 0, max: priceRow?.max ?? 0 },
    onSale: rows.onSale?.[0]?.count ?? 0,
    isNew: rows.isNew?.[0]?.count ?? 0,
    inStock: rows.inStock?.[0]?.count ?? 0,
  };
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

export async function listProducts(query: ListProductsQuery) {
  const filter = buildFilter(query);
  const sort = SORTS[query.sort ?? "featured"] ?? SORTS.featured!;
  const skip = (query.page - 1) * query.limit;

  // Three independent reads, so they run concurrently rather than in sequence.
  const [items, total, facets] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(query.limit),
    Product.countDocuments(filter),
    buildFacets(query),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / query.limit));

  return {
    items,
    meta: { page: query.page, limit: query.limit, total, totalPages },
    facets,
  };
}

export async function getProductBySlug(slug: string) {
  const product = await Product.findOne({ slug });
  if (!product) throw notFound("Product not found");
  return product;
}

/**
 * Related products: same collection first, then the same gender elsewhere.
 * Mirrors the frontend's existing rule so the rail does not change.
 */
export async function getRelatedProducts(slug: string, limit: number) {
  const product = await Product.findOne({ slug }).lean();
  if (!product) throw notFound("Product not found");

  const sameCollection = await Product.find({
    _id: { $ne: product._id },
    collectionSlug: product.collectionSlug,
  }).limit(limit);

  if (sameCollection.length >= limit) return sameCollection;

  const sameGender = await Product.find({
    _id: { $ne: product._id, $nin: sameCollection.map((p) => p._id) },
    collectionSlug: { $ne: product.collectionSlug },
    gender: product.gender,
  }).limit(limit - sameCollection.length);

  return [...sameCollection, ...sameGender];
}

export const getFeaturedProducts = (limit: number) =>
  Product.find({ isFeatured: true }).limit(limit);

export const getNewArrivals = (limit: number) =>
  Product.find({ isNewArrival: true }).sort({ publishedAt: -1 }).limit(limit);

export const getBestsellers = (limit: number) =>
  Product.find({ isBestseller: true }).sort({ reviewCount: -1 }).limit(limit);
