# Pages spec

Contents: routes, data layer, shared shell, home, collection page, product detail page, cart drawer, checkout, cart state, global states, out of scope.

Build only what is listed. Items marked (ASK) depend on the user's confirmation and must not be built until answered.

## Routes

| Route | Page |
| --- | --- |
| `/` | Home |
| `/collections/[slug]` | Collection page with filters (`all` shows every product) |
| `/products/[slug]` | Product detail page |
| `/checkout` | Checkout |
| `/checkout/success` | Order confirmation (ASK, build only if confirmed) |

The cart is a drawer, not a route.

## Data layer (`src/lib/api/`)

All functions are async and return data in the same shape the real API will use, so pages never import the catalog directly.

| Function | Returns |
| --- | --- |
| `getCollections()` | `Collection[]` |
| `getProducts(query)` | `{ items, meta: { page, limit, total, totalPages }, facets }` |
| `getProductBySlug(slug)` | `Product` or null |
| `getRelatedProducts(productId, limit)` | `Product[]` (same collection or gender, excluding itself) |
| `getFeaturedProducts()`, `getNewArrivals()`, `getBestsellers()` | `Product[]` |

`query` supports: `collection`, `gender[]`, `size[]`, `color[]`, `minPrice`, `maxPrice`, `availability` (in stock only), `onSale`, `isNew`, `sort`, `page`, `limit`, `q`. `facets` returns the counts for each filter option given the current results, so the UI can show "(12)" next to options and hide empty ones. Filtering rules: within one filter group choose ANY of the values, across groups require ALL.

## Shared shell

- **Announcement bar**: rotating or single message from `brand.announcements`, dismissible only if confirmed.
- **Header**: logo (from brand), main nav from `brand.nav` with the collections (mega-menu on desktop is ASK), cart icon with live item count that opens the drawer, account icon (non-functional link until auth exists, ASK), search and wishlist icons only if confirmed (ASK). Sticky with a subtle shadow after scrolling. Collapses to a menu sheet on mobile.
- **Footer**: link columns, newsletter input (UI only, validates email with Zod, shows success text), social links, legal links, payment icons row (neutral generic icons, no real brand marks unless the user supplies them). All content from `brand.footer`.
- **Layout**: `Container` and `Section` components apply `--container-max`, `--gutter` and `--section-y`.

## Home

Sections in order (each is its own component, all content from config or data):

1. Hero: headline, supporting line, primary and secondary CTA, large image, text-over-image uses `hero-overlay` token.
2. Collection tiles: the six collections as image tiles linking to each collection.
3. New arrivals rail: product cards in a horizontal scroll or carousel with arrows (keyboard accessible).
4. Featured or editorial banner: one large image block with a CTA (for example linking to the sale collection or a category).
5. Bestsellers grid: 4 to 8 product cards.
6. Value props strip: 3 to 4 items from `brand.valueProps` (free shipping threshold, returns window, secure checkout). Copy must come from config values so the numbers stay consistent with checkout.
7. Reviews or social proof: aggregate numbers and 3 short placeholder testimonials (ASK whether to include fake testimonials; if yes mark them clearly as sample content in code comments).
8. Newsletter signup (same component as footer variant if reasonable).

## Collection page (`/collections/[slug]`)

- Breadcrumb, collection title and description, result count.
- **Filters** (all synced to URL query params so pages are shareable and the back button works): gender, collection (on the "all" page), size, color (swatches), price range (slider with min and max inputs), availability (in stock), on sale, new arrivals. Each option shows its facet count.
- **Sort**: featured, newest, price low to high, price high to low, top rated, best selling.
- Active filter chips with a "clear all" action.
- Desktop: left sidebar with collapsible filter groups. Mobile: "Filter and sort" button opening a full-height sheet with an "Apply" action and result count.
- Grid: 2 columns on mobile, 3 on tablet, 3 or 4 on desktop.
- Pagination style and items per page (ASK: numbered pages, load more, or infinite scroll; default suggestion is numbered pages with 12 per page).
- **Product card**: image with hover swap to the second image (not on touch), badges (New, Sale, Bestseller, Sold out), name, collection or gender line, price with strikethrough compare-at for sale items, color swatch dots with "+N" overflow, rating if present. The whole card links to the product page. Quick add is out of scope unless confirmed (ASK).
- States: skeleton grid while loading, empty state ("No shoes match" with clear filters button), error state with retry.

