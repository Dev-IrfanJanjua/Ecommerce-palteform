# Design tokens

Contents: principles, files, color tokens, typography tokens, shape and layout tokens, motion, brand config, palette options, font options, change-later cheat sheet.

## Principles

- One source of truth per concern. To restyle the site the user edits `src/styles/tokens.css`, `src/styles/fonts.ts` or `src/config/brand.ts`, nothing else.
- Follow the variable naming convention of the shadcn/ui and Tailwind versions that the project actually installs (check the generated `globals.css` first). shadcn components rely on its names (`--background`, `--foreground`, `--primary`, `--border`, `--ring`, ...), so keep those and add the brand extras below. Do not build a second parallel theme system.
- Every extra token must be exposed to Tailwind (via `@theme` or the config, depending on the installed version) so that utilities like `bg-sale`, `text-announcement-foreground` or `font-heading` work.
- Define a light theme. Define a dark theme only if the user confirmed it.

## Files

| File | Contains |
| --- | --- |
| `src/styles/tokens.css` | All color, radius, spacing, shadow, motion, z-index and layout variables |
| `src/styles/fonts.ts` | `next/font` imports and the `--font-heading` and `--font-body` variables |
| `src/config/brand.ts` | Name, tagline, logo text or path, currency, locale, shipping rules, nav, footer, social, policy copy |
| `docs/design-system.md` | Human-readable list of every token with its purpose and how to change it |

## Color tokens (semantic, never named after the color)

Core (shadcn names): `background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `destructive`, `destructive-foreground`, `border`, `input`, `ring`.

Storefront extras:

| Token | Used for |
| --- | --- |
| `surface` / `surface-foreground` | Alternate section backgrounds (collection tiles, value props) |
| `sale` / `sale-foreground` | Sale price, sale badge |
| `success`, `warning` | Stock messages (in stock, low stock), form success |
| `badge-new`, `badge-bestseller` (+ foreground) | Product badges |
| `announcement-bg` / `announcement-foreground` | Top announcement bar |
| `hero-overlay` | Text-over-image gradient on the hero |
| `footer-bg` / `footer-foreground` / `footer-muted` | Footer |
| `overlay` | Drawer and modal backdrop |
| `rating` | Star color |

Every foreground token must meet WCAG AA contrast (4.5:1 for body text) against its background token. Check this when proposing palettes.

## Typography tokens

| Token | Purpose |
| --- | --- |
| `--font-heading`, `--font-body` | Font families (set in `fonts.ts` through `next/font`, referenced here) |
| `--heading-weight` | Heading weight (e.g. 700) |
| `--heading-tracking` | Heading letter-spacing (e.g. -0.02em or 0.04em for uppercase styles) |
| `--heading-transform` | `none` or `uppercase`, so a sporty uppercase look is a one-line change |
| `--body-weight`, `--body-line-height` | Body text feel |

Use a defined type scale for headings (display, h1, h2, h3, h4) and body (lg, base, sm, xs) as classes or components, with fluid sizes (`clamp()`) for display and h1.

## Shape, layout, motion tokens

| Group | Tokens |
| --- | --- |
| Radius | `--radius` (base), `--radius-button`, `--radius-card`, `--radius-image`, `--radius-input` |
| Layout | `--container-max`, `--gutter` (mobile and desktop), `--section-y` (mobile and desktop), `--header-height`, `--announcement-height` |
| Shadow | `--shadow-card`, `--shadow-drawer`, `--shadow-popover` |
| Motion | `--duration-fast`, `--duration-base`, `--duration-slow`, `--ease-standard` |
| Z-index | `--z-header`, `--z-drawer`, `--z-modal`, `--z-toast` |

## Brand config shape

```typescript
export const brand = {
  name: "",            // asked from the user
  tagline: "",
  logoText: "",        // or logo image path
  currency: "",        // ISO code, asked
  locale: "",          // e.g. "en-US", asked
  sizeSystem: "",      // "EU" | "US" | "both", asked
  shipping: { freeThresholdCents: 0, flatRateCents: 0, estimatedDays: "" },
  returns: { days: 0 },
  nav: [],             // { label, href, children? }
  footer: { columns: [], legal: [], social: [] },
  announcements: [],   // strings for the top bar
  valueProps: [],      // { icon, title, text }
} as const;
```

Fill values only from the user's answers; keep placeholders obviously fake until confirmed.

## Palette options to PROPOSE (never apply without the user choosing)

Present these as starting points with a short description. The user may also supply their own hex values.

| Role | A. Mono Sport | B. Warm Earth | C. Cool Ink |
| --- | --- | --- | --- |
| Mood | Bold, athletic, high contrast | Natural, premium, calm | Clean, modern, trustworthy |
| background | #FFFFFF | #FAF7F2 | #F6F8FB |
| foreground | #0A0A0A | #1F1B16 | #0B1220 |
| primary | #111111 | #2F4A3A | #1D3557 |
| primary-foreground | #FFFFFF | #FAF7F2 | #FFFFFF |
| accent | #FF4F00 | #C8643C | #E63946 |
| surface | #F4F4F4 | #EFE8DC | #E9EEF5 |
| muted-foreground | #5C5C5C | #6B6358 | #52607A |
| border | #E4E4E4 | #E2D9CA | #D8E0EC |
| sale | #D92D20 | #B4432A | #C81E3A |

Always run a contrast check on the chosen palette and report failures before building.

## Font pairing options to PROPOSE

| Option | Heading | Body | Feel |
| --- | --- | --- | --- |
| 1 | Space Grotesk | Inter | Modern sport, techy |
| 2 | Playfair Display | DM Sans | Premium, editorial |
| 3 | Barlow Condensed (uppercase) | Barlow | Athletic, bold |

Use Google Fonts via `next/font/google` (self-hosted at build time, no layout shift). Confirm the user is fine with Google Fonts, or uses local font files.

## Change-later cheat sheet (include in docs/design-system.md)

- New colors: edit values in `tokens.css`.
- New fonts: change the two imports in `fonts.ts`.
- New look for headings (uppercase, tighter): edit the `--heading-*` variables.
- Rounder or sharper UI: edit the `--radius-*` variables.
- Different currency, shipping rule or nav: edit `brand.ts`.
