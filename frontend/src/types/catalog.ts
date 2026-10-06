/**
 * CATALOG TYPES
 *
 * These mirror the shape the MongoDB/Mongoose models will have, so the same
 * spec later becomes the database seed script and pages need no changes when
 * the real API arrives.
 *
 * Money is integer MINOR units (paisa) throughout — never floats.
 */

export type Gender = "men" | "women" | "unisex";

export interface ColorOption {
  /** Display name, e.g. "Off White" */
  name: string;
  /** URL-safe form, e.g. "off-white" */
  slug: string;
  /** Swatch colour. The one place a hex literal is legitimate — a shoe's
   *  real colour is product DATA, not theme. */
  hex: string;
  /** Four ordered image paths for this colourway. */
  images: string[];
}

export interface Variant {
  /** `QADAM-COURT-CLASSIC-LOW-OFF-WHITE-42` */
  sku: string;
  colorSlug: string;
  /** EU size as a string, e.g. "42" */
  size: string;
  stock: number;
  /** Optional per-variant override. Omitted unless genuinely different. */
  priceCents?: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  /** Collection slug, e.g. "sneakers" */
  collection: string;
  gender: Gender;
  shortDescription: string;
  description: string;
  features: string[];
  material: string;
  care: string;
  /** Current selling price, in paisa. */
  priceCents: number;
  /** Original price, present only when on sale. */
  compareAtCents?: number;
  currency: string;
  colors: ColorOption[];
  sizes: string[];
  variants: Variant[];
  rating: number;
  reviewCount: number;
  tags: string[];
  isNew: boolean;
  isBestseller: boolean;
  isFeatured: boolean;
  createdAt: string;
}

export interface Collection {
  slug: string;
  name: string;
  description: string;
  image: string;
  sortOrder: number;
}

/* -------------------------------------------------------------------------- */
/* Query and response shapes — identical to what the REST API will return.     */
/* -------------------------------------------------------------------------- */

export type ProductSort =
  "featured" | "newest" | "price-asc" | "price-desc" | "top-rated" | "best-selling";

export interface ProductQuery {
  collection?: string;
  gender?: Gender[];
  size?: string[];
  color?: string[];
  /** Inclusive bounds, in paisa. */
  minPrice?: number;
  maxPrice?: number;
  /** When true, only products with at least one variant in stock. */
  availability?: boolean;
  onSale?: boolean;
  isNew?: boolean;
  sort?: ProductSort;
  page?: number;
  limit?: number;
  /** Free-text search over name, collection and tags. */
  q?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** One selectable filter option plus how many results it would yield. */
export interface FacetBucket {
  value: string;
  label: string;
  count: number;
  /** Colour facets carry their swatch so the UI can render a dot. */
  hex?: string;
}

export interface ProductFacets {
  collection: FacetBucket[];
  gender: FacetBucket[];
  size: FacetBucket[];
  color: FacetBucket[];
  priceRange: { min: number; max: number };
  onSale: number;
  isNew: number;
  inStock: number;
}

export interface ProductListResponse {
  items: Product[];
  meta: PaginationMeta;
  facets: ProductFacets;
}
