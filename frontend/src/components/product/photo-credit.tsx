import { creditLinks, getProductPhotos } from "@/lib/product-photos";

/**
 * Photographer attribution.
 *
 * Required by the Unsplash API Guidelines: when their photos are used, the
 * photographer and Unsplash must both be credited with links back, carrying
 * the app's UTM parameters. This is a licence obligation, not decoration — do
 * not remove it while Unsplash photography is in use.
 */
export function PhotoCredit({ productSlug }: { productSlug: string }) {
  const photos = getProductPhotos(productSlug);
  if (!photos.length) return null;

  // One photographer may have supplied several of a product's four views.
  const unique = [...new Map(photos.map((p) => [p.photographerUrl, p])).values()];

  return (
    <p className="text-muted-foreground text-body-xs mt-4">
      Photography by{" "}
      {unique.map((photo, index) => (
        <span key={photo.photographerUrl}>
          {index > 0 ? ", " : ""}
          <a
            href={creditLinks(photo).photographer}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground underline underline-offset-2"
          >
            {photo.photographer}
          </a>
        </span>
      ))}{" "}
      on{" "}
      <a
        href={creditLinks(unique[0]).unsplash}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground underline underline-offset-2"
      >
        Unsplash
      </a>
      . Stock imagery — not a photograph of this product.
    </p>
  );
}
