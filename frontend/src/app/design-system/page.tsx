import type { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { brand } from "@/config/brand";
import { discountPercent, formatPrice } from "@/lib/format";
import { ProductImage } from "@/components/product/product-image";
import { buildCatalog, buildCollections } from "@/data/catalog";

export const metadata: Metadata = {
  title: "Design system",
  description: "Every design token in one place.",
};

/* ------------------------------------------------------------------ */

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border border-t py-10">
      <h2 className="text-h3">{title}</h2>
      {hint ? <p className="text-muted-foreground text-body-sm mt-1">{hint}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Swatch({ name, className, note }: { name: string; className: string; note?: string }) {
  return (
    <div>
      <div className={`border-border rounded-card h-16 w-full border ${className}`} />
      <p className="text-body-xs mt-2 font-medium">{name}</p>
      {note ? <p className="text-muted-foreground text-body-xs">{note}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/* Real colourways from the catalog. Typing hex literals here would trip the
   hard-coded-style guard — product colour is data, and it belongs in the data
   layer, not in a component. */
const courtClassic = buildCatalog().find((p) => p.slug === "court-classic-low");
const sampleColors = courtClassic?.colors ?? [];
const sampleHex = sampleColors[2]?.hex ?? sampleColors[0]?.hex ?? "";

export default function DesignSystemPage() {
  // Sample prices in minor units (paisa), matching the real catalog ladder.
  const price = 2499000;
  const compareAt = 3199000;

  return (
    <main
      id="main"
      className="px-gutter py-section lg:px-gutter-lg mx-auto w-full max-w-(--container-max)"
    >
      <header>
        <p className="text-muted-foreground text-body-sm">{brand.name} design system</p>
        <h1 className="text-display mt-2">Every token, one page</h1>
        <p className="text-muted-foreground text-body-lg mt-4 max-w-2xl">
          Change a value in <code className="text-foreground">src/styles/tokens.css</code> or{" "}
          <code className="text-foreground">src/styles/fonts.ts</code> and everything below — and
          every page of the store — changes with it.
        </p>
      </header>

      {/* ---------------------------------------------------------- */}
      <Section title="Core colours" hint="Named after their job, never their colour.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Swatch name="background" className="bg-background" />
          <Swatch name="foreground" className="bg-foreground" />
          <Swatch name="card" className="bg-card" />
          <Swatch name="primary" className="bg-primary" />
          <Swatch name="secondary" className="bg-secondary" />
          <Swatch name="muted" className="bg-muted" />
          <Swatch name="surface" className="bg-surface" />
          <Swatch name="accent" className="bg-accent" note="fills only, never text" />
          <Swatch name="destructive" className="bg-destructive" />
          <Swatch name="border" className="bg-border" />
          <Swatch name="input" className="bg-input" note="darker — needs 3:1" />
          <Swatch name="ring" className="bg-ring" />
        </div>
      </Section>

      <Section title="Storefront colours" hint="Specific jobs in the shopping experience.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Swatch name="sale" className="bg-sale" />
          <Swatch name="success" className="bg-success" note="in stock" />
          <Swatch name="warning" className="bg-warning" note="low stock" />
          <Swatch name="badge-new" className="bg-badge-new" />
          <Swatch name="badge-bestseller" className="bg-badge-bestseller" />
          <Swatch name="announcement-bg" className="bg-announcement-bg" />
          <Swatch name="footer-bg" className="bg-footer-bg" />
          <Swatch name="rating" className="bg-rating" />
        </div>
      </Section>

      {/* ---------------------------------------------------------- */}
      <Section title="Contrast in practice" hint="Each pair below meets WCAG AA.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-primary text-primary-foreground rounded-card text-body-sm p-4">
            primary / primary-foreground
          </div>
          <div className="bg-accent text-accent-foreground rounded-card text-body-sm p-4">
            accent / accent-foreground (near-black, not white)
          </div>
          <div className="bg-sale text-sale-foreground rounded-card text-body-sm p-4">
            sale / sale-foreground
          </div>
          <div className="bg-badge-bestseller text-badge-bestseller-foreground rounded-card text-body-sm p-4">
            bestseller badge
          </div>
          <div className="bg-footer-bg text-footer-foreground rounded-card text-body-sm p-4">
            footer / footer-foreground
          </div>
          <div className="bg-footer-bg text-footer-muted rounded-card text-body-sm p-4">
            footer / footer-muted
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------- */}
      <Section
        title="Type scale"
        hint="Display and h1 are fluid — resize the window to see them grow."
      >
        <div className="space-y-3">
          <p className="text-display">Display — {brand.tagline}</p>
          <p className="text-h1">Heading 1 — New arrivals</p>
          <p className="text-h2">Heading 2 — Running shoes</p>
          <p className="text-h3">Heading 3 — Product details</p>
          <p className="text-h4">Heading 4 — Materials and care</p>
          <Separator className="my-4" />
          <p className="text-body-lg">Body large — intro paragraphs and hero supporting copy.</p>
          <p className="text-body">Body — the default size for everything on the site.</p>
          <p className="text-muted-foreground text-body-sm">
            Body small — captions and helper text.
          </p>
          <p className="text-muted-foreground text-body-xs">
            Body extra small — legal and metadata.
          </p>
        </div>
      </Section>

      {/* ---------------------------------------------------------- */}
      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Add to cart</Button>
          <Button variant="secondary">Continue shopping</Button>
          <Button variant="outline">Size guide</Button>
          <Button variant="ghost">Clear filters</Button>
          <Button variant="destructive">Remove</Button>
          <Button disabled>Sold out</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      {/* ---------------------------------------------------------- */}
      <Section
        title="Form controls"
        hint="Input borders use the darker --input token so the field edge is visible."
      >
        <div className="grid max-w-md gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ds-email">Email</Label>
            <Input id="ds-email" type="email" placeholder="you@example.com" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="ds-stock" />
            <Label htmlFor="ds-stock">In stock only</Label>
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------- */}
      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-badge-new text-badge-new-foreground">New</Badge>
          <Badge className="bg-sale text-sale-foreground">Sale</Badge>
          <Badge className="bg-badge-bestseller text-badge-bestseller-foreground">Bestseller</Badge>
          <Badge variant="secondary">Unisex</Badge>
          <Badge variant="outline">EU 42</Badge>
        </div>
      </Section>

      {/* ---------------------------------------------------------- */}
      <Section
        title="Prices"
        hint={`Formatted for ${brand.locale} in ${brand.currency}, with no decimals.`}
      >
        <div className="flex flex-wrap items-baseline gap-6">
          <span className="text-h3">{formatPrice(price)}</span>
          <span className="flex items-baseline gap-2">
            <span className="text-sale text-h3">{formatPrice(price)}</span>
            <span className="text-muted-foreground text-body-sm line-through">
              {formatPrice(compareAt)}
            </span>
            <Badge className="bg-sale text-sale-foreground">
              −{discountPercent(price, compareAt)}%
            </Badge>
          </span>
        </div>
        <div className="text-body-sm mt-4 space-y-1">
          <p className="text-success">In stock</p>
          <p className="text-warning">Only 2 left</p>
          <p className="text-muted-foreground">Sold out</p>
        </div>
      </Section>

      {/* ---------------------------------------------------------- */}
      <Section
        title="Product card"
        hint="Composed entirely from tokens — no colour or size is hard-coded."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <article className="bg-card shadow-card rounded-card overflow-hidden">
            <div className="bg-surface relative aspect-4/5">
              <Badge className="bg-badge-new text-badge-new-foreground absolute top-2 left-2">
                New
              </Badge>
            </div>
            <div className="p-3">
              <h3 className="text-body-sm font-medium">Court Classic Low</h3>
              <p className="text-muted-foreground text-body-xs">Sneakers · Unisex</p>
              <p className="text-body-sm mt-2 font-semibold">{formatPrice(price)}</p>
            </div>
          </article>

          <article className="bg-card shadow-card rounded-card overflow-hidden">
            <div className="bg-surface relative aspect-4/5">
              <Badge className="bg-sale text-sale-foreground absolute top-2 left-2">Sale</Badge>
            </div>
            <div className="p-3">
              <h3 className="text-body-sm font-medium">Metro Canvas</h3>
              <p className="text-muted-foreground text-body-xs">Sneakers · Unisex</p>
              <p className="text-body-sm mt-2 flex items-baseline gap-2">
                <span className="text-sale font-semibold">{formatPrice(price)}</span>
                <span className="text-muted-foreground text-body-xs line-through">
                  {formatPrice(compareAt)}
                </span>
              </p>
            </div>
          </article>

          {/* Loading state */}
          <article className="bg-card shadow-card rounded-card overflow-hidden">
            <Skeleton className="aspect-4/5 rounded-none" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </article>
        </div>
      </Section>

      {/* ---------------------------------------------------------- */}
      <Section
        title="Product placeholders"
        hint="One silhouette per collection, painted from each colourway's own hex. Swapped for real photography by flipping HAS_REAL_PHOTOS in product-image.tsx."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {buildCollections().map((collection) => (
            <figure key={collection.slug}>
              <div className="rounded-image bg-surface relative aspect-4/5 overflow-hidden">
                <ProductImage
                  alt={`${collection.name} placeholder`}
                  hex={sampleHex}
                  collection={collection.slug}
                />
              </div>
              <figcaption className="text-muted-foreground text-body-xs mt-2">
                {collection.name}
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="text-muted-foreground text-body-sm mt-8">
          The same silhouette in different colourways:
        </p>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {sampleColors.map((color) => (
            <figure key={color.name}>
              <div className="rounded-image bg-surface relative aspect-4/5 overflow-hidden">
                <ProductImage
                  alt={`Sneaker in ${color.name}`}
                  hex={color.hex}
                  collection="sneakers"
                />
              </div>
              <figcaption className="text-muted-foreground text-body-xs mt-2">
                {color.name}
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------- */}
      <Section title="Radius, shadow and surfaces">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="bg-card rounded-button border-border text-body-sm border p-4">
            radius-button
          </div>
          <div className="bg-card rounded-card border-border text-body-sm border p-4">
            radius-card
          </div>
          <div className="bg-card rounded-image border-border text-body-sm border p-4">
            radius-image
          </div>
          <div className="bg-card shadow-card rounded-card text-body-sm p-4">shadow-card</div>
          <div className="bg-card shadow-popover rounded-card text-body-sm p-4">shadow-popover</div>
          <div className="bg-card shadow-drawer rounded-card text-body-sm p-4">shadow-drawer</div>
        </div>
      </Section>

      {/* ---------------------------------------------------------- */}
      <Section title="Accordion" hint="Used on the product page for details, materials and care.">
        <Accordion type="single" collapsible className="max-w-xl">
          <AccordionItem value="details">
            <AccordionTrigger>Details and features</AccordionTrigger>
            <AccordionContent>Sample content for the design system preview.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="shipping">
            <AccordionTrigger>Shipping and returns</AccordionTrigger>
            <AccordionContent>
              {brand.shipping.estimatedDays}. Free over{" "}
              {formatPrice(brand.shipping.freeThresholdCents)}. {brand.returns.days}-day returns.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Section>

      {/* ---------------------------------------------------------- */}
      <Section
        title="Brand config"
        hint="Read live from src/config/brand.ts — nothing here is typed twice."
      >
        <dl className="text-body-sm grid gap-x-8 gap-y-2 sm:grid-cols-[auto_1fr]">
          <dt className="text-muted-foreground">Name</dt>
          <dd>{brand.name}</dd>
          <dt className="text-muted-foreground">Tagline</dt>
          <dd>{brand.tagline}</dd>
          <dt className="text-muted-foreground">Currency</dt>
          <dd>
            {brand.currency} ({brand.locale})
          </dd>
          <dt className="text-muted-foreground">Free delivery over</dt>
          <dd>{formatPrice(brand.shipping.freeThresholdCents)}</dd>
          <dt className="text-muted-foreground">Standard delivery</dt>
          <dd>
            {formatPrice(brand.shipping.flatRateCents)} · {brand.shipping.estimatedDays}
          </dd>
          <dt className="text-muted-foreground">Express delivery</dt>
          <dd>
            {formatPrice(brand.shipping.expressRateCents)} · {brand.shipping.expressEstimatedDays}
          </dd>
          <dt className="text-muted-foreground">Returns</dt>
          <dd>{brand.returns.days} days</dd>
        </dl>
      </Section>
    </main>
  );
}
