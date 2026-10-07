"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/common/container";

/**
 * Error boundary for the product route.
 *
 * Must be a client component — React error boundaries rely on class component
 * lifecycle, which only exists on the client. `reset()` re-runs the failed
 * render rather than forcing a full page reload.
 */
export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replaced by Sentry in the monitoring phase.
    console.error("Product page failed to render:", error);
  }, [error]);

  return (
    <main className="py-section lg:py-section-lg">
      <Container>
        <div className="flex flex-col items-center py-20 text-center">
          <h1 className="text-h2">Something went wrong</h1>
          <p className="text-muted-foreground text-body mt-3 max-w-sm">
            We could not load this product. Please try again.
          </p>
          <Button onClick={reset} className="mt-8">
            Try again
          </Button>
        </div>
      </Container>
    </main>
  );
}
