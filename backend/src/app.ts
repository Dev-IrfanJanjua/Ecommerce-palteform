import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import { env, isTest } from "@/config/env";
import { logger } from "@/common/logger";
import { requestId } from "@/common/middleware/request-id";
import { notFoundHandler } from "@/common/middleware/not-found";
import { errorHandler } from "@/common/middleware/error-handler";
import { healthRoutes } from "@/modules/health/health.routes";
import { authRoutes } from "@/modules/auth/auth.routes";
import { productRoutes } from "@/modules/products/product.routes";
import { collectionRoutes } from "@/modules/collections/collection.routes";
import { cartRoutes } from "@/modules/cart/cart.routes";
import { wishlistRoutes } from "@/modules/wishlist/wishlist.routes";

export const API_PREFIX = "/api/v1";

/**
 * Builds the Express app without starting a server.
 *
 * The split from server.ts is what makes the API testable: Supertest takes
 * this app object directly, so the whole suite runs with no port, no listener
 * and no teardown race.
 *
 * Middleware order is deliberate and is documented inline — most of these only
 * work if they run before the thing they are protecting.
 */
export function createApp(): Express {
  const app = express();

  // Needed behind a proxy (Railway, Render, nginx) so req.ip is the real
  // client address. Without it, the rate limiter sees one IP for everyone and
  // the whole site shares a single quota.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // First, so every later log line and error response carries the id.
  app.use(requestId);

  app.use(
    helmet({
      // The API serves JSON to a separate frontend origin, so the default
      // same-origin resource policy would block legitimate cross-origin reads.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true, // refresh-token cookie, once auth exists
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    }),
  );

  app.use(compression());

  // A body limit is a denial-of-service control: without it a single request
  // can allocate unbounded memory.
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: true, limit: "100kb" }));

  // Required before any route that reads the refresh cookie.
  app.use(cookieParser());

  if (!isTest) {
    app.use(
      pinoHttp({
        logger,
        customProps: (req) => ({ requestId: req.id }),
        // Expected 4xx responses are not warnings; only real failures are.
        customLogLevel: (_req, res, err) =>
          err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "info" : "info",
      }),
    );
  }

  // Rate limiting AFTER the body parser but BEFORE routes, so an abusive
  // client is rejected before any handler work happens. Health is excluded so
  // an orchestrator's probes are never throttled.
  app.use(
    API_PREFIX,
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      skip: (req) => req.path.startsWith("/health"),
      message: { success: false, message: "Too many requests, please try again later" },
    }),
  );

  // --- Routes --------------------------------------------------------------
  app.use(`${API_PREFIX}/health`, healthRoutes);
  app.use(`${API_PREFIX}/auth`, authRoutes);
  app.use(`${API_PREFIX}/products`, productRoutes);
  app.use(`${API_PREFIX}/collections`, collectionRoutes);
  app.use(`${API_PREFIX}/cart`, cartRoutes);
  app.use(`${API_PREFIX}/wishlist`, wishlistRoutes);

  // --- Tail ----------------------------------------------------------------
  // Both must stay last, and in this order: anything unmatched becomes a 404,
  // and the error handler formats every failure.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
