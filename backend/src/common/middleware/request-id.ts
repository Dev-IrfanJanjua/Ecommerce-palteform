import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

/**
 * Gives every request an id, echoed back in the `x-request-id` header.
 *
 * This is what makes a user's bug report actionable: they quote the id, and
 * every log line for that request can be found. An id supplied by a proxy is
 * reused so a trace survives across services.
 */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers["x-request-id"];
  const id = typeof incoming === "string" && incoming.length <= 128 ? incoming : randomUUID();
  req.id = id;
  res.setHeader("x-request-id", id);
  next();
}
