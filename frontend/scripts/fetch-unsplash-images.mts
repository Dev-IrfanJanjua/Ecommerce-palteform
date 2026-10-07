/**
 * FETCH UNSPLASH PHOTOS
 *
 * Writes src/data/product-images.generated.json — a map of product slug to
 * four Unsplash photos, with photographer attribution.
 *
 *   npm run images:fetch          fetch anything missing
 *   npm run images:fetch -- --force   refetch everything
 *
 * WHY URLS AND NOT DOWNLOADED FILES
 * The Unsplash API Guidelines require hotlinking the image URLs they return
 * rather than storing copies, and require attribution to the photographer and
 * to Unsplash. So this stores URLs plus credit, and the app points next/image
 * at their CDN. That also keeps ~150 binaries out of git.
 *
 * RATE LIMIT
 * A demo Unsplash application allows 50 requests per hour. This makes exactly
 * one search per product (36 total) and is resumable: rerunning only fetches
 * products that are missing, so hitting the limit is not destructive.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { PRODUCT_SOURCE } from "../src/data/catalog.source";
import { slugify } from "../src/data/catalog";

const OUT = "src/data/product-images.generated.json";
const API = "https://api.unsplash.com/search/photos";
const FORCE = process.argv.includes("--force");

const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
if (!ACCESS_KEY) {
  console.error(
    "UNSPLASH_ACCESS_KEY is not set.\n" +
      "Add it to frontend/.env.local (which is gitignored):\n" +
      "  UNSPLASH_ACCESS_KEY=your_access_key\n",
  );
  process.exit(1);
}

/** Search terms tuned per collection, so a sandal does not return a boot. */
const QUERY_BY_COLLECTION: Record<string, string> = {
  sneakers: "sneakers shoes product",
  running: "running shoes",
  boots: "leather boots footwear",
  formal: "leather dress shoes oxford",
  sandals: "sandals slides footwear",
  training: "gym training shoes",
};

export interface UnsplashPhoto {
  id: string;
  /** Base URL; sizing params are appended by the app. */
  url: string;
  alt: string;
  blurHash: string | null;
  width: number;
  height: number;
  photographer: string;
  photographerUrl: string;
  /** Required by the API guidelines when the photo is used. */
  unsplashUrl: string;
}

type ImageMap = Record<string, UnsplashPhoto[]>;

function loadExisting(): ImageMap {
  if (FORCE || !existsSync(OUT)) return {};
  try {
    return JSON.parse(readFileSync(OUT, "utf8")) as ImageMap;
  } catch {
    return {};
  }
}

interface SearchResult {
  results: {
    id: string;
    urls: { raw: string };
    alt_description: string | null;
    blur_hash: string | null;
    width: number;
    height: number;
    links: { html: string };
    user: { name: string; links: { html: string } };
  }[];
}

async function search(query: string, page: number): Promise<SearchResult["results"]> {
  const url = `${API}?query=${encodeURIComponent(query)}&per_page=10&page=${page}&orientation=squarish&content_filter=high`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}`, "Accept-Version": "v1" },
  });

  const remaining = res.headers.get("x-ratelimit-remaining");

  if (res.status === 403) {
    throw new Error(
      `Unsplash rate limit reached (50/hour on a demo app). Remaining: ${remaining}.\n` +
        `Progress is saved — rerun 'npm run images:fetch' in an hour to continue.`,
    );
  }
  if (!res.ok) throw new Error(`Unsplash returned ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as SearchResult;
  process.stdout.write(`  (${remaining} requests left this hour)\n`);
  return data.results;
}

async function main() {
  const images = loadExisting();
  const todo = PRODUCT_SOURCE.filter((p) => FORCE || !images[slugify(p.name)]?.length);

  console.log(
    `\n${PRODUCT_SOURCE.length} products · ${PRODUCT_SOURCE.length - todo.length} already fetched · ${todo.length} to fetch\n`,
  );
  if (!todo.length) {
    console.log("Nothing to do.\n");
    return;
  }

  let index = 0;
  for (const product of todo) {
    const slug = slugify(product.name);
    const query = QUERY_BY_COLLECTION[product.collection] ?? "shoes";
    // Spread results across pages so 36 products do not all show the same
    // handful of top photos.
    const page = (index % 5) + 1;

    process.stdout.write(`${String(index + 1).padStart(2)}/${todo.length} ${product.name} … `);

    try {
      let results = await search(query, page);
      // Narrow queries run out of results on deeper pages; fall back to page 1
      // rather than leaving the product without photos.
      if (!results.length && page !== 1) {
        process.stdout.write("  (page empty, retrying page 1) ");
        results = await search(query, 1);
      }
      if (!results.length) {
        console.log("  no results, skipped");
        index++;
        continue;
      }

      // Four distinct photos per product, cycling if the page returned fewer.
      images[slug] = Array.from({ length: 4 }, (_, i) => {
        const r = results[(i * 2 + index) % results.length];
        return {
          id: r.id,
          url: r.urls.raw,
          alt: r.alt_description ?? `${product.name} product photo`,
          blurHash: r.blur_hash,
          width: r.width,
          height: r.height,
          photographer: r.user.name,
          photographerUrl: r.user.links.html,
          unsplashUrl: r.links.html,
        };
      });

      // Saved after every product, so a rate-limit stop loses nothing.
      mkdirSync(dirname(OUT), { recursive: true });
      writeFileSync(OUT, JSON.stringify(images, null, 2) + "\n");
    } catch (error) {
      console.error(`\n\n${(error as Error).message}\n`);
      console.log(`Saved ${Object.keys(images).length} products so far to ${OUT}\n`);
      process.exit(1);
    }

    index++;
  }

  console.log(`\nDone. ${Object.keys(images).length} products written to ${OUT}\n`);
}

await main();
