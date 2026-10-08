import type {
  Collection,
  Product,
  ProductFacets,
  ProductListResponse,
  ProductQuery,
} from "@/types/catalog";
import { apiFetch, apiFetchOrNull, toQueryString } from "./client";

/**
 * THE DATA LAYER
 *
 * This is the seam between the UI and wherever data comes from. Until now the
 * bodies read a locally generated catalogue; they now call the REST API.
 *
 * Every function signature, argument and return shape is unchanged, which is
 * why no page needed editing: that was the whole point of making these async
 * and envelope-shaped from the start.
 *
 * Stock and price helpers stay pure client-side functions — they derive from a
 * product that has already been fetched, so they cost nothing and work the
 * same either way.
 */

const DEFAULT_LIMIT = 12;

/* -------------------------------------------------------------------------- */
/* Collections                                                                 */
/* -------------------------------------------------------------------------- */

export async function getCollections(): Promise<Collection[]> {
  const { data } = await apiFetch<Collection[]>("/collections");
  return data;
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  return apiFetchOrNull<Collection>(`/collections/${encodeURIComponent(slug)}`);
}

/* -------------------------------------------------------------------------- */
/* Products                                                                    */
/* -------------------------------------------------------------------------- */

export async function getProducts(query: ProductQuery = {}): Promise<ProductListResponse> {
  const search = toQueryString({
    collection: query.collection,
    gender: query.gender,
    size: query.size,
    color: query.color,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    availability: query.availability,
    onSale: query.onSale,
    isNew: query.isNew,
    sort: query.sort,
    page: query.page ?? 1,
    limit: query.limit ?? DEFAULT_LIMIT,
    q: query.q,
  });

  const { data, meta } = await apiFetch<{ items: Product[]; facets: ProductFacets }>(
    `/products${search}`,
  );

  return {
    items: data.items,
    // The API always sends meta for a list; the fallback keeps the type honest
    // rather than asserting non-null.
    meta: meta ?? {
      page: query.page ?? 1,
      limit: query.limit ?? DEFAULT_LIMIT,
      total: data.items.length,
      totalPages: 1,
    },
    facets: data.facets,
  };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return apiFetchOrNull<Product>(`/products/${encodeURIComponent(slug)}`);
}

/**
 * Related products.
 *
 * The API keys this by slug rather than id, so the caller passes a slug. The
 * signature name is kept for compatibility with existing call sites.
 */
export async function getRelatedProducts(slug: string, limit = 4): Promise<Product[]> {
  const result = await apiFetchOrNull<Product[]>(
    `/products/${encodeURIComponent(slug)}/related${toQueryString({ limit })}`,
  );
  return result ?? [];
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const { data } = await apiFetch<Product[]>(`/products/featured${toQueryString({ limit })}`);
  return data;
}

export async function getNewArrivals(limit = 8): Promise<Product[]> {
  const { data } = await apiFetch<Product[]>(`/products/new${toQueryString({ limit })}`);
  return data;
}

export async function getBestsellers(limit = 8): Promise<Product[]> {
  const { data } = await apiFetch<Product[]>(`/products/bestsellers${toQueryString({ limit })}`);
  return data;
}

/* -------------------------------------------------------------------------- */
/* Derived helpers                                                             */
/* -------------------------------------------------------------------------- */

/**
 * These operate on an already-fetched product, so they stay here rather than
 * becoming API calls. Re-exported from this module so UI code keeps importing
 * stock logic from the data layer, not from catalogue internals.
 */

export function totalStock(product: Product): number {
  return product.variants.reduce((sum, variant) => sum + variant.stock, 0);
}

export function isSoldOut(product: Product): boolean {
  return totalStock(product) === 0;
}

export function isOnSale(product: Product): boolean {
  return product.compareAtCents !== undefined && product.compareAtCents > product.priceCents;
}

export function colorHasStock(product: Product, colorSlug: string): boolean {
  return product.variants.some((v) => v.colorSlug === colorSlug && v.stock > 0);
}
