import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section, SectionHeading } from "@/components/common/section";
import { ShoeSilhouette } from "@/components/product/shoe-shapes";
import { getCollectionPhoto, photoUrl } from "@/lib/product-photos";
import type { Collection } from "@/types/catalog";

/**
 * Collection tiles.
 *
 * Each tile shows a real photograph of that kind of shoe, darkened by the
 * `--hero-overlay` scrim so the white label stays readable over any image.
 *
 * If a collection has no photo data the tile falls back to its silhouette on a
 * gradient, so a tile is never empty.
 */
const TILE_TINTS = [
  "var(--primary), var(--foreground)",
  "var(--foreground), var(--primary)",
  "var(--primary), var(--foreground)",
  "var(--foreground), var(--primary)",
  "var(--primary), var(--foreground)",
  "var(--foreground), var(--primary)",
];

const FALLBACK_PAINT = (id: string) => ({
  upper: "var(--primary-foreground)",
  sole: "var(--primary-foreground)",
  midsole: "var(--primary-foreground)",
  panel: "var(--primary-foreground)",
  line: "var(--primary-foreground)",
  gradientId: id,
});

export function CollectionTiles({ collections }: { collections: Collection[] }) {
  return (
    <Section>
      <SectionHeading
        title="Shop by collection"
        description="Six ways to walk. Pick the one that matches your day."
      />

      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {collections.map((collection, index) => {
          const photo = getCollectionPhoto(collection.slug);

          return (
            <li key={collection.slug}>
              <Link
                href={`/collections/${collection.slug}`}
                /* `isolate` is required, not decorative: the backdrop below uses
                   -z-10, and without a stacking context here it paints behind
                   the page background and disappears entirely. */
                className="group focus-visible:ring-ring rounded-image relative isolate flex aspect-4/3 flex-col justify-end overflow-hidden p-5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {photo ? (
                  <Image
                    src={photoUrl(photo, 800)}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
                    className="-z-20 object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <>
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 -z-20"
                      style={{
                        backgroundImage: `linear-gradient(135deg, ${TILE_TINTS[index % TILE_TINTS.length]})`,
                      }}
                    />
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 400 500"
                      className="pointer-events-none absolute -right-6 -bottom-16 -z-10 h-[150%] w-auto opacity-25"
                    >
                      <ShoeSilhouette
                        collection={collection.slug}
                        paint={FALLBACK_PAINT(`tile-${collection.slug}`)}
                      />
                    </svg>
                  </>
                )}

                {/* Scrim: keeps the label readable over any photograph. */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 -z-10"
                  style={{ backgroundImage: "var(--hero-overlay)" }}
                />

                <h3 className="text-primary-foreground text-h4">{collection.name}</h3>
                <p className="text-primary-foreground/80 text-body-xs mt-1 hidden sm:block">
                  {collection.description}
                </p>
                <span className="text-primary-foreground text-body-sm mt-3 inline-flex items-center gap-1">
                  Shop
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
