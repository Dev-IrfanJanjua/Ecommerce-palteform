/**
 * SEED THE DATABASE
 *
 *   npm run seed            upsert the catalogue (safe to re-run)
 *   npm run seed -- --fresh delete everything first
 *
 * ONE SOURCE OF TRUTH: this imports the frontend's own catalogue generator
 * rather than copying it. A copy would drift — the two would describe
 * different products within a few edits, and nobody would notice until a
 * price disagreed. Importing it means the database is seeded from exactly the
 * spec the storefront already renders.
 *
 * It lives in scripts/ (not src/) because it reaches outside the backend's
 * rootDir, and because it is an operator tool rather than part of the server.
 */
import { connectDatabase, disconnectDatabase } from "../src/config/db";
import { logger } from "../src/common/logger";
import { env } from "../src/config/env";
import { Product } from "../src/modules/products/product.model";
import { ProductCollection } from "../src/modules/collections/collection.model";

import { buildCatalog, buildCollections } from "../../frontend/src/data/catalog";
import type { Product as CatalogProduct } from "../../frontend/src/types/catalog";

const FRESH = process.argv.includes("--fresh");

/** Maps the shared catalogue shape onto the storage names. */
function toProductDocument(product: CatalogProduct) {
  const { collection, isNew, createdAt, id: _ignored, ...rest } = product;
  return {
    ...rest,
    // `collection` and `isNew` are reserved by Mongoose — see product.model.ts.
    collectionSlug: collection,
    isNewArrival: isNew,
    publishedAt: new Date(createdAt),
  };
}

async function seed() {
  if (!env.MONGODB_URI) {
    logger.error(
      "MONGODB_URI is not set. Add your Atlas connection string to backend/.env first.",
    );
    process.exit(1);
  }

  await connectDatabase();

  const collections = buildCollections();
  const products = buildCatalog();

  if (FRESH) {
    logger.warn("--fresh: deleting all products and collections");
    await Promise.all([Product.deleteMany({}), ProductCollection.deleteMany({})]);
  }

  // Upsert on slug, so re-running leaves 36 products rather than 72.
  const collectionResult = await ProductCollection.bulkWrite(
    collections.map((collection) => ({
      updateOne: { filter: { slug: collection.slug }, update: { $set: collection }, upsert: true },
    })),
  );

  const productResult = await Product.bulkWrite(
    products.map((product) => ({
      updateOne: {
        filter: { slug: product.slug },
        update: { $set: toProductDocument(product) },
        upsert: true,
      },
    })),
  );

  // autoIndex is off in production, so the seed is the deliberate moment to
  // build indexes rather than having them appear mid-traffic.
  await Promise.all([Product.syncIndexes(), ProductCollection.syncIndexes()]);

  const [productCount, collectionCount] = await Promise.all([
    Product.countDocuments(),
    ProductCollection.countDocuments(),
  ]);

  logger.info(
    {
      collections: {
        inserted: collectionResult.upsertedCount,
        updated: collectionResult.modifiedCount,
        total: collectionCount,
      },
      products: {
        inserted: productResult.upsertedCount,
        updated: productResult.modifiedCount,
        total: productCount,
      },
    },
    "Seed complete",
  );

  await disconnectDatabase();
}

seed().catch(async (error) => {
  logger.error({ err: error }, "Seed failed");
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
