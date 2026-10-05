import Link from "next/link";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";

/**
 * Placeholder home page.
 *
 * The real home page (hero, collection tiles, product rails, value props) is
 * built in a later phase. This exists so the site is navigable and so the
 * hard-coded-style check has nothing to flag.
 */
export default function HomePage() {
  return (
    <main
      id="main"
      className="px-gutter lg:px-gutter-lg mx-auto flex w-full max-w-(--container-max) flex-1 flex-col items-center justify-center py-24 text-center"
    >
      <p className="text-muted-foreground text-body-sm">{brand.name}</p>
      <h1 className="text-display mt-3">{brand.tagline}</h1>
      <p className="text-muted-foreground text-body-lg mt-6 max-w-xl">{brand.description}</p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/design-system">View the design system</Link>
        </Button>
      </div>

      <p className="text-muted-foreground text-body-xs mt-12">
        Storefront pages are built in the phases ahead.
      </p>
    </main>
  );
}
