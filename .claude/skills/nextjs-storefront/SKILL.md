---
name: nextjs-storefront
description: Build frontend pages and components for the E-Commerce project with Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, React Hook Form + Zod, TanStack Query, Redux Toolkit and Framer Motion. Use this skill whenever the user asks for a page, component, form, product listing, cart, checkout UI, filters, admin dashboard screen, API data fetching, loading or error states, or responsive styling on the frontend, even if they just say "make the cart page".
---

# Next.js storefront

## Where state lives (decide before coding)

| Kind of state | Tool | Example |
| --- | --- | --- |
| Data that lives on the server | TanStack Query | products, orders, profile |
| Form input and validation | React Hook Form + Zod | checkout, login, product editor |
| Shared UI state across components | Redux Toolkit | cart drawer open, guest cart, auth access token |
| State used by one component | `useState` | quantity stepper |
| Filters and pagination | URL search params | `?category=shoes&page=2` (shareable, SEO-friendly) |

Do not put server data in Redux. It duplicates caching that TanStack Query already does.

## Folder layout

```
frontend/src/
├── app/                    routes (App Router): (shop)/, (auth)/, admin/, api-less
├── components/
│   ├── ui/                 shadcn/ui primitives (button, dialog, input...)
│   └── <feature>/          ProductCard, CartDrawer, CheckoutForm...
├── features/<feature>/     hooks (useProducts), api calls, zod schemas, types
├── lib/                    apiClient, formatCurrency, utils
├── store/                  Redux slices
└── providers/              QueryClientProvider, StoreProvider
```

## Server vs client components

- Default to **Server Components**: product listing and product detail pages fetch on the server so they are fast and indexable by Google. Add `generateMetadata` for titles and Open Graph tags.
- Add `"use client"` only where needed: anything with `useState`, effects, event handlers, TanStack Query hooks, Redux, or Framer Motion.
- Keep client components small and push them to the leaves of the tree.

## API client

One typed wrapper around `fetch` in `lib/apiClient.ts`:

- Base URL from `NEXT_PUBLIC_API_URL`.
- Sends `credentials: "include"` (refresh cookie).
- Adds `Authorization: Bearer <accessToken>` from the store.
- On 401, performs a single refresh then retries (see the `auth-jwt-rbac` skill).
- Throws a typed `ApiError` with `status` and `message` so UI can show errors.

## Data fetching with TanStack Query

```tsx
export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => api.get<Paginated<Product>>("/products", { params: filters }),
    placeholderData: keepPreviousData,        // no flicker while paging
  });
}

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { productId: string; qty: number }) => api.post("/cart/items", v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });
}
```

Every data-driven view needs three states designed from the start: **loading** (skeletons, not blank space), **error** (message plus retry button), **empty** ("No products match your filters").

## Forms

```tsx
const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
type FormValues = z.infer<typeof schema>;

const form = useForm<FormValues>({ resolver: zodResolver(schema) });
```

- Reuse the same Zod schema shape as the backend where possible.
- Show field errors next to inputs; disable the submit button while pending; show server errors (for example "Email already registered") from the mutation.
- Use shadcn `Form`, `Input`, `Label` components for accessible markup.

## Styling and UI

- Tailwind utilities, mobile-first: write the base style for phones, then add `md:` and `lg:` overrides. Test at 375px, 768px and 1280px.
- Use shadcn/ui components instead of hand-building dialogs, dropdowns, tabs or toasts. Edit them in place when needed.
- Keep design tokens (colors, radius) in `tailwind.config` / CSS variables, not scattered hex codes.
- Use `next/image` for all product images (set `sizes`, use Cloudinary domain in `images.remotePatterns`).
- Accessibility basics: real `<button>` and `<a>` elements, labels on inputs, alt text, visible focus, sufficient color contrast.
- Framer Motion only for meaningful motion (drawer slide, page fade, add-to-cart feedback). Respect `prefers-reduced-motion`.

## Page checklist

Product list: filters, sort, search, pagination, URL-synced. Product detail: gallery, variant selector, stock indicator, add to cart, wishlist. Cart: quantity edit, remove, totals computed by the API. Checkout: address form, order summary, redirect to Stripe. Orders: history and status with live updates. Admin: tables with pagination, forms, charts (Recharts), role-guarded layout.

Protect pages by role in a layout or middleware, but remember this is only UX: the real enforcement is on the API.

## Environment

Only variables prefixed `NEXT_PUBLIC_` reach the browser. Never put secret keys there.
