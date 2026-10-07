import type { Server } from "node:http";
import { createApp } from "@/app";
import { env } from "@/config/env";
import { logger } from "@/common/logger";
import { connectDatabase, disconnectDatabase } from "@/config/db";

/**
 * Process entry point.
 *
 * Kept separate from app.ts so tests can use the app without binding a port.
 * (Wrapped in a function rather than using top-level await, because the build
 * emits CommonJS, where top-level await is not available.)
 */

let server: Server | undefined;

async function start() {
  // Connect BEFORE listening. Taking traffic first means the earliest requests
  // fail while the pool is still warming up, and a readiness probe would pass
  // before the instance can actually serve anything.
  await connectDatabase();

  const app = createApp();

  server = app.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}/api/v1 (${env.NODE_ENV})`);
  });
}

/**
 * Graceful shutdown.
 *
 * On deploy the platform sends SIGTERM and then kills the process. Closing the
 * server first lets in-flight requests finish instead of being cut off
 * mid-response, which otherwise appears as random 502s during every release.
 * The database pool closes last, or those final queries fail on the way out.
 */
let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received, shutting down`);

  // If something refuses to let go, do not hang forever.
  const forceExit = setTimeout(() => {
    logger.error("Could not close connections in time, forcing exit");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
      logger.info("HTTP server closed");
    }
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, "Error during shutdown");
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

// A rejected promise nobody handled leaves the process in an unknown state.
// Log it and exit so the orchestrator restarts a clean one.
process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled promise rejection");
  process.exit(1);
});
process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  process.exit(1);
});

start().catch((error) => {
  logger.fatal({ err: error }, "Failed to start");
  process.exit(1);
});
