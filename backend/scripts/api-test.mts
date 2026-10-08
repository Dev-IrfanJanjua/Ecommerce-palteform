/**
 * PRODUCTS API TEST — runs against the real database.
 *
 *   npm run api:test
 *
 * Boots the app in-process and asserts the API returns exactly what the
 * frontend's data layer already expects, using the same numbers the local
 * catalogue produced. If these agree, swapping the data layer is safe.
 */
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import mongoose from "mongoose";
import { createApp, API_PREFIX } from "../src/app";
import { connectDatabase, disconnectDatabase } from "../src/config/db";

let fails = 0;
const check = (l: string, ok: boolean, got?: unknown) => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${l}${ok ? "" : ` — got ${JSON.stringify(got)}`}`);
  if (!ok) fails++;
};
const section = (t: string) => console.log(`\n${t}`);

await connectDatabase();
const server = createServer(createApp());
await new Promise<void>((r) => server.listen(0, r));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}${API_PREFIX}`;

const get = async (path: string) => {
  const res = await fetch(base + path);
  return { status: res.status, body: (await res.json()) as any };
};

/* ------------------------------------------------------------------ */
section("Envelope and counts");
const all = await get("/products?limit=12");
check("GET /products -> 200", all.status === 200, all.status);
check("success envelope", all.body.success === true);
check("36 total", all.body.meta?.total === 36, all.body.meta);
check("12 per page, 3 pages", all.body.meta?.limit === 12 && all.body.meta?.totalPages === 3, all.body.meta);
check("returns items and facets", Array.isArray(all.body.data?.items) && !!all.body.data?.facets);

/* ------------------------------------------------------------------ */
section("Product shape matches the frontend's type");
const p = all.body.data.items[0];
for (const field of ["id","slug","name","collection","gender","priceCents","currency","colors","sizes","variants","rating","reviewCount","isNew","isBestseller","isFeatured","createdAt","shortDescription","description","features","material","care","tags"])
  check(`has ${field}`, field in p, Object.keys(p));
check("no _id leaked", !("_id" in p));
check("no collectionSlug leaked", !("collectionSlug" in p));
check("price is integer paisa", Number.isInteger(p.priceCents));

/* ------------------------------------------------------------------ */
section("Filtering — same numbers the local catalogue gave");
const cases: [string, string, number][] = [
  ["collection=sneakers", "?collection=sneakers", 6],
  ["gender=men", "?gender=men", 12],
  ["gender=men,women (OR within a group)", "?gender=men,women", 23],
  ["gender=men&gender=women (repeated param)", "?gender=men&gender=women", 23],
  ["onSale", "?onSale=1", 9],
  ["isNew", "?isNew=1", 9],
  ["availability (Pool Clog excluded)", "?availability=1", 35],
  ["men + onSale + inStock (AND across groups)", "?gender=men&onSale=1&availability=1", 2],
  ["sale AND new (no overlap)", "?onSale=1&isNew=1", 0],
  ["colour black", "?color=black", 23],
  ["size 42", "?size=42", 24],
  ["under Rs 20,000", "?maxPrice=2000000", 5],
];
for (const [label, qs, expected] of cases) {
  const r = await get("/products" + qs);
  check(`${label} -> ${expected}`, r.body.meta?.total === expected, r.body.meta?.total);
}

/* ------------------------------------------------------------------ */
section("Search");
const search = await get("/products?q=trail");
check("q=trail finds 2", search.body.meta?.total === 2, search.body.data?.items?.map((i: any) => i.slug));

/* ------------------------------------------------------------------ */
section("Sorting");
const asc = await get("/products?sort=price-asc&limit=1");
check("price-asc starts at Pool Clog", asc.body.data.items[0]?.slug === "pool-clog", asc.body.data.items[0]?.slug);
const desc = await get("/products?sort=price-desc&limit=1");
check("price-desc starts at Heritage Oxford", desc.body.data.items[0]?.slug === "heritage-oxford", desc.body.data.items[0]?.slug);

