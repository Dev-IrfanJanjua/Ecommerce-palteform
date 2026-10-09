# Project state

**Read this first** when picking the project up — after a break, in a new
session, or as someone new to it.

Last updated: 2026-10-08, after blueprint Step 4 (auth and RBAC).

---

## What this is

A production-style e-commerce platform built as a full software-engineering
lifecycle exercise, from an assignment brief in [REQUIREMENTS.md](../REQUIREMENTS.md).
The shop itself is the vehicle; the point is to practise everything a working
backend engineer does.

**Qadam** — a placeholder shoe brand. Prices in PKR.

- 113 TypeScript source files
- 17 merged pull requests, one per phase
- 180 automated checks across 5 suites

---

## Where things stand

| Step | What                             | Status                                                        |
| ---- | -------------------------------- | ------------------------------------------------------------- |
| 1    | Frontend and UI                  | **Done** — 10 phases, PRs #1–#11                              |
| 2    | REST API skeleton                | **Done** — PR #12                                             |
| 3    | MongoDB and Mongoose             | **Done** — PR #13, Atlas live and seeded                      |
| 4    | Auth and RBAC                    | **Done** — PR #17                                             |
| 5    | Products and categories          | **Done** — PR #14, storefront runs on MongoDB                 |
| 6    | Cart and wishlist                | **Done** — server-side cart, PR #19                           |
| 7    | Orders and inventory             | **Done** — checkout, stock guard, order history, PR #20       |
| 8    | Stripe payments and webhooks     | **Next**                                                      |
| 9    | Cloudinary and email             | Not started                                                   |
| 10   | Admin dashboard                  | Not started                                                   |
| 11   | Redis caching                    | Not started                                                   |
| 12   | Socket.IO notifications          | Not started                                                   |
| 13   | BullMQ background jobs           | Not started                                                   |
| 14   | Testing                          | Partial — bespoke suites exist, Jest/Vitest/Playwright do not |
| 15   | Docker                           | Not started                                                   |
| 16   | GitHub Actions CI/CD             | Not started                                                   |
| 17   | Deployment                       | Not started                                                   |
| 18   | Logging, monitoring, performance | Partial — Pino yes, Sentry no                                 |

Steps 4 and 5 were swapped deliberately: seeing real data flow end to end is
more motivating than building auth against nothing, and auth is easier to
reason about after writing one real module.

---

## Running it

```bash
npm install
npm run dev:all        # frontend AND api — not `npm run dev`
```

- Storefront: http://localhost:3000
- API: http://localhost:5000/api/v1

> **`npm run dev` starts only the frontend.** Since Step 5 the storefront
> fetches everything from the API, so running it alone makes every page fail
> with "The API is not running". `npm run build` needs the API too, because
> product routes are prerendered from it.

### Setup from scratch

1. **MongoDB Atlas** — free M0 cluster, a database user scoped to `readWrite`
   on the `qadam` database, and your IP on the Network Access list.
2. **`backend/.env`** (copy `backend/.env.example`):

   ```
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
   JWT_ACCESS_SECRET=<48 random bytes>
   JWT_REFRESH_SECRET=<a DIFFERENT 48 random bytes>
   ```

   Generate secrets with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

