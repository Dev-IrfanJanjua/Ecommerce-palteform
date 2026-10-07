import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/common/container";
import { SuccessClient } from "./success-client";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false, follow: false },
};

export default function CheckoutSuccessPage() {
  return (
    <main id="main" className="py-section lg:py-section-lg">
      <Container>
        {/* useSearchParams needs a Suspense boundary: without one, Next.js
            cannot prerender any of this route and opts the whole page out of
            static generation. */}
        <Suspense fallback={<div className="py-24 text-center">Loading…</div>}>
          <SuccessClient />
        </Suspense>
      </Container>
    </main>
  );
}
