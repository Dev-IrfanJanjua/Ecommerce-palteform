# Storefront decisions

Confirmed decisions for the shoe storefront frontend (blueprint Step 1).

**Status:** Irfan delegated these to Claude's recommended defaults on 2026-10-05
("use brand name and other requirements placeholder by your understanding").
Everything here is a **placeholder chosen to be changed** — each row names the
single file you edit to change it.

---

## 0. Scope and approach

**Frontend first, on a typed mock catalog behind an async data layer.**
The store behaves fully dynamically — filters, variants, stock, cart all run off
data, nothing is hardcoded HTML. The data layer in `src/lib/api/` returns the same
shape the real REST API will return, so swapping to the live backend later changes
one folder, not every page.

Backend (Express + MongoDB) is built separately, starting at blueprint Step 2.

---

## 1. Brand

| Setting | Value | Change in |
| --- | --- | --- |
| Name | **Qadam** | `src/config/brand.ts` |
| Tagline | Every step forward | `src/config/brand.ts` |
| Personality | Bold · modern · grounded | — |
| Logo | Text wordmark (no image file) | `src/config/brand.ts` |

> ⚠️ **"Qadam"** (Urdu: *step / footstep*) is a placeholder picked to suit a
> Pakistani shoe brand. It has **not** been checked against trademark registries.
> Verify availability before any real commercial use.

---

## 2. Look and feel

| Setting | Value | Change in |
| --- | --- | --- |
| Palette | **C. Cool Ink** — navy primary, reads clean and trustworthy | `src/styles/tokens.css` |
| Heading font | Space Grotesk | `src/styles/fonts.ts` |
| Body font | Inter | `src/styles/fonts.ts` |
| Font source | Google Fonts via `next/font/google` (self-hosted at build, no layout shift) | `src/styles/fonts.ts` |
| Uppercase headings | No | `--heading-transform` in `tokens.css` |
| Corner style | Slightly rounded | `--radius-*` in `tokens.css` |
| Dark mode | **Skipped** for now | — |

### Accessibility fixes baked into the tokens

Measured WCAG contrast on palette C and found two problems. Both are handled:

1. **Accent `#E63946` fails as text** (3.92:1) and **fails with white text on it**
   (4.17:1). → Accent is used for fills and borders only. `--accent-foreground`
   is near-black (5.04:1 PASS), never white.
2. **Border `#D8E0EC` is 1.25:1** against the background — fine for decorative
   dividers, but **fails the 3:1 minimum for input borders**. → `--input` is a
   separate, darker token than `--border`.

---

## 3. Store settings

| Setting | Value | Change in |
| --- | --- | --- |
| Currency | **PKR** | `src/config/brand.ts` |
| Locale | `en-PK` | `src/config/brand.ts` |
| Decimals shown | **None** — `Rs 24,990`, not `Rs 24,990.00` | `src/lib/format.ts` |
| Internal storage | Integer **paisa** (minor units), matching the backend money rule | — |
| Size system | **EU only** — men 40–46, women 36–41, unisex 38–45 | `src/config/brand.ts` |
| Half sizes / kids | No | — |

### Shipping and returns

| Setting | Value |
| --- | --- |
| Free shipping over | **Rs 30,000** |
| Flat rate | **Rs 299** |
| Express | **Rs 799** |
| Delivery estimate | 3–5 working days (express 1–2) |
| Returns window | 14 days |

> The free-shipping threshold is deliberately **Rs 30,000**, not a typical
> Rs 3,000. The cheapest shoe is ~Rs 11,000, so a low threshold would make
> shipping always free and the free-shipping progress bar would never show
> progress. Rs 30,000 keeps that UI meaningful.

---

## 4. Catalog

6 collections, 36 products exactly as listed in
`.claude/skills/shoe-storefront/references/catalog-spec.md`.
Genders: `men` | `women` | `unisex`.

### PKR price ladder

The spec's prices are USD placeholders. Converted at roughly **×280** and rounded
to natural PKR retail endings. The multiplier lives in **one constant** in
`src/data/catalog.source.ts`, so re-pricing the whole catalog is a single edit.

| USD | PKR | USD | PKR | USD | PKR |
| --- | --- | --- | --- | --- | --- |
| 39 | 10,990 | 99 | 27,990 | 149 | 41,990 |
| 45 | 12,490 | 105 | 29,490 | 159 | 44,990 |
| 49 | 13,990 | 109 | 30,490 | 169 | 47,490 |
| 59 | 16,490 | 115 | 31,990 | 179 | 49,990 |
| 69 | 19,490 | 119 | 33,490 | 189 | 52,990 |
| 79 | 21,990 | 129 | 35,990 | | |
| 89 | 24,990 | 139 | 38,990 | | |

Sale items: `compareAtCents` is the ladder price, `priceCents` is ~20% lower,
rounded to the same natural endings.

### Images

**Generated SVG placeholders** in the brand colors. No licensing concerns, no API
keys, deterministic, and they look intentional rather than broken.
Path convention stays `/images/products/{slug}/{colorSlug}-{1..4}.webp` so
dropping in real photos later needs no code change.

---

## 5. Pages and behavior

| Setting | Value |
| --- | --- |
| Collection paging | Numbered pages, **12 per page** (shareable URLs, SEO-friendly) |
| Quick add on cards | **No** — shoes need a size chosen first |
| Header: account icon | **In** (UI only, links nowhere until auth exists) |
| Header: desktop mega-menu | **In** |
| Header: search | **Skipped** — out of scope, would be a dead button |
| Header: wishlist | **Skipped** — same reason |
| Home testimonials | **Skipped** — no fabricated reviews |
| Cart persistence | **localStorage**, wrapped in try/catch, validated with Zod, never read during SSR |
| Tax line | **No** — not inventing a GST number |
| Promo code box | **No** — would be a dead input |
| Place order | Validates → `/checkout/success` with a fake order number → clears cart |
| `/checkout/success` | **Build it** |
| Announcement bar | Dismissible, remembered in localStorage; placeholder copy in `brand.ts` |
| `/design-system` route | **Keep permanently** — useful reference and portfolio evidence |

---

## 6. Tooling and process

| Setting | Value |
| --- | --- |
| Package manager | **npm** (Node v22.18.0, npm 10.9.3) |
| Tailwind / shadcn versions | Whatever the current official installers give — exact versions reported after scaffolding |
| Default branch | **`main`** |
| Branching | One feature branch per phase, PR into `main` |
| Commits | Conventional commits, committed after each phase |
| Pace | **Stop for approval after each phase** |

---

## Out of scope for this phase

Authentication, account pages, wishlist page, search results, reviews list,
order history, admin, real payments, real API calls, blog, store locator,
kids range. Add to this file before building any of them.

---

## Open item for later

**Stripe does not onboard merchants in Pakistan and does not settle PKR.**
Stripe **test mode** works fine, so blueprint Step 8 is unaffected and the
portfolio value stands. Taking real money would need a local gateway.
Decision deferred to Step 8.
