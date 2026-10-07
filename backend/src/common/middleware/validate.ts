import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "@/common/errors/app-error";

/**
 * Validates body, query and params against a Zod schema.
 *
 * IMPORTANT — why the result is written to `req.validated` and not back onto
 * `req`: in Express 5, `req.query` is a getter with no setter. Assigning to it
 * (as Express 4 code commonly did) throws
 *   "Cannot set property query of #<IncomingMessage> which has only a getter".
 * Handlers therefore read validated input from `req.validated`.
 *
 * Reading only from `req.validated` also means unknown fields are gone by
 * construction: Zod strips them, so no handler can accidentally trust a field
 * nobody declared.
 */
export interface ValidatedRequest<B = unknown, Q = unknown, P = unknown> {
  body: B;
  query: Q;
  params: P;
}

export const validate =
  (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      // flatten() on the wrapper schema would key everything as "body" /
      // "query" / "params", which tells a client nothing. Key by the real
      // field instead, dotting only when the path is genuinely nested.
      const errors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        // Drop the leading body/query/params segment.
        const path = issue.path.slice(1).join(".") || issue.path.join(".") || "_";
        (errors[path] ??= []).push(issue.message);
      }
      return next(new AppError(400, "Validation failed", errors));
    }

    req.validated = result.data as ValidatedRequest;
    next();
  };
