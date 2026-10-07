import type { Metadata } from "next";
import { Container } from "@/components/common/container";
import { CheckoutClient } from "./checkout-client";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your order.",
  // A checkout page has nothing to offer a search engine and should never
  // appear in results.
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <main id="main" className="py-section lg:py-section-lg">
      <Container>
        <h1 className="text-h1">Checkout</h1>
        <div className="mt-8">
          <CheckoutClient />
        </div>
      </Container>
    </main>
  );
}
