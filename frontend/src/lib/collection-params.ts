import type { Gender, ProductQuery, ProductSort } from "@/types/catalog";

/**
 * URL <-> query translation.
 *
 * Every filter lives in the URL rather than component state. That is what makes
 * a filtered view shareable, bookmarkable, survive a refresh, and work with the
 * browser's back button — none of which React state can do.
 *
 * Both the server page and the client filter controls use these functions, so
 * there is exactly one definition of what `?gender=men,women` means.
 */

export const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "top-rated", label: "Top rated" },
  { value: "best-selling", label: "Best selling" },
];

const VALID_SORTS = new Set(SORT_OPTIONS.map((o) => o.value));
const VALID_GENDERS = new Set<Gender>(["men", "women", "unisex"]);

export const PAGE_SIZE = 12;

/** Next.js gives a value, an array, or nothing for each param. */
export type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** `?size=41,42` -> ["41", "42"] */
function list(value: string | string[] | undefined): string[] | undefined {
  const raw = first(value);
  if (!raw) return undefined;
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

function integer(value: string | string[] | undefined): number | undefined {
  const raw = first(value);
  if (raw === undefined) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

function flag(value: string | string[] | undefined): boolean | undefined {
  const raw = first(value);
  return raw === "1" || raw === "true" ? true : undefined;
}

/**
 * Builds a ProductQuery from URL params.
 *
 * Anything unrecognised is dropped rather than trusted: a hand-edited
 * `?sort=drop-tables` must not reach the data layer.
 */
export function parseProductQuery(params: RawParams, collection?: string): ProductQuery {
  const genders = list(params.gender)?.filter((g): g is Gender => VALID_GENDERS.has(g as Gender));
  const sortRaw = first(params.sort) as ProductSort | undefined;

  return {
    ...(collection ? { collection } : {}),
    ...(genders?.length ? { gender: genders } : {}),
    ...(list(params.size) ? { size: list(params.size) } : {}),
    ...(list(params.color) ? { color: list(params.color) } : {}),
    ...(integer(params.minPrice) !== undefined ? { minPrice: integer(params.minPrice) } : {}),
    ...(integer(params.maxPrice) !== undefined ? { maxPrice: integer(params.maxPrice) } : {}),
    ...(flag(params.inStock) ? { availability: true } : {}),
    ...(flag(params.onSale) ? { onSale: true } : {}),
    ...(flag(params.isNew) ? { isNew: true } : {}),
    ...(sortRaw && VALID_SORTS.has(sortRaw) ? { sort: sortRaw } : {}),
    page: integer(params.page) ?? 1,
    limit: PAGE_SIZE,
    ...(first(params.q) ? { q: first(params.q) } : {}),
  };
}

/** True when any filter (not sort or page) is active. */
export function hasActiveFilters(query: ProductQuery): boolean {
  return Boolean(
    query.gender?.length ||
    query.size?.length ||
    query.color?.length ||
    query.minPrice !== undefined ||
    query.maxPrice !== undefined ||
    query.availability ||
    query.onSale ||
    query.isNew ||
    query.q,
  );
}

/* -------------------------------------------------------------------------- */
/* Client-side URL building                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Toggles one value inside a comma-separated param and returns the new search
 * string. Changing any filter resets to page 1 — staying on page 4 of a result
 * set that now has 2 pages is the classic filtering bug.
 */
export function toggleListParam(
  current: URLSearchParams,
  key: string,
  value: string,
): URLSearchParams {
  const next = new URLSearchParams(current);
  const values = new Set((next.get(key) ?? "").split(",").filter(Boolean));

  if (values.has(value)) values.delete(value);
  else values.add(value);

  if (values.size) next.set(key, [...values].join(","));
  else next.delete(key);

  next.delete("page");
  return next;
}

export function setParam(
  current: URLSearchParams,
  key: string,
  value: string | undefined,
): URLSearchParams {
  const next = new URLSearchParams(current);
  if (value === undefined || value === "") next.delete(key);
  else next.set(key, value);
  if (key !== "page") next.delete("page");
  return next;
}

export function clearFilters(current: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams();
  // Sort is a view preference, not a filter — keep it when clearing.
  const sort = current.get("sort");
  if (sort) next.set("sort", sort);
  return next;
}

export function isSelected(current: URLSearchParams, key: string, value: string): boolean {
  return (current.get(key) ?? "").split(",").filter(Boolean).includes(value);
}
