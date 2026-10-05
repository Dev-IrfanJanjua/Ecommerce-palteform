/**
 * BRAND CONFIG — all brand text, commercial rules and navigation.
 *
 * No component may hard-code the store name, a currency symbol, a shipping
 * threshold or a nav label. Everything readable comes from here, so rebranding
 * is one file.
 *
 * NOTE: "Qadam" (Urdu: step / footstep) is a PLACEHOLDER brand name. It has not
 * been checked against trademark registries. Verify before commercial use.
 */

/** Money is stored as integer minor units (paisa) — never floats. */
const RS = (rupees: number) => rupees * 100;

export const brand = {
  name: "Qadam",
  tagline: "Every step forward",
  logoText: "QADAM",
  description:
    "Footwear built for the way you actually move — everyday sneakers, running shoes, boots and sandals.",

  /** ISO 4217 code. Drives every price on the site via formatPrice(). */
  currency: "PKR",
  /** BCP 47 locale. Controls digit grouping and currency placement. */
  locale: "en-PK",
  /** PKR retail prices are shown as whole rupees. */
  currencyFractionDigits: 0,

  /** Sizes are stored as EU numbers everywhere; this picks what is displayed. */
  sizeSystem: "EU" as const,

  shipping: {
    freeThresholdCents: RS(30_000),
    flatRateCents: RS(299),
    expressRateCents: RS(799),
    estimatedDays: "3–5 working days",
    expressEstimatedDays: "1–2 working days",
  },

  returns: {
    days: 14,
  },

  /** Rotating messages in the top announcement bar. */
  announcements: [
    "Free delivery on orders over Rs 30,000",
    "14-day easy returns",
    "Cash on delivery available nationwide",
  ],

  /**
   * Main navigation. `children` groups render as a desktop mega-menu and as
   * expandable groups in the mobile sheet. Add or remove entries here — the
   * header and mobile menu both read this list and need no edits.
   */
  nav: [
    {
      label: "Sneakers",
      href: "/collections/sneakers",
      children: [
        { label: "All sneakers", href: "/collections/sneakers" },
        { label: "Men", href: "/collections/sneakers?gender=men" },
        { label: "Women", href: "/collections/sneakers?gender=women" },
        { label: "New arrivals", href: "/collections/sneakers?isNew=true" },
      ],
    },
    {
      label: "Running",
      href: "/collections/running",
      children: [
        { label: "All running", href: "/collections/running" },
        { label: "Men", href: "/collections/running?gender=men" },
        { label: "Women", href: "/collections/running?gender=women" },
        { label: "On sale", href: "/collections/running?onSale=true" },
      ],
    },
    {
      label: "Boots",
      href: "/collections/boots",
      children: [
        { label: "All boots", href: "/collections/boots" },
        { label: "Men", href: "/collections/boots?gender=men" },
        { label: "Women", href: "/collections/boots?gender=women" },
      ],
    },
    {
      label: "Formal",
      href: "/collections/formal",
      children: [
        { label: "All formal", href: "/collections/formal" },
        { label: "Men", href: "/collections/formal?gender=men" },
        { label: "Women", href: "/collections/formal?gender=women" },
      ],
    },
    {
      label: "Sandals",
      href: "/collections/sandals",
      children: [
        { label: "All sandals", href: "/collections/sandals" },
        { label: "Men", href: "/collections/sandals?gender=men" },
        { label: "Women", href: "/collections/sandals?gender=women" },
      ],
    },
    {
      label: "Training",
      href: "/collections/training",
      children: [
        { label: "All training", href: "/collections/training" },
        { label: "Men", href: "/collections/training?gender=men" },
        { label: "Women", href: "/collections/training?gender=women" },
      ],
    },
    { label: "Sale", href: "/collections/all?onSale=true" },
  ],

  footer: {
    columns: [
      {
        title: "Shop",
        links: [
          { label: "All shoes", href: "/collections/all" },
          { label: "New arrivals", href: "/collections/all?isNew=true" },
          { label: "On sale", href: "/collections/all?onSale=true" },
          { label: "Bestsellers", href: "/collections/all?sort=best-selling" },
        ],
      },
      {
        title: "Help",
        links: [
          { label: "Size guide", href: "/size-guide" },
          { label: "Shipping", href: "/shipping" },
          { label: "Returns", href: "/returns" },
          { label: "Contact", href: "/contact" },
        ],
      },
      {
        title: "About",
        links: [
          { label: "Our story", href: "/about" },
          { label: "Stores", href: "/stores" },
          { label: "Careers", href: "/careers" },
        ],
      },
    ],
    legal: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
    ],
    social: [
      { label: "Instagram", href: "https://instagram.com" },
      { label: "Facebook", href: "https://facebook.com" },
      { label: "YouTube", href: "https://youtube.com" },
    ],
    /** Generic payment labels. Real brand marks need their own licensing. */
    paymentMethods: ["Visa", "Mastercard", "Easypaisa", "JazzCash", "Cash on delivery"],
  },

  /** Shown on the home page and in the footer. Numbers come from the rules
   *  above so the copy can never drift out of sync with checkout. */
  valueProps: [
    {
      icon: "truck" as const,
      title: "Free delivery",
      text: "On orders over Rs 30,000",
    },
    {
      icon: "rotate-ccw" as const,
      title: "14-day returns",
      text: "Unworn, in original packaging",
    },
    {
      icon: "shield-check" as const,
      title: "Secure checkout",
      text: "Your details stay protected",
    },
  ],
} as const;

export type Brand = typeof brand;
