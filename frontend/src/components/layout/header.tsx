"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ShoppingBag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/common/container";
import { MobileMenu } from "./mobile-menu";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * Subscribe to window scroll the way React intends for external browser state.
 *
 * useSyncExternalStore takes three functions: how to subscribe, how to read
 * the current value in the browser, and what to return on the server. Using it
 * instead of useState + useEffect avoids a synchronous setState on mount
 * (which React warns about, since it causes a second render pass) and reads
 * the real scroll position correctly even if the page loads already scrolled.
 */
const SCROLL_THRESHOLD = 8;

function subscribeToScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

const isScrolled = () => window.scrollY > SCROLL_THRESHOLD;
/** The server has no scroll position; false keeps server and client markup in step. */
const isScrolledOnServer = () => false;

/**
 * Site header — sticky, with a desktop mega-menu and a mobile sheet.
 *
 * This is a client component only because of the scroll subscription that adds
 * a shadow once the page moves. Everything else here is static markup driven
 * by brand.nav.
 */
export function Header() {
  const scrolled = useSyncExternalStore(subscribeToScroll, isScrolled, isScrolledOnServer);

  return (
    <header
      className={cn(
        "bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 backdrop-blur transition-shadow",
        scrolled ? "shadow-card" : "border-border border-b",
      )}
    >
      <Container>
        <div className="h-header flex items-center justify-between gap-4">
          {/* Left: mobile menu trigger + wordmark */}
          <div className="flex items-center gap-1">
            <MobileMenu />
            <Link
              href="/"
              className="font-heading text-h4 tracking-tight"
              aria-label={`${brand.name} home`}
            >
              {brand.logoText}
            </Link>
          </div>

          {/* Centre: desktop navigation.
              The mega-menu opens on hover AND on keyboard focus (focus-within),
              so it is reachable without a mouse. */}
          <nav className="hidden lg:flex lg:items-center lg:gap-1" aria-label="Main">
            {brand.nav.map((item) => {
              const children = "children" in item ? item.children : undefined;
              return (
                <div key={item.label} className="group relative">
                  <Link
                    href={item.href}
                    className="hover:text-primary focus-visible:ring-ring text-body-sm inline-flex items-center px-3 py-2 font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {item.label}
                  </Link>

                  {children ? (
                    <div className="invisible absolute top-full left-0 z-50 opacity-0 transition-[opacity,visibility] duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                      <ul className="bg-popover text-popover-foreground shadow-popover rounded-card border-border mt-1 min-w-48 border p-2">
                        {children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className="hover:bg-muted rounded-button text-body-sm block px-3 py-2"
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>

          {/* Right: account and cart */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/account" aria-label="Account">
                <User className="size-5" aria-hidden="true" />
              </Link>
            </Button>

            {/* The cart drawer and its live item count arrive with the cart
                phase. Until then this is a labelled placeholder rather than a
                button that silently does nothing. */}
            <Button variant="ghost" size="icon" aria-label="Cart (empty)" disabled>
              <ShoppingBag className="size-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Container>
    </header>
  );
}