3. **`frontend/.env.local`**:

   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
   ```

4. **Verify and seed**:
   ```bash
   npm run backend:ping    # connection test; redacts the password
   npm run backend:seed    # 36 products, 6 collections; safe to re-run
   ```

Product photography needs `UNSPLASH_ACCESS_KEY` only if you re-run
`images:fetch`; the committed data works without it.

---

## Commands

| Command                     | What                                                             |
| --------------------------- | ---------------------------------------------------------------- |
| `npm run dev:all`           | Frontend + API together                                          |
| `npm run dev:clean`         | Same, after clearing the Next.js cache                           |
| `npm run verify`            | Everything: format, lint, types, catalog, builds, backend suites |
| `npm run backend:ping`      | Atlas connection test                                            |
| `npm run backend:seed`      | Seed the catalogue                                               |
| `npm run backend:api-test`  | 35 products-API checks (needs API + DB)                          |
| `npm run backend:auth-test` | 49 auth and RBAC checks (needs API + DB)                         |
| `npm run backend:cart-test` | 55 cart and wishlist checks (needs API + DB)                     |
| `npm run backend:order-test`| 52 checkout, concurrency and order checks (needs API + DB)       |
| `npm run backend:smoke`     | 36 HTTP skeleton checks                                          |
| `npm run backend:db-check`  | 22 model checks, no database needed                              |
| `npm run validate:catalog`  | 38 catalogue checks                                              |

`npm run verify` does **not** include `api-test` or `auth-test`, because those
need a live database. Run them separately before a PR that touches the API.

---

## Architecture

```
frontend/ (Next.js 16, React 19, Tailwind 4)
  app/              routes
  components/       ui/ layout/ home/ collection/ product/ cart/ checkout/
  config/brand.ts   name, currency, shipping rules, nav
  data/             catalogue generator (still the seed's source of truth)
  features/         Redux slices (cart, ui)
  lib/api/          THE SEAM — calls the REST API
  styles/           tokens.css, fonts.ts

backend/ (Express 5, TypeScript 7, Mongoose 9)
  src/
    modules/        auth/ users/ products/ collections/ cart/ wishlist/ health/
    common/         errors/ middleware/ utils/ logger
    config/         env (Zod-validated), db
    app.ts          builds the app — importable by tests, binds no port
    server.ts       owns the port, connects the DB, graceful shutdown
  scripts/          seed, ping, and the test suites
```

### Five ideas that explain most of the code

**1. `lib/api/` is a seam, not a utility folder.** Every function is `async`
and returns the API's exact envelope. When the backend arrived at Step 5, only
those bodies changed — no page was touched.

**2. Everything visual is a token.** No component holds a colour, font, size,
radius or currency symbol. Three files control the whole look:
`styles/tokens.css`, `styles/fonts.ts`, `config/brand.ts`. Proven by the
theme-switch test in [design-system.md](design-system.md).

**3. Server Components by default.** `"use client"` only for real
interactivity, kept at the leaves. The footer is a Server Component containing
a client newsletter form — that is the pattern to copy.

**4. Filters live in the URL.** `?gender=men,women&size=42&onSale=1` is
shareable, bookmarkable and back-button-correct. React state is none of those.

**5. `app.ts` never listens.** That split is what makes the API testable
in-process, with no port and no teardown race.

### Money

Integer **minor units (paisa)** everywhere — `Rs 24,990` is `2499000`. Floats
cannot represent decimal money exactly, which is unacceptable in a cart total.
Every price renders through `formatPrice()`.

---

## Decisions that are not obvious from the code

These are the things a summary would lose.

| Decision                                                 | Why                                                                                                                                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Free shipping over **Rs 30,000**, not Rs 3,000           | The cheapest shoe is ~Rs 11,000. A low threshold would make shipping always free and the free-shipping progress bar would never show progress.                                 |
| Accent red is never used for text                        | White on `#E63946` is 4.17:1 and fails WCAG AA. `--accent-foreground` is near-black (4.80:1). Accent is for fills only.                                                        |
| `--input` is a separate, darker token than `--border`    | A divider has no contrast minimum; a form field's edge carries meaning and must clear 3:1.                                                                                     |
| Stored as `collectionSlug` / `isNewArrival`              | `collection` and `isNew` are **reserved Mongoose names**. Mapped back in `toJSON`, so the API contract is unchanged.                                                           |
| The two JWT secrets must differ                          | Sharing one makes a stolen 15-minute access token usable as a 7-day refresh token. Enforced at boot.                                                                           |
| Login hashes even for an unknown email                   | Returning early makes "no such user" measurably faster — response time alone becomes an enumeration oracle.                                                                    |
| `dynamicParams = false` on product and collection routes | These routes are dynamic, so a `notFound()` after streaming begins can change the body but not the 200 status. Rejecting unknown slugs at the router is what gives a real 404. |
| Order numbers are random, not sequential                 | A sequential number leaks order volume and invites probing for other people's orders.                                                                                          |
| Catalogue generation is seeded, never `Math.random()`    | Non-deterministic data differs between the server render and the browser, and React throws a hydration error.                                                                  |
| No fake testimonials, no tax line, no promo box          | Fabricating reviews is a bad habit; inventing a GST number is worse; a dead input is user-hostile.                                                                             |
| Models register idempotently                             | An `@/` alias and a relative path are **different module instances**, so `model()` ran twice. Same root cause as an `instanceof AppError` failure in Step 2.                   |

---

## Known limitations

Deliberate and recorded, not oversights.

| Limitation                         | Detail                                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Photos do not match colourways** | Unsplash stock photography. A shoe listed as "Sand" may show a grey photo. Attribution is a **licence obligation** — do not remove it.      |
| **No payment processing**          | Checkout validates and confirms but takes no money.                                                                                         |
| **Stripe and Pakistan**            | Stripe does not onboard Pakistani merchants or settle PKR. Test mode works, so Step 8 is unaffected; real money would need a local gateway. |
| **Cart is browser-only**           | The API cart is live and tested, but the frontend still uses Redux + localStorage and does not call it. Wiring it up needs a frontend auth flow — the largest open gap. |
| **No email sending**               | Verification and reset tokens are logged in development only.                                                                               |
| **Brand name unverified**          | "Qadam" has not been checked against trademark registries.                                                                                  |
| **Transactions mask weak guards**  | Measured, not assumed: inside `session.withTransaction` even a naive read-then-write avoids overselling, because MongoDB raises a write conflict and withTransaction retries the body. The atomic `$gte` filter is still required — without a transaction the naive version oversells. `order-test.mts` tests the guard directly, with no session, so it can actually fail. |
| **No real test framework**         | The suites are bespoke scripts. Jest, Supertest, Vitest and Playwright arrive at Step 14.                                                   |

---

## Traps worth remembering

Each cost real debugging time.

- **A stale `next dev` survives its terminal.** It serves pre-merge code on
  port 3000 and the devtools badge reads `(stale)`. Symptoms look like
  impossible React errors. Fix: `pkill -f next && npm run dev:clean`.
- **Express 5 made `req.query` getter-only.** The common
  `Object.assign(req, validated)` pattern throws. Validated input goes to
  `req.validated`.
- **`$text` cannot be used inside a `$facet` sub-pipeline.** Search is hoisted
  to the front of the aggregation.
- **`tsc` does not rewrite path aliases.** `tsc-alias` runs after the build or
  `npm start` dies on `require("@/app")`.
- **`MONGODB_URI=` in a `.env` file is an empty string, not undefined.**
- **ESM hoists imports**, so setting `process.env` in a script body happens
  _after_ config has already been parsed.
- **Browsers default `<button>` to `cursor: default`**, and current shadcn/ui
  no longer adds `cursor-pointer`.
- **Atlas drops you when your IP changes.** Moving between networks breaks the
  connection with a whitelist error. `npm run backend:ping` names the cause;
  the fix is Atlas > Network Access > Add IP Address.

---

## Working agreement

- One feature branch per phase, one PR into `main`, conventional commits.
- Commit messages explain **why**, not just what — they are the project's
  real memory. `git log` is the first place to look.
- Stop for review after each phase.
- `npm run verify` before every PR.
- Never commit `.env`. Secrets go in `.env` / `.env.local`, both gitignored.

---

## Picking up next

**Step 8 — Stripe payments and webhooks.** Orders are created as `pending` and
move to `paid` only when Stripe says so, via a signed webhook — never from the
browser, which can lie. Stripe test mode works from Pakistan; real settlement
does not (see Known limitations).

Before that, the biggest open gap is the frontend: the cart and order APIs are
finished and tested, but nothing in the UI calls them, because there is no
frontend sign-in flow yet. That is worth doing before payments.

To get oriented quickly:

```bash
git log --oneline -20
cat docs/PROJECT-STATE.md
npm run dev:all
```