## Product detail page (`/products/[slug]`)

- Breadcrumb (home, collection, product).
- **Gallery**: large image plus thumbnails on desktop, swipeable carousel with dots on mobile, images change with the selected color, zoom or lightbox on click.
- **Info panel**: name, rating and review count, price (with compare-at and savings amount or percent for sale), short description.
- **Color selector**: swatches with the color name shown; selecting a color updates gallery, URL (`?color=`), and size availability. Unavailable (fully sold-out) colors are visibly marked but still selectable for viewing.
- **Size selector**: grid of sizes; sold-out sizes are disabled and crossed out; low stock shows "Only N left" for the selected variant; size guide link opening a dialog with the size chart (EU and, if confirmed, US).
- **Quantity stepper**: min 1, max is the variant stock (cap at a sensible maximum).
- **Add to cart**: if no size is chosen, show an inline message "Select a size" (do not silently disable without explanation); on success open the cart drawer. Sold-out product shows a disabled "Sold out" button.
- **Wishlist heart** (ASK).
- Delivery and returns snippet from brand config.
- **Accordions**: Details and features, Materials, Care, Shipping and returns.
- Related products rail ("You may also like").
- Mobile: sticky add-to-cart bar appears when the main button scrolls out of view.
- SEO: `generateMetadata` (title, description, Open Graph image), and JSON-LD `Product` structured data with price, currency, availability.
- Not found state if the slug does not exist (`notFound()`).

## Cart drawer

- Opens from the header icon and after Add to cart; closes on overlay click, close button and Escape; focus is trapped while open (use the shadcn Sheet).
- Line items: image, name, color and size, unit price, quantity stepper (max stock), remove button, line total.
- Free-shipping progress bar driven by `brand.shipping.freeThresholdCents`.
- Subtotal; note that shipping and taxes are calculated at checkout (tax display ASK).
- Primary "Checkout" button linking to `/checkout`, secondary "Continue shopping".
- Empty state with a message and links to two or three collections.
- If a stored item becomes unavailable or its stock drops, flag the line and prevent checkout until it is fixed.

## Checkout (`/checkout`)

UI only. No payment is collected and no backend call is made (payments arrive with Stripe in a later phase).

- Single page, two columns on desktop (form left, order summary right), stacked on mobile with a collapsible summary at the top.
- Sections: contact (email), shipping address (name, address lines, city, region, postal code, country, phone), delivery method (options and prices from `brand.shipping`, ASK for the list), payment (a clearly marked placeholder area explaining payment is connected later, no card fields), order notes optional.
- Promo code input (UI only, shows a "not available yet" message, ASK whether to include).
- Order summary: line items, subtotal, shipping, estimated tax (ASK), total, all computed from the cart state with `formatPrice()`.
- Validation: React Hook Form with a Zod schema, errors under fields, focus moves to the first error on submit, submit button shows a pending state.
- Place order action: ASK what happens (default suggestion: validates, then shows the success page with a fake order number and clears the cart).
- Empty cart redirects to the home page or shows an empty state with a link back.
- Guest checkout only for now.

## Cart state

- Redux Toolkit slice `cart`: items keyed by variant SKU with product id, slug, name, color, size, unit price in cents, image, quantity, max stock. A separate `ui` slice holds `cartDrawerOpen`.
- Selectors: item count, subtotal, free-shipping remaining, line validity.
- Persistence to localStorage (ASK). If persisted, wrap access in try/catch, validate stored data with Zod, and never read it during server rendering (avoid hydration mismatch).
- Cart actions: add, remove, set quantity, clear. Adding an existing SKU increases its quantity up to stock.

## Global states and quality

- Loading: skeletons that match the final layout. Empty: helpful message plus next action. Error: message plus retry. 404 and error pages use the brand shell.
- Images: `next/image` with `sizes`, `priority` only for the hero and first gallery image.
- Toasts for add to cart errors, newsletter success.
- Core Web Vitals sanity: no layout shift from fonts or images, no unneeded client components.

## Out of scope for this phase

Authentication and account pages, wishlist page, search results page, reviews list and review form, order history, admin, real payments, real API calls, blog, store locator, kids range. Do not build them. If the user asks later, add them to the decisions file first.
