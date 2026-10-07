import { createApp } from "@/app";
import { env } from "@/config/env";
import { logger } from "@/common/logger";

/**
 * Starts the HTTP server.
 *
 * Kept separate from app.ts so tests can use the app without binding a port.
 */
const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}/api/v1 (${env.NODE_ENV})`);
});

/**
 * Graceful shutdown.
 *
 * On deploy, the platform sends SIGTERM and then kills the process. Closing
 * the server first lets in-flight requests finish instead of being cut off
 * mid-response, which otherwise shows up as random 502s during every release.
 */
function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);

  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  // If something refuses to let go, do not hang forever.
  setTimeout(() => {
    logger.error("Could not close connections in time, forcing exit");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

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
