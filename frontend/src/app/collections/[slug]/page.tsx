import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/common/container";
import { EmptyState } from "@/components/common/empty-state";
import { CollectionToolbar } from "@/components/collection/collection-toolbar";
import { FilterPanel } from "@/components/collection/filter-panel";
import { Pagination } from "@/components/collection/pagination";
import { ProductCard } from "@/components/product/product-card";
import { brand } from "@/config/brand";
import { parseProductQuery, type RawParams } from "@/lib/collection-params";
import { getCollectionBySlug, getCollections, getProducts } from "@/lib/api/products";

/**
 * Collection page.
 *
 * A Server Component that reads its entire state from the URL. There is no
 * client-side filtering: changing a filter changes the URL, Next.js re-renders
 * this component on the server, and the new HTML streams back. That keeps the
 * page shareable, bookmarkable, back-button-correct and indexable.
 *
 * `/collections/all` is a real route that shows everything, which is why the
 * slug lookup falls back rather than 404ing on it.
 */

/**
 * Collections are a fixed, known set, so any other slug is rejected by the
 * router before rendering starts. That is what makes a real 404 STATUS
 * possible: this route is dynamic (it reads searchParams), so once rendering
 * begins the 200 header has already been streamed and a later notFound() can
 * change the page body but not the status code.
 */
export const dynamicParams = false;

/** Pre-renders the six collection routes plus `all` at build time. */
export async function generateStaticParams() {
  const collections = await getCollections();
  return [{ slug: "all" }, ...collections.map((c) => ({ slug: c.slug }))];
}

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawParams>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "all") {
    return { title: "All shoes", description: brand.description };
  }
  const collection = await getCollectionBySlug(slug);
  // notFound() here as well as in the page: generateMetadata resolves in
  // parallel with the page, and a metadata object that resolves successfully
  // lets the response commit with status 200 even though the page renders the
  // not-found boundary. Both must agree for the status code to be correct.
  if (!collection) notFound();
  return { title: collection.name, description: collection.description };
}

export default async function CollectionPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const raw = await searchParams;

  const isAll = slug === "all";
  const collection = isAll ? null : await getCollectionBySlug(slug);
  if (!isAll && !collection) notFound();

  // On /collections/all the collection itself becomes a filter, so it is read
  // from the query string instead of the route.
  const query = parseProductQuery(raw, isAll ? undefined : slug);
  const { items, meta, facets } = await getProducts(query);

  // Rebuilt here so links and the "clear" action share the page's own params.
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") urlParams.set(key, value);
    else if (Array.isArray(value) && value[0]) urlParams.set(key, value[0]);
  }
  const pathname = `/collections/${slug}`;

  const title = isAll ? "All shoes" : (collection?.name ?? "");
  const description = isAll ? "Every pair in the store." : (collection?.description ?? "");

  return (
    <main id="main" className="py-section lg:py-section-lg">
      <Container>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb">
          <ol className="text-muted-foreground text-body-xs flex items-center gap-1">
            <li>
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
            </li>
            <ChevronRight className="size-3" aria-hidden="true" />
            <li aria-current="page" className="text-foreground">
              {title}
            </li>
          </ol>
        </nav>

        <header className="mt-4">
          <h1 className="text-h1">{title}</h1>
          {description ? (
            <p className="text-muted-foreground text-body-lg mt-2 max-w-prose">{description}</p>
          ) : null}
        </header>

        <div className="mt-10 lg:grid lg:grid-cols-[16rem_1fr] lg:gap-10">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <h2 className="sr-only">Filters</h2>
            <FilterPanel facets={facets} showCollection={isAll} />
          </aside>

          <div>
            <CollectionToolbar facets={facets} total={meta.total} showCollection={isAll} />

            {items.length === 0 ? (
              <EmptyState actionHref={pathname} />
            ) : (
              <>
                <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
                  {items.map((product, index) => (
                    <li key={product.id}>
                      <ProductCard product={product} priority={index < 3} />
                    </li>
                  ))}
                </ul>

                <Pagination meta={meta} pathname={pathname} params={urlParams} />
              </>
            )}
          </div>
        </div>
      </Container>
    </main>
  );
}
