import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section, SectionHeading } from "@/components/common/section";
import { ShoeSilhouette } from "@/components/product/shoe-shapes";
import type { Collection } from "@/types/catalog";

/**
 * Collection tiles.
 *
 * The first version used six identical navy gradients, which told the shopper
 * nothing and read as placeholder filler. Each tile now shows that
 * collection's own silhouette, so "Boots" looks like a boot — the tile does
 * the job an photograph would, and is obviously an illustration rather than a
 * failed image.
 *
 * Tints are drawn from theme tokens with varying mix ratios, so a palette
 * change still restyles them.
 */
const TILE_STYLES = [
  { from: "var(--primary)", to: "var(--foreground)", shoe: 0.26 },
  { from: "var(--foreground)", to: "var(--primary)", shoe: 0.3 },
  { from: "var(--primary)", to: "var(--foreground)", shoe: 0.22 },
  { from: "var(--foreground)", to: "var(--primary)", shoe: 0.34 },
  { from: "var(--primary)", to: "var(--foreground)", shoe: 0.3 },
  { from: "var(--foreground)", to: "var(--primary)", shoe: 0.24 },
];

/** Monochrome paint so the tile shoe reads as a graphic, not a product. */
function tilePaint(id: string) {
  return {
    upper: "var(--primary-foreground)",
    sole: "var(--primary-foreground)",
    midsole: "var(--primary-foreground)",
    panel: "var(--primary-foreground)",
    line: "var(--primary-foreground)",
    gradientId: id,
  };
}

export function CollectionTiles({ collections }: { collections: Collection[] }) {
  return (
    <Section>
      <SectionHeading
        title="Shop by collection"
        description="Six ways to walk. Pick the one that matches your day."
      />

      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {collections.map((collection, index) => {
          const style = TILE_STYLES[index % TILE_STYLES.length];
          const gradientId = `tile-${collection.slug}`;

          return (
            <li key={collection.slug}>
              <Link
                href={`/collections/${collection.slug}`}
                /* `isolate` is required, not decorative: the backdrop below uses
                   -z-10, and without a stacking context here it paints behind
                   the page background and disappears entirely. */
                className="group focus-visible:ring-ring rounded-image relative isolate flex aspect-4/3 flex-col justify-end overflow-hidden p-5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0 -z-20"
                  style={{ backgroundImage: `linear-gradient(135deg, ${style.from}, ${style.to})` }}
                />

                {/* The collection's own shoe, oversized and bleeding off the
                    tile so it reads as artwork rather than a product shot. */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 400 500"
                  className="pointer-events-none absolute -right-6 -bottom-16 -z-10 h-[150%] w-auto transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3"
                  style={{ opacity: style.shoe }}
                >
                  <ShoeSilhouette collection={collection.slug} paint={tilePaint(gradientId)} />
                </svg>

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
