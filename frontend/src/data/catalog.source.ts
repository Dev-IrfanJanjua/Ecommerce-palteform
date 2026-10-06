import type { Gender } from "@/types/catalog";

/**
 * CATALOG SOURCE — the compact, hand-maintained spec.
 *
 * One short entry per product. `buildCatalog()` in catalog.ts expands these
 * into full Product objects with variants, SKUs, stock, copy and dates.
 *
 * This file is the thing a human edits. It is also the file that later becomes
 * the MongoDB seed script, which is why it stays data-only.
 *
 * Product names are original. Do not use real brand or trademarked model names.
 */

/* -------------------------------------------------------------------------- */
/* Pricing                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The catalog spec quotes USD placeholders. This ladder maps each one to a
 * natural PKR retail price (roughly x280, rounded to a believable ending).
 *
 * To re-price the whole store, edit this one table.
 */
export const PKR_PRICE_LADDER: Record<number, number> = {
  39: 10_990,
  45: 12_490,
  49: 13_990,
  59: 16_490,
  69: 19_490,
  79: 21_990,
  89: 24_990,
  99: 27_990,
  105: 29_490,
  109: 30_490,
  115: 31_990,
  119: 33_490,
  129: 35_990,
  139: 38_990,
  149: 41_990,
  159: 44_990,
  169: 47_490,
  179: 49_990,
  189: 52_990,
};

/** Sale products are discounted by roughly this much before rounding. */
export const SALE_DISCOUNT = 0.2;

/* -------------------------------------------------------------------------- */
/* Sizes                                                                       */
/* -------------------------------------------------------------------------- */

/** EU sizes offered per gender. Stock is tracked per size, per colour. */
export const SIZES_BY_GENDER: Record<Gender, string[]> = {
  men: ["40", "41", "42", "43", "44", "45", "46"],
  women: ["36", "37", "38", "39", "40", "41"],
  unisex: ["38", "39", "40", "41", "42", "43", "44", "45"],
};

/* -------------------------------------------------------------------------- */
/* Collections                                                                 */
/* -------------------------------------------------------------------------- */

