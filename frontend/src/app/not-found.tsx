import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/common/container";

export default function NotFound() {
  return (
    <main id="main" className="py-section lg:py-section-lg">
      <Container>
        <div className="flex flex-col items-center py-20 text-center">
          <h1 className="text-h2">Page not found</h1>
          <p className="text-muted-foreground text-body mt-3 max-w-sm">
            That page does not exist. It may have been moved or renamed.
          </p>
          <Button asChild className="mt-8">
            <Link href="/collections/all">Shop all shoes</Link>
          </Button>
        </div>
      </Container>
    </main>
  );
}