/* ------------------------------------------------------------------ */
section("Pagination");
const page1 = await get("/products?page=1&limit=12");
const page3 = await get("/products?page=3&limit=12");
const ids1 = page1.body.data.items.map((i: any) => i.id);
const ids3 = page3.body.data.items.map((i: any) => i.id);
check("page 1 and 3 do not overlap", !ids1.some((id: string) => ids3.includes(id)));
check("page 3 has 12 items", ids3.length === 12, ids3.length);

/* ------------------------------------------------------------------ */
section("Facets exclude their own group");
const boots = await get("/products?collection=boots");
const f = boots.body.data.facets;
check("boots -> 6 results", boots.body.meta.total === 6);
check("gender counts narrow to boots", f.gender.every((g: any) => g.count === 2), f.gender);
check("collection counts stay full so you can switch", f.collection.every((c: any) => c.count === 6), f.collection);
check("price range present", f.priceRange.min > 0 && f.priceRange.max > f.priceRange.min, f.priceRange);
check("colour facets carry hex", f.color.every((c: any) => /^#[0-9a-fA-F]{6}$/.test(c.hex)), f.color.slice(0,2));
check("size facets labelled 'EU nn'", f.size.every((s: any) => /^EU \d+$/.test(s.label)), f.size.slice(0,2));

/* ------------------------------------------------------------------ */
section("Single product, related and rails");
const one = await get("/products/court-classic-low");
check("by slug -> 200", one.status === 200);
check("correct product", one.body.data?.slug === "court-classic-low");
check("32 variants", one.body.data?.variants?.length === 32, one.body.data?.variants?.length);
const missing = await get("/products/not-a-real-shoe");
check("unknown slug -> 404", missing.status === 404, missing.status);
check("404 uses the error envelope", missing.body.success === false && !!missing.body.message);

const related = await get("/products/court-classic-low/related?limit=4");
check("related returns 4", related.body.data?.length === 4, related.body.data?.length);
check("related excludes itself", !related.body.data?.some((r: any) => r.slug === "court-classic-low"));

for (const [path, expected] of [["/products/featured", 8], ["/products/new", 8], ["/products/bestsellers", 6]] as const) {
  const r = await get(path + "?limit=8");
  check(`${path} -> ${expected}`, r.body.data?.length === expected, r.body.data?.length);
}

/* ------------------------------------------------------------------ */
section("Collections");
const cols = await get("/collections");
check("6 collections", cols.body.data?.length === 6, cols.body.data?.length);
check("sorted by sortOrder", cols.body.data?.[0]?.slug === "sneakers", cols.body.data?.[0]?.slug);
check("single collection", (await get("/collections/boots")).body.data?.slug === "boots");
check("unknown collection -> 404", (await get("/collections/nope")).status === 404);

/* ------------------------------------------------------------------ */
section("Input is validated, not trusted");
const hostile: [string, string][] = [
  ["unknown sort rejected", "?sort=DROP-TABLES"],
  ["unknown gender rejected", "?gender=hacker"],
  ["negative page rejected", "?page=-5"],
  ["limit above the cap rejected", "?limit=9999"],
];
for (const [label, qs] of hostile) {
  const r = await get("/products" + qs);
  check(label, r.status === 400, { status: r.status, body: r.body });
}
// The classic NoSQL injection attempt: an operator smuggled through a query param.
const injection = await get("/products?priceCents[$ne]=0");
check("operator injection ignored, not executed", injection.status === 200 && injection.body.meta.total === 36, {
  status: injection.status, total: injection.body?.meta?.total,
});

console.log(`\n${fails === 0 ? "ALL API TESTS PASSED" : fails + " FAILED"}\n`);
server.close();
await disconnectDatabase();
await mongoose.disconnect().catch(() => {});
process.exit(fails ? 1 : 0);
