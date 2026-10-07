import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/common/container";
import { brand } from "@/config/brand";
import { getHeroPhoto, photoUrl } from "@/lib/product-photos";

/**
 * Hero.
 *
 * The backdrop is a real photograph with the `--hero-overlay` scrim over it,
 * which is what keeps the white headline readable regardless of how light the
 * image happens to be. Falls back to a token gradient if there is no photo
 * data, so the hero is never blank.
 */
export function Hero() {
  const photo = getHeroPhoto();

  return (
    <section className="relative isolate overflow-hidden">
      {/* Backdrop */}
      {photo ? (
        <Image
          src={photoUrl(photo, 1920)}
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="from-primary via-primary to-foreground absolute inset-0 -z-20 bg-gradient-to-br"
        />
      )}
      {/* Scrim — the same token a real photo would sit under. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{ backgroundImage: "var(--hero-overlay)" }}
      />
      {/* A photograph needs more than the standard scrim for the headline to
          clear contrast on its lighter areas. */}
      <div aria-hidden="true" className="bg-foreground/45 absolute inset-0 -z-10" />

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
