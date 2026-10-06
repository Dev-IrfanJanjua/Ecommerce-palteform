import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/common/section";
import { CollectionTiles } from "@/components/home/collection-tiles";
import { EditorialBanner } from "@/components/home/editorial-banner";
import { Hero } from "@/components/home/hero";
import { ProductRail } from "@/components/home/product-rail";
import { ValueProps } from "@/components/home/value-props";
import { ProductCard } from "@/components/product/product-card";
import { getBestsellers, getCollections, getNewArrivals } from "@/lib/api/products";

/**
 * Home page.
 *
 * A Server Component: all four data calls happen on the server before any HTML
 * is sent, so the page arrives complete and indexable with no loading spinner
 * and no client-side fetch waterfall.
 *
 * The calls run in parallel via Promise.all — awaiting them one after another
 * would make the page as slow as the sum of all four rather than the slowest.
 */
export default async function HomePage() {
  const [collections, newArrivals, bestsellers] = await Promise.all([
    getCollections(),
    getNewArrivals(8),
    getBestsellers(8),
  ]);

  return (
    <main id="main">
      <Hero />

      <CollectionTiles collections={collections} />

      {/* New arrivals rail */}
      <Section surface>
        <SectionHeading
          title="New arrivals"
          description="The latest additions, fresh off the line."
          action={
            <Button asChild variant="outline">
              <Link href="/collections/all?isNew=true">View all</Link>
            </Button>
          }
        />
        <ProductRail label="New arrivals">
          {newArrivals.map((product) => (
            <li key={product.id} className="w-44 shrink-0 snap-start sm:w-56 lg:w-64">
              <ProductCard product={product} />
            </li>
          ))}
        </ProductRail>
      </Section>

      <EditorialBanner />

      {/* Bestsellers grid */}
      <Section>
        <SectionHeading
          title="Bestsellers"
          description="What everyone else is wearing."
          action={
            <Button asChild variant="outline">
              <Link href="/collections/all?sort=best-selling">View all</Link>
            </Button>
          }
        />
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {bestsellers.map((product, index) => (
            <li key={product.id}>
              {/* Only the first row is marked priority — beyond that, eager
                  loading competes with content the shopper can actually see. */}
              <ProductCard product={product} priority={index < 4} />
            </li>
          ))}
        </ul>
      </Section>

      <ValueProps />
    </main>
  );
}
