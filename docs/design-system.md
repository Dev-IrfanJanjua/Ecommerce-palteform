# Design system

How the Qadam storefront is styled, and how to change it.

**The rule:** no component contains a colour, font name, size, radius, shadow or
currency symbol. Everything comes from three files. That is what makes a
rebrand a value change instead of a rewrite.

---

## The three files

| File | Holds | Change it to… |
| --- | --- | --- |
| `frontend/src/styles/tokens.css` | Every colour, size, radius, shadow, spacing, motion value | Restyle the whole site |
| `frontend/src/styles/fonts.ts` | The two font families | Change the typography |
| `frontend/src/config/brand.ts` | Name, tagline, currency, shipping rules, nav, footer | Rebrand or change commercial rules |

---

## Change-later cheat sheet

| I want to… | Edit | What to change |
| --- | --- | --- |
| Change the brand colour | `tokens.css` | `--primary` and `--primary-foreground` |
| Use a different palette | `tokens.css` | The hex values under `:root` |
| Change the fonts | `fonts.ts` | The two imports and the two function calls |
| Make headings UPPERCASE | `tokens.css` | `--heading-transform: uppercase` |
| Make corners sharp | `tokens.css` | `--radius: 0rem` and the `--radius-*` values |
| Make corners rounder | `tokens.css` | Raise `--radius` and the `--radius-*` values |
| Change the store name | `brand.ts` | `name`, `logoText`, `tagline` |
| Change currency | `brand.ts` | `currency`, `locale`, `currencyFractionDigits` |
| Change free-delivery threshold | `brand.ts` | `shipping.freeThresholdCents` |
| Change nav or footer links | `brand.ts` | `nav`, `footer` |
| Widen the page | `tokens.css` | `--container-max` |
| Add dark mode | `tokens.css` | Add a `.dark { }` block overriding the colours |

---

## Why Tailwind has no config file here

Tailwind **v4** replaced `tailwind.config.js` with a CSS `@theme` block.
Most tutorials online still show the old config file — it doesn't exist in this
project, and that's correct, not missing.

`tokens.css` has two blocks:

```css
:root {
  --primary: #1d3557;          /* the raw value */
}

@theme inline {
  --color-primary: var(--primary);  /* makes `bg-primary` exist */
}
```

`:root` holds the value. `@theme` is what turns it into a usable Tailwind class.
**A token needs both** — without the `@theme` line, `bg-primary` is not a class
and silently does nothing.

### One trap worth knowing

Tailwind owns certain variable prefixes: `--text-*`, `--radius-*`, `--shadow-*`,
`--ease-*`, `--spacing-*`, `--font-*`, `--color-*`.

Declaring `--text-body` in `:root` **and** mapping `--text-body: var(--text-body)`
in `@theme` creates a circular reference that breaks silently. So size, radius,
shadow and easing values are declared **once, directly inside `@theme`**.
Colours are safe to split across both blocks because the theme name
(`--color-primary`) differs from the raw name (`--primary`).

---

## Colour tokens

Named after their **job**, never their colour — `--primary`, not `--navy`.

### Core

`background` · `foreground` · `card` · `popover` · `primary` · `secondary` ·
`muted` · `accent` · `destructive` · `border` · `input` · `ring`

### Storefront

| Token | Used for |
| --- | --- |
| `surface` | Alternate section backgrounds |
| `sale` | Sale prices and sale badges |
| `success` / `warning` | "In stock" / "Only 2 left" |
| `badge-new` / `badge-bestseller` | Product badges |
| `announcement-bg` | Top announcement bar |
| `footer-bg` / `footer-foreground` / `footer-muted` | Footer |
| `rating` | Star colour |
| `hero-overlay` / `overlay` | Image scrims and drawer backdrop |

---

## Accessibility decisions baked into the tokens

Every colour pair was measured against WCAG AA. Two findings changed the design:

**1. The accent red cannot carry white text.**
White on `#e63946` is **4.17:1** — below the 4.5:1 minimum. So
`--accent-foreground` is near-black (`#140406`), which gives **4.80:1**.
Accent is for fills and borders; it is never used as text on the background,
where it only reaches 3.92:1.

