import mongoose from "mongoose";
import { env, isProduction } from "@/config/env";
import { logger } from "@/common/logger";

/**
 * DATABASE CONNECTION
 *
 * Mongoose maintains its own connection pool and reconnects on its own, so the
 * job here is the startup handshake and a clean shutdown — not per-query
 * connection management.
 *
 * Retries on boot are deliberate: a container often starts before the database
 * is reachable (a new Atlas cluster waking, a restarting network). Exiting
 * immediately turns a two-second blip into a failed deploy.
 */

export type DatabaseStatus = "connected" | "connecting" | "disconnected" | "not configured";

/** Maps Mongoose's numeric readyState to something a human can read. */
export function getDatabaseStatus(): DatabaseStatus {
  if (!env.MONGODB_URI) return "not configured";
  switch (mongoose.connection.readyState) {
    case 1:
      return "connected";
    case 2:
      return "connecting";
    default:
      return "disconnected";
  }
}

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 1000;

export async function connectDatabase(): Promise<void> {
  if (!env.MONGODB_URI) {
    const message =
      "MONGODB_URI is not set — starting without a database. " +
      "Product endpoints will return 503 until it is configured.";
    if (isProduction) throw new Error("MONGODB_URI is required in production");
    logger.warn(message);
    return;
  }

  // Reject unknown query operators rather than silently ignoring them: a typo
  // in a filter should fail loudly, not quietly return the whole collection.
  mongoose.set("strictQuery", true);

  // Index building is convenient in development and dangerous in production,
  // where it can lock a large collection at an arbitrary moment. Indexes are
  // created deliberately by the sync script instead.
  mongoose.set("autoIndex", !isProduction);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        dbName: env.MONGODB_DB_NAME,
        // Fail a query quickly when the pool is unhealthy, rather than letting
        // requests pile up behind a dead connection.
        serverSelectionTimeoutMS: 10_000,
        socketTimeoutMS: 45_000,
        maxPoolSize: 20,
        minPoolSize: 2,
        retryWrites: true,
      });

      logger.info(`MongoDB connected (database: ${env.MONGODB_DB_NAME})`);
      registerConnectionListeners();
      return;
    } catch (error) {
      const last = attempt === MAX_ATTEMPTS;
      // Exponential backoff: 1s, 2s, 4s, 8s.
      const delay = BASE_DELAY_MS * 2 ** (attempt - 1);

      logger.error(
        { err: error, attempt, of: MAX_ATTEMPTS },
        last ? "MongoDB connection failed" : `MongoDB connection failed, retrying in ${delay}ms`,
      );

      if (last) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/** Logged rather than handled: Mongoose recovers on its own, but a silent
 *  disconnect that nobody can see in the logs is a debugging nightmare. */
function registerConnectionListeners() {
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));
  mongoose.connection.on("reconnected", () => logger.info("MongoDB reconnected"));
  mongoose.connection.on("error", (error) => logger.error({ err: error }, "MongoDB error"));
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  logger.info("MongoDB disconnected");
}
