import type { ValidatedRequest } from "@/common/middleware/validate";
import type { Role } from "@/modules/users/user.model";

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
      /**
       * Set by the authenticate middleware from a VERIFIED token.
       * Optional because public routes have no user — handlers behind
       * authenticate can rely on it, and TypeScript makes the rest check.
       */
      user?: { id: string; role: Role };
    }
  }
}

export {};
