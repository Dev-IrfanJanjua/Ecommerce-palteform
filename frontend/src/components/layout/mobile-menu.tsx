"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { brand } from "@/config/brand";

/**
 * Mobile navigation — a slide-in sheet.
 *
 * Uses the shadcn Sheet, which is built on Radix Dialog, so focus trapping,
 * Escape-to-close and scroll locking are handled correctly rather than
 * hand-rolled.
 *
 * Nav entries come from brand.nav. Groups with `children` become expandable
 * accordions; entries without them are plain links.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[88vw] max-w-sm p-0">
        <SheetHeader className="border-border border-b">
          <SheetTitle className="font-heading text-h4 text-left">{brand.logoText}</SheetTitle>
        </SheetHeader>

        <nav className="overflow-y-auto px-4 pb-8" aria-label="Main">
          <Accordion type="multiple">
            {brand.nav.map((item) =>
              "children" in item && item.children ? (
                <AccordionItem key={item.label} value={item.label}>
                  <AccordionTrigger className="text-body">{item.label}</AccordionTrigger>
                  <AccordionContent>
                    <ul className="flex flex-col">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            onClick={() => setOpen(false)}
                            className="text-muted-foreground hover:text-foreground text-body-sm block py-2"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="border-border text-body flex border-b py-4 font-medium"
                >
                  {item.label}
                </Link>
              ),
            )}
          </Accordion>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
