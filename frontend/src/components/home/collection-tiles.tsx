import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section, SectionHeading } from "@/components/common/section";
import type { Collection } from "@/types/catalog";

/**
 * The six collections as tiles.
 *
 * Collection photography does not exist yet either, so each tile uses a
 * token-built gradient keyed to its position. Dropping real images in means
 * replacing the backdrop div with next/image at `collection.image`, which the
 * data layer already supplies.
 */
const TILE_TINTS = [
  "from-primary to-foreground",
  "from-foreground to-primary",
  "from-primary/90 to-foreground/95",
  "from-foreground/95 to-primary/90",
  "from-primary to-foreground/90",
  "from-foreground/90 to-primary",
];

export function CollectionTiles({ collections }: { collections: Collection[] }) {
  return (
    <Section>
      <SectionHeading
        title="Shop by collection"
        description="Six ways to walk. Pick the one that matches your day."
      />

      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {collections.map((collection, index) => (
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
                className={`absolute inset-0 -z-10 bg-gradient-to-br ${TILE_TINTS[index % TILE_TINTS.length]} transition-transform duration-500 group-hover:scale-105`}
              />
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
        ))}
      </ul>
    </Section>
  );
}
