"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { clearFilters, setParam, SORT_OPTIONS, toggleListParam } from "@/lib/collection-params";
import { formatPrice } from "@/lib/format";
import type { ProductFacets } from "@/types/catalog";
import { FilterPanel } from "./filter-panel";

/**
 * Sort control, active-filter chips, and the mobile filter sheet.
 *
 * All three read and write the same URL params as FilterPanel, so the desktop
 * sidebar and the mobile sheet can never disagree about what is selected.
 */
export function CollectionToolbar({
  facets,
  total,
  showCollection = false,
}: {
  facets: ProductFacets;
  total: number;
  showCollection?: boolean;
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

  const chips = buildChips(params, facets);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-body-sm" aria-live="polite">
          {total} {total === 1 ? "product" : "products"}
        </p>

        <div className="flex items-center gap-2">
          {/* Mobile: filters live in a sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                Filter
                {chips.length ? ` (${chips.length})` : ""}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-[90vw] max-w-sm flex-col p-0">
              <SheetHeader className="border-border border-b">
                <SheetTitle className="text-h4 text-left">Filter</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <FilterPanel facets={facets} showCollection={showCollection} />
              </div>
              <div className="border-border border-t p-4">
                <p className="text-muted-foreground text-body-sm">{total} products match</p>
              </div>
            </SheetContent>
          </Sheet>

          <Select
            value={params.get("sort") ?? "featured"}
            onValueChange={(value) => apply(setParam(params, "sort", value))}
          >
            <SelectTrigger size="sm" className="w-44" aria-label="Sort products">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {chips.length ? (
        <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((chip) => (
            <li key={`${chip.key}-${chip.value}`}>
              <button
                type="button"
                disabled={isPending}
                onClick={() => apply(chip.remove(params))}
                className="border-border hover:bg-muted focus-visible:ring-ring rounded-button text-body-xs inline-flex items-center gap-1.5 border px-2.5 py-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {chip.label}
                <X className="size-3" aria-hidden="true" />
                <span className="sr-only">Remove filter</span>
              </button>
            </li>
          ))}
          <li>
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => apply(clearFilters(params))}
            >
              Clear all
            </Button>
          </li>
        </ul>
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */

interface Chip {
  key: string;
  value: string;
  label: string;
  remove: (params: URLSearchParams) => URLSearchParams;
}

/** Turns the current URL params into removable chips. */
function buildChips(params: URLSearchParams, facets: ProductFacets): Chip[] {
  const chips: Chip[] = [];

  const listGroups: { key: string; buckets: { value: string; label: string }[] }[] = [
    { key: "collection", buckets: facets.collection },
    { key: "gender", buckets: facets.gender },
    { key: "size", buckets: facets.size },
    { key: "color", buckets: facets.color },
  ];

  for (const group of listGroups) {
    for (const value of (params.get(group.key) ?? "").split(",").filter(Boolean)) {
      const label = group.buckets.find((b) => b.value === value)?.label ?? value;
      chips.push({
        key: group.key,
        value,
        label,
        remove: (p) => toggleListParam(p, group.key, value),
      });
    }
  }

  const flags: { key: string; label: string }[] = [
    { key: "inStock", label: "In stock" },
    { key: "onSale", label: "On sale" },
    { key: "isNew", label: "New" },
  ];
  for (const f of flags) {
    if (params.get(f.key)) {
      chips.push({
        key: f.key,
        value: "1",
        label: f.label,
        remove: (p) => setParam(p, f.key, undefined),
      });
    }
  }

  const min = params.get("minPrice");
  const max = params.get("maxPrice");
  if (min || max) {
    chips.push({
      key: "price",
      value: `${min}-${max}`,
      label: `${min ? formatPrice(Number(min)) : "Any"} – ${max ? formatPrice(Number(max)) : "Any"}`,
      remove: (p) => setParam(setParam(p, "minPrice", undefined), "maxPrice", undefined),
    });
  }

  return chips;
}