export const COLLECTION_SOURCE = [
  {
    slug: "sneakers",
    name: "Sneakers",
    description: "Everyday silhouettes that go with everything.",
    sortOrder: 1,
  },
  {
    slug: "running",
    name: "Running",
    description: "Cushioned, breathable shoes for road and trail.",
    sortOrder: 2,
  },
  {
    slug: "boots",
    name: "Boots",
    description: "Built for weather, worn all season.",
    sortOrder: 3,
  },
  {
    slug: "formal",
    name: "Formal and Loafers",
    description: "Clean lines for work and occasions.",
    sortOrder: 4,
  },
  {
    slug: "sandals",
    name: "Sandals and Slides",
    description: "Easy-on comfort for warm days.",
    sortOrder: 5,
  },
  {
    slug: "training",
    name: "Training",
    description: "Stable, grippy shoes for the gym floor.",
    sortOrder: 6,
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Per-collection copy                                                         */
/* -------------------------------------------------------------------------- */

export const COLLECTION_COPY: Record<
  string,
  { material: string; care: string; features: string[]; blurb: string }
> = {
  sneakers: {
    material: "Leather and textile upper, rubber cupsole",
    care: "Wipe with a damp cloth. Air dry away from direct heat.",
    features: [
      "Padded collar and tongue for all-day comfort",
      "Cushioned footbed with arch support",
      "Durable rubber cupsole with grip pattern",
      "Reinforced eyelets",
      "Lightly textured finish that resists scuffs",
    ],
    blurb: "an everyday silhouette that works with denim, shorts or shalwar kameez",
  },
  running: {
    material: "Engineered mesh upper, EVA foam midsole, rubber outsole",
    care: "Remove the insole and hand wash. Never machine dry.",
    features: [
      "Responsive EVA foam midsole",
      "Breathable engineered mesh upper",
      "Heel counter for a locked-in fit",
      "Rubber outsole with directional tread",
      "Reflective detailing for low light",
    ],
    blurb: "a light, cushioned ride for daily kilometres",
  },
  boots: {
    material: "Full-grain leather and suede, rubber lug sole",
    care: "Brush off dirt, condition the leather, dry at room temperature.",
    features: [
      "Water-resistant full-grain leather",
      "Rubber lug sole for wet-weather grip",
      "Padded ankle collar",
      "Goodyear-style welt construction",
      "Shock-absorbing insole",
    ],
    blurb: "a hard-wearing boot for cold mornings and rough ground",
  },
  formal: {
    material: "Polished calf leather, leather lining, stacked heel",
    care: "Use shoe trees. Polish regularly and rotate between wears.",
    features: [
      "Full leather lining",
      "Cushioned leather insole",
      "Stacked heel with rubber top piece",
      "Hand-finished burnished toe",
      "Slim, modern last",
    ],
    blurb: "a clean, formal shape for the office and occasions",
  },
  sandals: {
    material: "Contoured footbed, synthetic strap, rubber outsole",
    care: "Rinse with fresh water and air dry out of direct sunlight.",
    features: [
      "Contoured footbed that moulds to the foot",
      "Quick-drying straps",
      "Grippy rubber outsole",
      "Lightweight, under 300 g per shoe",
      "Easy on and off",
    ],
    blurb: "easy-on comfort for warm days and short trips",
  },
  training: {
    material: "Breathable knit upper, dense foam midsole, flat rubber outsole",
    care: "Wipe after each session. Air out between workouts.",
    features: [
      "Flat, stable base for lifting",
      "Dense foam midsole that resists compression",
      "Wide toe box for splay",
      "Grippy flat outsole",
      "Secure midfoot strap-free lockdown",
    ],
    blurb: "a stable, grippy base for lifting and gym work",
  },
};

/* -------------------------------------------------------------------------- */
/* Products                                                                    */
/* -------------------------------------------------------------------------- */

export type ProductFlag = "S" | "N" | "B" | "F";

export interface ProductSource {
  name: string;
  collection: string;
  gender: Gender;
  /** USD placeholder; converted through PKR_PRICE_LADDER. */
  usd: number;
  colors: { name: string; hex: string }[];
  flags: ProductFlag[];
  /** Overrides the default seeded stock distribution. */
  stockRule?: "all-low" | "one-colour-sold-out" | "edge-sizes-sold-out" | "sold-out";
}

export const PRODUCT_SOURCE: ProductSource[] = [
  // --- Sneakers ------------------------------------------------------------
  {
    name: "Court Classic Low",
    collection: "sneakers",
    gender: "unisex",
    usd: 89,
    colors: [
      { name: "Off White", hex: "#F2EFE9" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Navy", hex: "#22314B" },
      { name: "Sand", hex: "#D9C7A7" },
    ],
    flags: ["B", "F"],
  },
  {
    name: "Court Classic High",
    collection: "sneakers",
    gender: "unisex",
    usd: 99,
    colors: [
      { name: "Off White", hex: "#F2EFE9" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Forest", hex: "#2E4635" },
    ],
    flags: [],
  },
  {
    name: "Metro Canvas",
    collection: "sneakers",
    gender: "unisex",
    usd: 59,
    colors: [
      { name: "Ecru", hex: "#E8E2D5" },
      { name: "Charcoal", hex: "#3A3A3C" },
      { name: "Olive", hex: "#5E6248" },
      { name: "Brick", hex: "#9C4A32" },
    ],
    flags: ["S"],
  },
  {
    name: "Street Leather Mid",
    collection: "sneakers",
    gender: "men",
    usd: 119,
    colors: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Walnut", hex: "#6B4A32" },
      { name: "Grey", hex: "#8A8D91" },
    ],
    flags: ["N"],
  },
  {
    name: "Cloud Platform",
    collection: "sneakers",
    gender: "women",
    usd: 109,
    colors: [
      { name: "Chalk", hex: "#F5F3EE" },
      { name: "Blush", hex: "#E2BDB4" },
      { name: "Black", hex: "#1A1A1A" },
    ],
    flags: ["N", "F"],
  },
  {
    name: "Retro Lifestyle Runner",
    collection: "sneakers",
    gender: "unisex",
    usd: 99,
    colors: [
      { name: "Bone", hex: "#EDE6DA" },
      { name: "Navy", hex: "#22314B" },
      { name: "Rust", hex: "#A8572F" },
      { name: "Sage", hex: "#9BAA92" },
    ],
    flags: ["S"],
  },

  // --- Running -------------------------------------------------------------
  {
    name: "Stride Pro",
    collection: "running",
    gender: "men",
    usd: 139,
    colors: [
      { name: "Graphite", hex: "#44474C" },
      { name: "Cobalt", hex: "#2A4E8F" },
      { name: "Volt", hex: "#C7D93C" },
    ],
    flags: ["B", "F"],
  },
  {
    name: "Stride Flow",
    collection: "running",
    gender: "women",
    usd: 139,
    colors: [
      { name: "Mist", hex: "#D7DEE3" },
      { name: "Plum", hex: "#5C3A52" },
      { name: "Coral", hex: "#D96A52" },
    ],
    flags: ["B"],
  },
  {
    name: "Aero Lite",
    collection: "running",
    gender: "unisex",
    usd: 119,
    colors: [
      { name: "White", hex: "#F7F7F5" },
      { name: "Slate", hex: "#5A6572" },
    ],
    flags: ["N"],
    stockRule: "edge-sizes-sold-out",
  },
  {
    name: "Trail Ridge",
    collection: "running",
    gender: "men",
    usd: 149,
    colors: [
      { name: "Moss", hex: "#4A5A3C" },
      { name: "Clay", hex: "#8C5A3F" },
      { name: "Black", hex: "#1A1A1A" },
    ],
    flags: ["S"],
  },
  {
    name: "Trail Glide",
    collection: "running",
    gender: "women",
    usd: 149,
    colors: [
      { name: "Teal", hex: "#2F6B6B" },
      { name: "Sand", hex: "#D9C7A7" },
      { name: "Berry", hex: "#8C3A52" },
    ],
    flags: [],
  },
  {
    name: "Tempo Racer",
    collection: "running",
    gender: "unisex",
    usd: 159,
    colors: [
      { name: "Flare", hex: "#E4572E" },
      { name: "Ink", hex: "#1F2430" },
    ],
    flags: ["N", "F"],
    stockRule: "all-low",
  },

  // --- Boots ---------------------------------------------------------------
  {
    name: "Ridge Chelsea",
    collection: "boots",
    gender: "men",
    usd: 159,
    colors: [
      { name: "Chestnut", hex: "#7A4B2A" },
      { name: "Black", hex: "#1A1A1A" },
    ],
    flags: ["F"],
  },
  {
    name: "Aspen Chelsea",
    collection: "boots",
    gender: "women",
    usd: 159,
    colors: [
      { name: "Tan", hex: "#A9733F" },
      { name: "Black", hex: "#1A1A1A" },
    ],
    flags: [],
  },
  {
    name: "Summit Hiker",
    collection: "boots",
    gender: "unisex",
    usd: 179,
    colors: [
      { name: "Umber", hex: "#5C3B24" },
      { name: "Moss", hex: "#4A5A3C" },
      { name: "Stone", hex: "#9A9287" },
    ],
    flags: ["S"],
  },
  {
    name: "Foreman Work Boot",
    collection: "boots",
    gender: "men",
    usd: 169,
    colors: [
      { name: "Wheat", hex: "#C9A063" },
      { name: "Dark Brown", hex: "#4A3122" },
    ],
    flags: ["B"],
  },
  {
    name: "Sierra Ankle",
    collection: "boots",
    gender: "women",
    usd: 149,
    colors: [
      { name: "Cocoa", hex: "#6B4530" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Bone", hex: "#EDE6DA" },
    ],
    flags: ["N"],
  },
  {
    name: "Storm Lace",
    collection: "boots",
    gender: "unisex",
    usd: 129,
    colors: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Slate", hex: "#5A6572" },
    ],
    flags: ["S"],
  },

  // --- Formal --------------------------------------------------------------
  {
    name: "Heritage Oxford",
    collection: "formal",
    gender: "men",
    usd: 189,
    colors: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Oxblood", hex: "#5C2230" },
    ],
    flags: ["F"],
  },
  {
    name: "Harbor Loafer",
    collection: "formal",
    gender: "men",
    usd: 149,
    colors: [
      { name: "Tan", hex: "#A9733F" },
      { name: "Navy", hex: "#22314B" },
      { name: "Black", hex: "#1A1A1A" },
    ],
    flags: [],
  },
  {
    name: "Classic Derby",
    collection: "formal",
    gender: "men",
    usd: 169,
    colors: [
      { name: "Dark Brown", hex: "#4A3122" },
      { name: "Black", hex: "#1A1A1A" },
    ],
    flags: ["S"],
  },
  {
    name: "Lena Flat",
    collection: "formal",
    gender: "women",
    usd: 99,
    colors: [
      { name: "Nude", hex: "#D8B49B" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Ivory", hex: "#F1EBE1" },
    ],
    flags: ["N"],
  },
  {
    name: "Vera Pump",
    collection: "formal",
    gender: "women",
    usd: 129,
    colors: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Burgundy", hex: "#5F2233" },
    ],
    flags: [],
  },
  {
    name: "Mocha Suede Loafer",
    collection: "formal",
    gender: "men",
    usd: 139,
    colors: [
      { name: "Mocha", hex: "#6A4A38" },
      { name: "Stone", hex: "#9A9287" },
    ],
    flags: ["N"],
  },

  // --- Sandals -------------------------------------------------------------
  {
    name: "Sunday Slide",
    collection: "sandals",
    gender: "unisex",
    usd: 39,
    colors: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Sand", hex: "#D9C7A7" },
      { name: "Navy", hex: "#22314B" },
      { name: "Olive", hex: "#5E6248" },
    ],
    flags: ["B"],
  },
  {
    name: "Cushion Slide",
    collection: "sandals",
    gender: "unisex",
    usd: 49,
    colors: [
      { name: "Grey", hex: "#8A8D91" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Cream", hex: "#EFE7D8" },
    ],
    flags: ["S"],
  },
  {
    name: "Dune Sandal",
    collection: "sandals",
    gender: "women",
    usd: 69,
    colors: [
      { name: "Tan", hex: "#A9733F" },
      { name: "White", hex: "#F7F7F5" },
      { name: "Terracotta", hex: "#B5613F" },
    ],
    flags: ["F"],
  },
  {
    name: "Trek Sandal",
    collection: "sandals",
    gender: "men",
    usd: 79,
    colors: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Khaki", hex: "#8A7B5C" },
    ],
    flags: [],
    stockRule: "one-colour-sold-out",
  },
  {
    name: "Cork Footbed Sandal",
    collection: "sandals",
    gender: "women",
    usd: 79,
    colors: [
      { name: "Cork", hex: "#C2A178" },
      { name: "Black", hex: "#1A1A1A" },
    ],
    flags: ["N"],
  },
  {
    name: "Pool Clog",
    collection: "sandals",
    gender: "unisex",
    usd: 45,
    colors: [
      { name: "Sky", hex: "#7FA8C9" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Lime", hex: "#AFC63F" },
      { name: "White", hex: "#F7F7F5" },
    ],
    flags: ["S"],
    stockRule: "sold-out",
  },

  // --- Training ------------------------------------------------------------
  {
    name: "Gym Flex",
    collection: "training",
    gender: "unisex",
    usd: 109,
    colors: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Grey", hex: "#8A8D91" },
      { name: "Cobalt", hex: "#2A4E8F" },
    ],
    flags: [],
  },
  {
    name: "Lift Stable",
    collection: "training",
    gender: "men",
    usd: 129,
    colors: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Steel", hex: "#6E757C" },
    ],
    flags: ["B"],
  },
  {
    name: "Studio Move",
    collection: "training",
    gender: "women",
    usd: 99,
    colors: [
      { name: "Lilac", hex: "#B5A3C4" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Mint", hex: "#9CC5AE" },
    ],
    flags: ["F"],
  },
  {
    name: "HIIT Pro",
    collection: "training",
    gender: "unisex",
    usd: 119,
    colors: [
      { name: "Ink", hex: "#1F2430" },
      { name: "Flare", hex: "#E4572E" },
    ],
    flags: ["S"],
  },
  {
    name: "Agility Trainer",
    collection: "training",
    gender: "men",
    usd: 115,
    colors: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Navy", hex: "#22314B" },
      { name: "Volt", hex: "#C7D93C" },
    ],
    flags: [],
  },
  {
    name: "Cardio Knit",
    collection: "training",
    gender: "women",
    usd: 105,
    colors: [
      { name: "Rose", hex: "#D49AA4" },
      { name: "Charcoal", hex: "#3A3A3C" },
    ],
    flags: ["N"],
  },
];