**2. Input borders need their own, darker token.**
`--border` (`#d8e0ec`) is 1.25:1 against the background. That's fine for a
decorative divider, which has no minimum. But a form field's edge conveys
meaning, so it must clear **3:1**. `--input` is `#7d8caa` — **3.18:1**.

Full measured results:

| Pair | Ratio | Needs |
| --- | --- | --- |
| Body text on background | 17.60:1 | 4.5 |
| Muted text on background | 5.96:1 | 4.5 |
| Primary button label | 12.36:1 | 4.5 |
| Accent button label | 4.80:1 | 4.5 |
| Sale badge label | 5.67:1 | 4.5 |
| Sale price on card | 5.67:1 | 4.5 |
| "In stock" green | 6.08:1 | 4.5 |
| "Low stock" amber | 6.00:1 | 4.5 |
| Bestseller badge label | 8.12:1 | 4.5 |
| Footer text | 17.60:1 | 4.5 |
| Footer muted text | 7.95:1 | 4.5 |
| Input border | 3.18:1 | 3.0 |
| Focus ring | 11.62:1 | 3.0 |

**If you change the palette, re-check these.** A pretty colour that fails
contrast is a bug, not a style preference.

---

## Typography

Set in `fonts.ts` via `next/font/google`, which downloads the fonts at **build
time** and self-hosts them. No request to Google when a visitor loads the page,
and no layout shift as a webfont swaps in.

| | Font | Why |
| --- | --- | --- |
| Headings | Space Grotesk | Modern, slightly technical, sporty |
| Body | Inter | Designed for screens, legible at small sizes |

### Type scale

`text-display` · `text-h1` · `text-h2` · `text-h3` · `text-h4` ·
`text-body-lg` · `text-body` · `text-body-sm` · `text-body-xs`

`display`, `h1`, `h2` and `h3` are **fluid** — they use `clamp()` to grow with
the viewport, so headings shrink on phones with no media query.

### Heading feel

`--heading-weight` · `--heading-tracking` · `--heading-transform`

Headings read these automatically through a base style in `globals.css`.
Switching to an uppercase athletic look is one line.

---

## Money

**Prices are stored as integer minor units — paisa, not rupees.**

`Rs 24,990` is stored as `2499000`.

Floats cannot represent decimal money exactly (`0.1 + 0.2 !== 0.3` in
JavaScript), and that is not acceptable in a cart total. Integers are exact.

Every price renders through `formatPrice()` in `src/lib/format.ts`, which reads
the currency and locale from `brand.ts`. **No component writes a currency
symbol.** Switching to USD is one edit in `brand.ts`.

Also in `format.ts`: `discountPercent()`, `savingsMinor()`,
`freeShippingRemaining()`.

---

## Dark mode

Not built — see `docs/storefront-decisions.md`.

shadcn components ship `dark:` utilities, and the variant is declared in
`globals.css` so those classes still compile. They simply never activate,
because no `.dark` palette exists.

To add it later: add a `.dark { }` block to `tokens.css` overriding the colour
values, and a toggle that puts `class="dark"` on `<html>`. No component changes.

---

## The preview page

**http://localhost:3001/design-system**

Shows every colour, the type scale, buttons, form controls, badges, price
formatting, product cards (including the loading skeleton), radii, shadows and
the live brand config on one page.

Kept permanently — it's the fastest way to see the effect of a token change, and
it doubles as portfolio evidence.

---

## The theme switch test

The token system is only real if changing values restyles everything **without
touching a single component**. This was verified, not assumed:

1. Swapped the palette to Warm Earth, headings to uppercase, radius to `0rem`
2. Swapped both fonts to Playfair Display + DM Sans
3. Rebuilt — every surface, badge, button and heading changed
4. Confirmed **zero** component files needed editing
5. Reverted

Re-run this test after adding components. If it ever fails, a hard-coded value
has crept in.

### The guard

```bash
grep -rEn "#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(|(bg|text|border|ring|from|to|via)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]" frontend/src/components frontend/src/app | grep -v "^frontend/src/components/ui/"
```

Any match outside `components/ui/` (vendor shadcn files) is a bug.
The one allowed exception anywhere is a shoe's real colour in product data —
that's data, not theme.
