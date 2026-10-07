import photoData from "@/data/product-images.generated.json";
import { buildCatalog } from "@/data/catalog";

/**
 * Real product photography, sourced from Unsplash.
 *
 * Regenerate with `npm run images:fetch` (needs UNSPLASH_ACCESS_KEY in
 * .env.local). The generated file holds URLs plus photographer credit — the
 * Unsplash API Guidelines require hotlinking their CDN rather than storing
 * copies, and require attribution.
 *
 * IMPORTANT CAVEAT, stated plainly: these are stock photos of real shoes, not
 * photographs of these products. They do not match a product's colourway. A
 * shoe listed as "Sand" may show a grey photo. Replace with real product
 * photography before this is a real shop — see docs/storefront-decisions.md.
 */
export interface ProductPhoto {
  id: string;
  url: string;
  alt: string;
  blurHash: string | null;
  width: number;
  height: number;
  photographer: string;
  photographerUrl: string;
  unsplashUrl: string;
}

const photos = photoData as Record<string, ProductPhoto[]>;

/** Required by Unsplash when crediting: identifies this app in their referrals. */
const UTM = "?utm_source=qadam&utm_medium=referral";

export function getProductPhotos(slug: string): ProductPhoto[] {
  return photos[slug] ?? [];
}

export function getProductPhoto(slug: string, index: number): ProductPhoto | undefined {
  const list = getProductPhotos(slug);
  if (!list.length) return undefined;
  return list[index % list.length];
}

/**
 * Builds a sized, cropped CDN URL.
 *
 * Unsplash serves transformations from the URL, so asking for exactly the
 * pixels needed avoids shipping a 4000px original to a 200px card.
 */
export function photoUrl(photo: ProductPhoto, width: number): string {
  const url = new URL(photo.url);
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", "75");
  url.searchParams.set("fm", "webp");
  url.searchParams.set("fit", "crop");
  url.searchParams.set("crop", "entropy");
  return url.toString();
}

export function creditLinks(photo: ProductPhoto) {
  return {
    photographer: `${photo.photographerUrl}${UTM}`,
    unsplash: `https://unsplash.com${UTM}`,
    photo: `${photo.unsplashUrl}${UTM}`,
  };
}

/**
 * A representative photo for a collection tile — the first photo of the first
 * product in that collection, so the tile shows the kind of shoe it links to.
 */
export function getCollectionPhoto(collectionSlug: string): ProductPhoto | undefined {
  const product = buildCatalog().find((p) => p.collection === collectionSlug);
  return product ? getProductPhoto(product.slug, 0) : undefined;
}

/** Hero image: the first featured product's photo. */
export function getHeroPhoto(): ProductPhoto | undefined {
  const featured = buildCatalog().find((p) => p.isFeatured) ?? buildCatalog()[0];
  return featured ? getProductPhoto(featured.slug, 1) : undefined;
}
