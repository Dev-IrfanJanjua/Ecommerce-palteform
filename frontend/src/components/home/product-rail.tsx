"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Horizontally scrolling product rail with arrow controls.
 *
 * This is a client component because it measures and scrolls a DOM element.
 * The product cards themselves are passed in as `children`, so they stay
 * Server Components and ship no JavaScript — a client component can render
 * server-rendered children, it just cannot import them directly.
 *
 * Keyboard users do not need the arrows: the rail is focusable and scrolls
 * with the arrow keys, which is why it carries tabIndex and a label.
 */
export function ProductRail({ children, label }: { children: React.ReactNode; label: string }) {
  const scroller = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  function updateArrows() {
    const el = scroller.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }

  function scrollBy(direction: 1 | -1) {
    const el = scroller.current;
    if (!el) return;
    // Scroll by roughly one card, so items land in a predictable place.
    el.scrollBy({ left: direction * Math.min(el.clientWidth * 0.8, 600), behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div className="absolute -top-14 right-0 hidden gap-2 sm:flex">
        <Button
          variant="outline"
          size="icon"
          onClick={() => scrollBy(-1)}
          disabled={atStart}
          aria-label={`Scroll ${label} left`}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => scrollBy(1)}
          disabled={atEnd}
          aria-label={`Scroll ${label} right`}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <ul
        ref={scroller}
        onScroll={updateArrows}
        tabIndex={0}
        aria-label={label}
        className="focus-visible:ring-ring -mx-gutter px-gutter lg:-mx-gutter-lg lg:px-gutter-lg flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto pb-2 focus-visible:ring-2 focus-visible:outline-none [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
    </div>
  );
}
