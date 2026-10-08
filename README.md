# Qadam — E-Commerce Platform

A production-style e-commerce storefront, built as a full software-engineering
lifecycle project: frontend, backend, database, auth, payments, caching,
background jobs, testing, security, Docker, CI/CD, deployment and monitoring.

**Status:** frontend complete (blueprint Step 1). Backend begins at Step 2.

- **[Project state](docs/PROJECT-STATE.md) — start here: where things stand, decisions, traps**
- [Requirements](REQUIREMENTS.md) — the full assignment brief
- [Learning roadmap](LEARNING-ROADMAP.md) — every tool explained, with docs
- [Storefront decisions](docs/storefront-decisions.md) — what was chosen and why
- [Design system](docs/design-system.md) — tokens, and how to restyle the site

---

## Run it

Requires **Node 18.18+** (built on 22.18).

```bash
npm install
npm run dev:all
```

Open **http://localhost:3000**.

> **Use `dev:all`, not `dev`.** Since the products API landed, the storefront
> fetches its data from the backend — `npm run dev` starts only the frontend,
> and every page then fails with "Could not reach the API". `dev:all` runs both
> and stops both together.

### If the app behaves strangely

Next's dev server survives a terminal being closed, so an old one can keep
serving pre-merge code on port 3000 — its devtools badge shows **(stale)**.
That produces errors which do not match the code you are reading. Clear it:

```bash
pkill -f next && npm run dev:clean
```

### Commands

All of these work from the repository root.

| Command                                      | What it does                                                |
| -------------------------------------------- | ----------------------------------------------------------- |
| `npm run dev:all`                            | **Start here** — frontend and API together                  |
| `npm run dev:clean`                          | Same, after deleting the Next.js cache                      |
| `npm run dev`                                | Frontend only (needs the API running separately)            |
| `npm run backend:dev`                        | API only                                                    |
| `npm run build`                              | Production build                                            |
| `npm start`                                  | Serve the production build (run `build` first)              |
| `npm run verify`                             | **Everything**: format, lint, types, catalog, build         |
| `npm run lint`                               | ESLint                                                      |
| `npm run typecheck`                          | TypeScript, no emit                                         |
| `npm run format`                             | Rewrite with Prettier                                       |
| `npm run validate:catalog`                   | 37 checks on the generated catalog                          |
| `npm --prefix frontend run audit:pages`      | Accessibility and markup audit (needs the dev server)       |
| `npm --prefix frontend run audit:responsive` | Layout-shift and mobile-width checks (needs the dev server) |
| `npm --prefix frontend run images:fetch`     | Refresh product photography from Unsplash                   |

Run `npm run verify` before every commit. A Husky pre-commit hook also formats
and lints staged files.

### Environment

Copy `frontend/.env.example` to `frontend/.env.local`. Nothing is required to
run the storefront; `UNSPLASH_ACCESS_KEY` is needed only to refresh product
photography.

**Never commit `.env.local`.** It is gitignored.

---

## Routes

| Route                 | What it is                                                       |
| --------------------- | ---------------------------------------------------------------- |
| `/`                   | Home — hero, collections, new arrivals, bestsellers              |
| `/collections/[slug]` | Collection grid with URL-synced filters (`all` shows everything) |
| `/products/[slug]`    | Product detail with colour, size and stock rules                 |
| `/checkout`           | Checkout form (UI only — no payment is taken)                    |
| `/checkout/success`   | Order confirmation                                               |
| `/design-system`      | Every design token on one page                                   |

---

## Architecture

```
frontend/src/
├── app/                 routes (App Router)
├── components/
│   ├── ui/              shadcn/ui primitives — do not hand-roll these
│   ├── layout/          header, footer, announcement bar, mobile menu
│   ├── home/ collection/ product/ cart/ checkout/
│   └── common/          Container, Section, Rating, EmptyState
├── config/brand.ts      name, currency, shipping rules, nav, footer
├── data/                catalog source + generator, size chart, photo data
├── features/            Redux slices (cart, ui)
├── lib/
│   ├── api/             THE DATA LAYER — see below
│   ├── format.ts        formatPrice and money helpers
│   └── checkout.ts      checkout schema and delivery pricing
├── store/               Redux store, typed hooks, persistence
├── styles/              tokens.css, fonts.ts
└── types/               shared types
```

### Four ideas worth knowing

**1. `lib/api/` is a seam, not a utility folder.**
Every function there is `async` and returns the exact shape the REST API will
return — including the `{ items, meta, facets }` envelope. Today the bodies read
a local catalog. When the Express backend exists, each body becomes a `fetch()`
and **no page changes**.

**2. Everything visual is a token.**
No component contains a colour, font, size, radius or currency symbol. Three
files control the whole look: `styles/tokens.css`, `styles/fonts.ts`,
`config/brand.ts`. This is verified, not assumed — see the theme-switch test in
[docs/design-system.md](docs/design-system.md).

**3. Server Components by default.**
Pages fetch on the server and arrive complete and indexable. `"use client"` is
added only for genuine interactivity — filters, cart, gallery, forms — and kept
at the leaves. The footer is a Server Component containing a client newsletter
form, which is the pattern to copy.

**4. Filters live in the URL, not in state.**
`?gender=men,women&size=42&onSale=1` is shareable, bookmarkable, survives a
refresh and works with the back button. React state does none of that.

### Money

Stored as **integer minor units (paisa)**, never floats — `Rs 24,990` is
`2499000`. Floating point cannot represent decimal money exactly, which is not
acceptable in a cart total. Every price renders through `formatPrice()`.

### The catalog is generated

36 products across 6 collections, expanded from a compact spec in
`data/catalog.source.ts` by `data/catalog.ts`. Generation is **seeded** — stock
levels and ratings are random-looking but identical on every run — because
non-deterministic data would differ between the server render and the browser,
and React would throw a hydration error.

`npm run validate:catalog` enforces 37 rules on the output, including a
cross-process determinism check.

---

## Known limitations

These are deliberate and recorded, not oversights.

| Limitation                                 | Detail                                                                                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Product photos do not match colourways** | Unsplash stock photography. A shoe listed as "Sand" may show a grey photo. Replace with real product photography before this is a real shop.              |
| **No payment processing**                  | Checkout validates and confirms, but takes no money. Stripe arrives at blueprint Step 8.                                                                  |
| **No accounts**                            | Guest checkout only. The account icon links nowhere until auth exists.                                                                                    |
| **The API is required**                    | The storefront no longer falls back to local data. `npm run build` also needs the API running, because product routes are prerendered from it.            |
| **Brand name is a placeholder**            | "Qadam" has not been checked against trademark registries.                                                                                                |
| **Stripe and Pakistan**                    | Stripe does not onboard merchants in Pakistan or settle PKR. Test mode works, so the project is unaffected; taking real money would need a local gateway. |

---

## Tech

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 ·
shadcn/ui · Redux Toolkit · React Hook Form · Zod · Prettier · ESLint ·
Husky + lint-staged

Tailwind 4 has **no `tailwind.config.js`** — design tokens live in CSS via
`@theme`. Most tutorials still show the old config file; its absence here is
correct.
