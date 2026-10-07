import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, RotateCcw, Truck } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Container } from "@/components/common/container";
import { Rating } from "@/components/common/rating";
import { SectionHeading } from "@/components/common/section";
import { PriceTag } from "@/components/product/price-tag";
import { ProductBadges } from "@/components/product/product-badges";
import { ProductCard } from "@/components/product/product-card";
import { ProductPurchase } from "@/components/product/product-purchase";
import { brand } from "@/config/brand";
import { buildCatalog, GENDER_LABELS } from "@/data/catalog";
import { formatPrice } from "@/lib/format";
import { getProductBySlug, getRelatedProducts, isSoldOut } from "@/lib/api/products";

/**
 * Product detail page.
 *
 * Server Component: the product is fetched and rendered on the server so the
 * page is complete and indexable on first paint. Only the buy panel (colour,
 * size, quantity) is a client component.
 */

/** Pre-renders all 36 product routes at build time. */
export async function generateStaticParams() {
  return buildCatalog().map((product) => ({ slug: product.slug }));
}

/** The catalogue is a closed set, so unknown slugs 404 at the router — which
 *  is also what gives them a real 404 status rather than a streamed 200. */
export const dynamicParams = false;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return {
    title: product.name,
    description: product.shortDescription,
    openGraph: {
      title: `${product.name} — ${brand.name}`,
      description: product.shortDescription,
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id, 4);
  const soldOut = isSoldOut(product);

  /**
   * JSON-LD structured data.
   *
   * This is what lets Google show the price, currency and availability
   * directly in search results. It must agree with what the page displays —
   * which is why every value here is read from the same product object rather
   * than written out again.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    sku: product.variants[0]?.sku,
    brand: { "@type": "Brand", name: brand.name },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    },
    offers: {
      "@type": "Offer",
      priceCurrency: product.currency,
      // Schema.org expects a decimal string, not minor units.
      price: (product.priceCents / 100).toFixed(0),
      availability: soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    },
  };

  const details = (
    <div>
      <ProductBadges product={product} />
      <h1 className="text-h1 mt-3">{product.name}</h1>
      <p className="text-muted-foreground text-body-sm mt-1">
        {product.collection.charAt(0).toUpperCase() + product.collection.slice(1)} ·{" "}
        {GENDER_LABELS[product.gender]}
      </p>

      <div className="mt-3">
        <Rating value={product.rating} reviewCount={product.reviewCount} />
      </div>

      <PriceTag
        priceCents={product.priceCents}
        compareAtCents={product.compareAtCents}
        size="lg"
        className="mt-5"
      />
      {product.compareAtCents ? (
        <p className="text-sale text-body-sm mt-1">
          You save {formatPrice(product.compareAtCents - product.priceCents)}
        </p>
      ) : null}

      <p className="text-body mt-5">{product.shortDescription}</p>
    </div>
  );

  return (
    <main id="main" className="py-section lg:py-section-lg">
      {/* Structured data for search engines. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Container>
        <nav aria-label="Breadcrumb">
          <ol className="text-muted-foreground text-body-xs flex flex-wrap items-center gap-1">
            <li>
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
            </li>
            <ChevronRight className="size-3" aria-hidden="true" />
            <li>
              <Link href={`/collections/${product.collection}`} className="hover:text-foreground">
                {product.collection.charAt(0).toUpperCase() + product.collection.slice(1)}
              </Link>
            </li>
            <ChevronRight className="size-3" aria-hidden="true" />
            <li aria-current="page" className="text-foreground">
              {product.name}
            </li>
          </ol>
        </nav>

        <div className="mt-8">
          <ProductPurchase product={product} details={details} />
        </div>

        {/* Delivery and returns — numbers read from brand config so they can
            never drift from what checkout actually charges. */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
          <div className="flex gap-3">
            <Truck className="text-primary size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-body-sm font-medium">
                Free delivery over {formatPrice(brand.shipping.freeThresholdCents)}
              </p>
              <p className="text-muted-foreground text-body-xs mt-0.5">
                Otherwise {formatPrice(brand.shipping.flatRateCents)} ·{" "}
                {brand.shipping.estimatedDays}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <RotateCcw className="text-primary size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-body-sm font-medium">{brand.returns.days}-day returns</p>
              <p className="text-muted-foreground text-body-xs mt-0.5">
                Unworn, in original packaging
              </p>
            </div>
          </div>
        </div>

        {/* Accordions */}
        <Accordion type="multiple" defaultValue={["details"]} className="mt-12 lg:max-w-2xl">
          <AccordionItem value="details">
            <AccordionTrigger>Details and features</AccordionTrigger>
            <AccordionContent>
              <p className="text-body whitespace-pre-line">{product.description}</p>
              <ul className="text-body-sm mt-4 list-disc space-y-1 pl-5">
                {product.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="materials">
            <AccordionTrigger>Materials</AccordionTrigger>
            <AccordionContent>
              <p className="text-body">{product.material}</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="care">
            <AccordionTrigger>Care</AccordionTrigger>
            <AccordionContent>
              <p className="text-body">{product.care}</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="shipping">
            <AccordionTrigger>Shipping and returns</AccordionTrigger>
            <AccordionContent>
              <p className="text-body">
                Standard delivery {formatPrice(brand.shipping.flatRateCents)} (
                {brand.shipping.estimatedDays}), or express{" "}
                {formatPrice(brand.shipping.expressRateCents)} (
                {brand.shipping.expressEstimatedDays}). Free over{" "}
                {formatPrice(brand.shipping.freeThresholdCents)}. Return unworn items within{" "}
                {brand.returns.days} days.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Related */}
        {related.length ? (
          <section className="mt-20">
            <SectionHeading title="You may also like" />
            <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
              {related.map((item) => (
                <li key={item.id}>
                  <ProductCard product={item} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Container>
    </main>
  );
}
