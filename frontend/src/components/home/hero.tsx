import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/common/container";
import { brand } from "@/config/brand";

/**
 * Hero.
 *
 * No photography exists yet, so the backdrop is a token-built gradient rather
 * than a missing <img>. The `--hero-overlay` scrim is already applied over it,
 * so dropping a real photograph in later means swapping the background layer
 * and nothing else — the text contrast treatment is already correct.
 */
export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="from-primary via-primary to-foreground absolute inset-0 -z-20 bg-gradient-to-br"
      />
      {/* Scrim — the same token a real photo would sit under. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{ backgroundImage: "var(--hero-overlay)" }}
      />

      <Container>
        <div className="py-section lg:py-section-lg flex min-h-[32rem] max-w-2xl flex-col justify-center lg:min-h-[38rem]">
          <p className="text-primary-foreground/80 text-body-sm">{brand.name}</p>

          <h1 className="text-primary-foreground text-display mt-3">{brand.tagline}</h1>

          <p className="text-primary-foreground/85 text-body-lg mt-6 max-w-lg">
            {brand.description}
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link href="/collections/all">Shop all shoes</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground bg-transparent"
            >
              <Link href="/collections/all?isNew=true">New arrivals</Link>
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
