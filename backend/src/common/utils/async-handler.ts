import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Forwards a rejected promise to the error middleware.
 *
 * Express 5 does forward async rejections on its own, unlike Express 4. This
 * wrapper is kept because it is explicit at the call site and keeps the
 * behaviour identical if a handler is ever used outside a route.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
