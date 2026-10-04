---
description: Start building the shoe storefront frontend (design tokens, mock shoe catalog with variants, home, collection page, product page, cart drawer, checkout) after asking me to confirm every open decision
argument-hint: "[optional extra notes or constraints]"
---

You are starting the frontend of my shoe brand e-commerce project. I am a developer who knows HTML and CSS well but is still learning JavaScript, TypeScript, React and Next.js, so explain each new concept in one or two plain sentences the first time it appears, and tell me how to run and view what you build.

Extra notes from me for this run: $ARGUMENTS

## 0. Read first

1. Read the skills `shoe-storefront`, `ecommerce-platform` and `nextjs-storefront`, and all three files in `shoe-storefront/references/`. They define the rules, the token system, the catalog and the page specs. Follow them.
2. Inspect the repository before asking anything: does `frontend/` exist, what is in it, which Node version is installed, which package manager lockfile exists. Report what you found in two or three lines.

## 1. Rules for this whole session

- **Do not assume anything.** If something is missing, unclear or has more than one reasonable answer, stop and ask me. For cosmetic and reversible choices, propose a default and ask me to confirm it. Never silently pick brand names, colors, fonts, currency, copy policies, or features.
- Ask in one numbered batch (not one question at a time) so I can answer quickly, for example "1: A, 2: B, 3: custom". Mark your recommended option with "(recommended)" and give one line of reasoning for each.
- **Everything visual must be a variable** so I can change it later with small effort: colors, fonts, radius, spacing, shadows, motion, brand text, currency, shipping rules. Components must never contain hard-coded colors, font names, brand name or currency symbols. The skill explains the exact files.
- The backend is built separately and later. Use the typed mock catalog behind the async data layer described in the skill. Make no real API or payment calls.
- Build only the pages I listed: home, collection page with filters, product detail page, cart drawer, checkout. Do not add pages, features or libraries without asking me first.
- Work in small steps. After each phase run lint, type-check and build, run the hard-coded-style check from the skill, then summarize what changed and which URLs to open.

## 2. Questions to ask me before writing any code

Ask all of these in one message, with options where useful, and then wait for my answers.

**Brand**
1. Brand name, tagline, and three words describing the personality (for example bold, calm, premium).
2. Logo: text wordmark for now, or do I have a logo file?

**Look and feel**
3. Color palette: show me palettes A, B and C from `design-tokens.md` as a small table, tell me your recommendation for a shoe brand, and let me pick one or give my own hex values. Also report any contrast problems you find in the chosen palette.
4. Fonts: show the three pairings from `design-tokens.md`, recommend one, and ask whether Google Fonts is fine. Ask whether headings should be uppercase.
5. Corner style: sharp, slightly rounded, or very rounded.
6. Dark mode: include now or skip.

**Store settings**
7. Currency and locale (for example USD with en-US, or PKR with en-PK). Should prices show decimals?
8. Size system: EU only, US only, or both with a toggle. Confirm the size ranges in `catalog-spec.md`, and ask whether I want half sizes or a kids range (default is no).
9. Free shipping threshold, flat shipping rate, estimated delivery text and return window in days (these can be sample values, but I must confirm them).

**Catalog**
10. Confirm the 6 collections and the 36-product list in `catalog-spec.md`, or tell me what to change. Confirm that the gender values are men, women, unisex.
11. Product images: choose one of (a) generated placeholder images in my brand colors for now, (b) I will supply real photos into a folder you define, (c) a script that downloads free stock photos (tell me what that requires and any licensing or API key steps). Recommend one.

**Pages and behavior**
12. Collection page: numbered pages, load more, or infinite scroll, and how many products per page. Quick add on product cards: yes or no.
13. Header extras: search icon, wishlist heart, account icon, desktop mega-menu. Which are in for now (UI only) and which are skipped?
14. Home page: include fake testimonials (clearly marked as sample content) or skip that section?
15. Cart: persist in localStorage or not. Show tax lines or not.
16. Checkout: delivery options to show, whether to include a promo code box, and what "Place order" does (suggested: validate, then go to a success page with a fake order number and clear the cart). Should I build `/checkout/success`?

**Tooling and process**
17. Package manager (npm or pnpm), and use whatever Tailwind and shadcn/ui versions their current official setup installs? Tell me which versions that gives.
18. Git: commit automatically after each phase using conventional commit messages, or leave commits to me? Which branch name?
19. Should you stop and wait for my approval after each phase (recommended while I am learning), or run several phases in a row?

Anything else you find unclear while reading the skills, add to this list. Do not start coding until I answer.

## 3. After I answer

1. Write all my answers into `docs/storefront-decisions.md` (create it) as a clear list, and show me a short plan of the phases below with anything you still need.
2. Wait for me to say "go".

## 4. Phases (follow this order)

1. **Scaffold and tooling.** Create or update `frontend/` with Next.js (App Router, TypeScript strict, `src/` directory, `@/` import alias), Tailwind, shadcn/ui, ESLint, Prettier, Husky with lint-staged, `.env.example`, the folder structure from the skill. Add the shadcn components needed (button, input, label, checkbox, radio-group, slider, select, sheet, dialog, accordion, badge, skeleton, separator, form, sonner, tabs if needed), plus Redux Toolkit, React Hook Form, Zod, and the resolver package.
2. **Design system.** Create `tokens.css`, `fonts.ts`, `brand.ts` and `docs/design-system.md` from my answers, using the variable names in `design-tokens.md`. Build a temporary `/design-system` preview route showing all colors, type scale, buttons, inputs, badges, product card and radius so I can review it, and tell me to remove or keep it. Run the theme switch test (swap palette and fonts, confirm everything changes, revert).
3. **Layout shell.** Announcement bar, header (with cart count), mobile menu, footer, `Container` and `Section`.
4. **Catalog and data layer.** `catalog.source.ts`, `buildCatalog()`, the validation checklist as a test or script, and the async functions in `lib/api/`. Show me a summary table of what was generated (counts, sale, new, low stock, sold out).
5. **Home page.**
6. **Collection page** with working URL-synced filters, sorting, pagination, states.
7. **Product detail page** with gallery, color and size variants, stock rules, accordions, related products, SEO data.
8. **Cart** state and drawer.
9. **Checkout** page (UI only) and the success page if I confirmed it.
10. **Polish and QA.** Responsive check at 375, 768 and 1280 px, keyboard and accessibility pass, loading, empty and error states, Lighthouse-style sanity (no layout shift, image sizes), update README with run instructions and a short architecture note, final hard-coded-style check.

At the end of every phase give me: what you built, files created or changed, how to run and which routes to open, anything I should review or decide, and the next phase. Then follow my choice from question 19.

Start now with step 0 and the questions in step 2.
