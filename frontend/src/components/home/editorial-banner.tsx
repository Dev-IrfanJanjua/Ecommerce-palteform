import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/common/container";
import { brand } from "@/config/brand";
import { formatPrice } from "@/lib/format";

/**
 * Editorial banner — one large block pointing at the sale.
 *
 * The free-delivery figure is read from brand config and formatted through
 * formatPrice(), so it stays in step with the cart and the footer rather than
 * being a number typed into marketing copy.
 */
export function EditorialBanner() {
  return (
    <section className="py-section lg:py-section-lg">
      <Container>
        <div className="rounded-card relative isolate overflow-hidden">
          <div
            aria-hidden="true"
            className="from-foreground to-primary absolute inset-0 -z-10 bg-gradient-to-r"
          />
          <div className="px-6 py-14 text-center lg:px-16 lg:py-20">
            <p className="text-primary-foreground/80 text-body-sm">Season sale</p>
            <h2 className="text-primary-foreground text-h1 mt-3">Up to 20% off selected shoes</h2>
            <p className="text-primary-foreground/85 text-body-lg mx-auto mt-4 max-w-xl">
              Free delivery on orders over {formatPrice(brand.shipping.freeThresholdCents)}, and{" "}
              {brand.returns.days} days to change your mind.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-8">
              <Link href="/collections/all?onSale=true">Shop the sale</Link>
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
