"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/format";
import { isSelected, setParam, toggleListParam } from "@/lib/collection-params";
import { cn } from "@/lib/utils";
import type { ProductFacets } from "@/types/catalog";

/**
 * Filter panel — every control writes to the URL, never to local state.
 *
 * `useTransition` keeps the current results on screen while the server
 * re-renders with the new filters, instead of blanking the grid. `isPending`
 * dims the panel so the delay is visible rather than feeling broken.
 *
 * `scroll: false` stops the page jumping to the top each time a checkbox is
 * ticked, which is maddening when working down a filter list.
 */
export function FilterPanel({
  facets,
  showCollection = false,
  className,
}: {
  facets: ProductFacets;
  showCollection?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function apply(next: URLSearchParams) {
    const query = next.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function toggle(key: string, value: string) {
    apply(toggleListParam(params, key, value));
  }

  function toggleFlag(key: string) {
    apply(setParam(params, key, params.get(key) ? undefined : "1"));
  }

  const groups: string[] = ["gender", "size", "color", "price"];
  if (showCollection) groups.unshift("collection");

  return (
    <div
      className={cn(isPending && "pointer-events-none opacity-60", className)}
      aria-busy={isPending}
    >
      {/* Quick toggles */}
      <div className="border-border space-y-3 border-b pb-5">
        {[
          { key: "inStock", label: "In stock only", count: facets.inStock },
          { key: "onSale", label: "On sale", count: facets.onSale },
          { key: "isNew", label: "New arrivals", count: facets.isNew },
        ].map((item) => (
          <div key={item.key} className="flex items-center gap-2">
            <Checkbox
              id={`filter-${item.key}`}
              checked={Boolean(params.get(item.key))}
              onCheckedChange={() => toggleFlag(item.key)}
            />
            <Label htmlFor={`filter-${item.key}`} className="text-body-sm font-normal">
              {item.label} <span className="text-muted-foreground">({item.count})</span>
            </Label>
          </div>
        ))}
      </div>

      <Accordion type="multiple" defaultValue={groups}>
        {showCollection ? (
          <AccordionItem value="collection">
            <AccordionTrigger className="text-body-sm">Collection</AccordionTrigger>
            <AccordionContent className="space-y-3">
              {facets.collection.map((bucket) => (
                <FacetCheckbox
                  key={bucket.value}
                  id={`collection-${bucket.value}`}
                  label={bucket.label}
                  count={bucket.count}
                  checked={isSelected(params, "collection", bucket.value)}
                  onToggle={() => toggle("collection", bucket.value)}
                />
              ))}
            </AccordionContent>
          </AccordionItem>
        ) : null}

        <AccordionItem value="gender">
          <AccordionTrigger className="text-body-sm">Gender</AccordionTrigger>
          <AccordionContent className="space-y-3">
            {facets.gender.map((bucket) => (
              <FacetCheckbox
                key={bucket.value}
                id={`gender-${bucket.value}`}
                label={bucket.label}
                count={bucket.count}
                checked={isSelected(params, "gender", bucket.value)}
                onToggle={() => toggle("gender", bucket.value)}
              />
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="size">
          <AccordionTrigger className="text-body-sm">Size (EU)</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-wrap gap-2">
              {facets.size.map((bucket) => {
                const selected = isSelected(params, "size", bucket.value);
                return (
                  <button
                    key={bucket.value}
                    type="button"
                    onClick={() => toggle("size", bucket.value)}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-button border-border focus-visible:ring-ring text-body-sm min-w-12 border px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none",
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted",
                    )}
                  >
                    {bucket.value}
                    <span className="sr-only"> — {bucket.count} products</span>
                  </button>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="color">
          <AccordionTrigger className="text-body-sm">Colour</AccordionTrigger>
          <AccordionContent>
            <ul className="flex flex-wrap gap-2">
              {facets.color.map((bucket) => {
                const selected = isSelected(params, "color", bucket.value);
                return (
                  <li key={bucket.value}>
                    <button
                      type="button"
                      onClick={() => toggle("color", bucket.value)}
                      aria-pressed={selected}
                      title={`${bucket.label} (${bucket.count})`}
                      className={cn(
                        "focus-visible:ring-ring rounded-button text-body-xs flex items-center gap-2 border px-2 py-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none",
                        selected ? "border-primary bg-muted" : "border-border hover:bg-muted",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="border-border size-4 rounded-full border"
                        style={{ backgroundColor: bucket.hex }}
                      />
                      {bucket.label}
                      <span className="text-muted-foreground">({bucket.count})</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="price">
          <AccordionTrigger className="text-body-sm">Price</AccordionTrigger>
          <AccordionContent className="space-y-3">
            {/* Preset bands rather than a slider: with 36 products a slider is
                fiddly on touch and harder to make accessible, and these cover
                the real range. */}
            {buildPriceBands(facets.priceRange.min, facets.priceRange.max).map((band) => {
              const selected =
                params.get("minPrice") === String(band.min) &&
                params.get("maxPrice") === String(band.max);
              return (
                <div key={band.label} className="flex items-center gap-2">
                  <Checkbox
                    id={`price-${band.label}`}
                    checked={selected}
                    onCheckedChange={() => {
                      let next = setParam(
                        params,
                        "minPrice",
                        selected ? undefined : String(band.min),
                      );
                      next = setParam(next, "maxPrice", selected ? undefined : String(band.max));
                      apply(next);
                    }}
                  />
                  <Label htmlFor={`price-${band.label}`} className="text-body-sm font-normal">
                    {band.label}
                  </Label>
                </div>
              );
            })}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function FacetCheckbox({
  id,
  label,
  count,
  checked,
  onToggle,
}: {
  id: string;
  label: string;
  count: number;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={onToggle} />
      <Label htmlFor={id} className="text-body-sm font-normal">
        {label} <span className="text-muted-foreground">({count})</span>
      </Label>
    </div>
  );
}

/** Four bands across the catalogue's actual price range, in paisa. */
function buildPriceBands(min: number, max: number) {
  const step = Math.ceil((max - min) / 4 / 100_000) * 100_000;
  return Array.from({ length: 4 }, (_, i) => {
    const lo = min + i * step;
    const hi = i === 3 ? max : min + (i + 1) * step - 1;
    return { min: lo, max: hi, label: `${formatPrice(lo)} – ${formatPrice(hi)}` };
  });
}
