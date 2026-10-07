"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/common/container";

/**
 * Root error boundary — catches a render failure anywhere that does not have a
 * closer boundary of its own.
 *
 * Must be a client component: React error boundaries rely on class-component
 * lifecycle, which only exists on the client. `reset()` re-runs the failed
 * render rather than forcing a full page reload.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replaced by Sentry in the monitoring phase.
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <main id="main" className="py-section lg:py-section-lg">
      <Container>
        <div className="flex flex-col items-center py-20 text-center">
          <h1 className="text-h2">Something went wrong</h1>
          <p className="text-muted-foreground text-body mt-3 max-w-sm">
            An unexpected error stopped this page from loading. Trying again often works.
          </p>
          {error.digest ? (
            <p className="text-muted-foreground text-body-xs mt-4 font-mono">
              Reference: {error.digest}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button onClick={reset}>Try again</Button>
            <Button asChild variant="outline">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </Container>
    </main>
  );
}
