---
name: shoe-storefront
description: Rules and specs for building the shoe brand storefront frontend (Next.js) with a variable-driven design system, a typed mock catalog with color and size variants, and these pages - home, collection page with filters, product detail, cart drawer, checkout. Use this skill whenever the user works on storefront UI, theme colors, fonts, design tokens, brand config, layout, header, footer, home sections, product cards, filters, size or color selectors, cart drawer, checkout form, mock products or seed data for shoes, even if they do not say "design system". Always read it before touching styles or product data so colors, fonts and copy stay changeable from one place.
---

# Shoe storefront

The backend is built separately and later. Until then the frontend runs on a typed mock catalog behind an async data layer, so swapping in the real API changes one folder, not every page.

## Non-negotiable rules

1. **Ask, never assume.** If something is not specified here or in the user's answers, stop and ask. When a choice is cosmetic and reversible, propose a default and ask for confirmation instead of silently picking it. Use a numbered list so the user can answer quickly.
2. **Everything visual is a variable.** Colors, fonts, radius, spacing, shadows, motion, and brand text each live in exactly one place (see `references/design-tokens.md`). Components use token-based utilities only.
   - Forbidden in components: hex, rgb, hsl values, arbitrary color values (`bg-[#111]`), raw palette utilities (`bg-gray-100`, `text-red-500`), hard-coded font names, hard-coded brand name or currency symbols.
   - Allowed exception: swatch hex values inside product data (a shoe's real color is data, not theme).
3. **Brand content comes from config.** Name, tagline, nav links, footer links, currency, locale, shipping threshold, policies and social links come from `src/config/brand.ts`.
4. **Money is integer cents**, formatted by one `formatPrice()` helper using the brand locale and currency.
5. **Data shape matches the future backend.** Use the `Product` type in `references/catalog-spec.md`; list endpoints return `{ items, meta: { page, limit, total, totalPages } }` like the API will.
6. **Server Components by default**; add `"use client"` only for interactivity (filters, variant selection, cart, drawer, forms).
7. **Mobile first**, tested at 375, 768 and 1280 px. Every data-driven view has loading, empty and error states.
8. **Accessible by default**: semantic elements, labelled inputs, visible focus, alt text, keyboard-operable drawer and filters, `prefers-reduced-motion` respected.
9. **Scope control.** Build only the pages in `references/pages-spec.md`. Do not add pages, features or libraries not listed without asking.

## Where things live

```
frontend/src/
├── app/                 routes (see pages-spec)
├── components/
│   ├── ui/              shadcn primitives (do not hand-roll these)
│   ├── layout/          AnnouncementBar, Header, MobileMenu, Footer
│   ├── home/            hero, collection tiles, product rails, value props, newsletter
│   ├── collection/      FilterPanel, FilterChips, SortSelect, ProductGrid, Pagination
│   ├── product/         ProductCard, Gallery, ColorSwatches, SizeSelector, PriceTag, Badges
│   ├── cart/            CartDrawer, CartLineItem, FreeShippingBar
│   ├── checkout/        CheckoutForm, OrderSummary
│   └── common/          Container, Section, SectionHeading, Price, Rating, EmptyState, ErrorState
├── config/brand.ts      brand, currency, nav, footer, shipping rules
├── data/                catalog.source.ts (compact spec) and catalog.ts (expanded)
├── lib/                 api/ (data layer), format.ts, utils.ts
├── features/cart/       Redux slice, selectors, hooks
├── store/               store setup, providers
├── styles/              tokens.css, fonts.ts
└── types/
```

## Workflow for any task in this area

1. Re-read the relevant reference file (tokens, catalog, or pages).
2. Check whether the user's confirmed decisions are recorded in `docs/storefront-decisions.md`. If a needed decision is missing, ask and then record the answer there.
3. Implement, using existing components before creating new ones.
4. Run lint, type-check and build. Run the hard-coded-style check:

```bash
grep -rEn "#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(|(bg|text|border|ring|from|to|via)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]" frontend/src/components frontend/src/app
```

Any match is a bug unless it is product swatch data.

5. Report what changed, which routes to open to see it, and anything still needing a decision.

## Theme switch test

The design system passes only if changing values in `tokens.css` and `fonts.ts` restyles the whole site with no component edits. When finishing the tokens phase, prove it: swap to another palette and font pair, confirm every page changes, then revert.

## References

- `references/design-tokens.md` for variable names, file layout, palette and font options
- `references/catalog-spec.md` for the Product type, variant rules and the full 36-product list
- `references/pages-spec.md` for sections, behavior and states of each page
