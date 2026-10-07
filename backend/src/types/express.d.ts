import type { ValidatedRequest } from "@/common/middleware/validate";

/**
 * Augments Express's Request with the fields this app attaches.
 *
 * Declared once rather than cast at each use site, so a handler reading
 * `req.validated` is type-checked instead of relying on `as`.
 */
declare global {
  namespace Express {
    interface Request {
      /** Correlation id, set by the requestId middleware. */
      id: string;
      /** Output of validate(); present only on routes that use it. */
      validated?: ValidatedRequest;
    }
  }
}

export {};
