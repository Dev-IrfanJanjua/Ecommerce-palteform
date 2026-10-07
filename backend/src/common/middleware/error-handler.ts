import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { isAppError } from "@/common/errors/app-error";
import { logger } from "@/common/logger";
import { isProduction } from "@/config/env";

/**
 * The single place an error becomes an HTTP response. Register it LAST.
 *
 * The rule it enforces: a client is told what it needs to fix its request, and
 * nothing more. An unexpected failure returns a generic message, because its
 * real message can contain a file path, a query, or a connection string. The
 * full error still reaches the logs, tied to the request id, so it remains
 * debuggable without being disclosed.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // A Zod error reaching here means a schema ran outside validate().
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  if (isAppError(err)) {
    if (err.status >= 500) {
      logger.error({ err, requestId: req.id }, "Application error");
    }
    res.status(err.status).json({
      success: false,
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    });
    return;
  }

  // Malformed JSON body — express.json() raises a SyntaxError with a status.
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ success: false, message: "Malformed JSON body" });
    return;
  }

  logger.error({ err, requestId: req.id }, "Unhandled error");

  res.status(500).json({
    success: false,
    message: "Internal server error",
    // The request id is the only internal detail worth exposing: it lets a
    // user quote something that finds the real error in the logs.
    requestId: req.id,
    // Stacks are for developers on their own machine, never for clients.
    ...(isProduction ? {} : { debug: err instanceof Error ? err.message : String(err) }),
  });
};
