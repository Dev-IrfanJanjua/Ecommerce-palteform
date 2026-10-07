/**
 * An error the application raised on purpose, with an HTTP status attached.
 *
 * The distinction matters to the error handler: an AppError carries a message
 * that is safe to show a client, while anything else is an unexpected failure
 * whose message might leak internals and must be replaced with a generic one.
 */
export class AppError extends Error {
  readonly status: number;
  readonly errors?: unknown;
  /** Marks this as a deliberate, client-safe failure. */
  readonly isOperational = true;

  constructor(status: number, message: string, errors?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.errors = errors;
    Error.captureStackTrace?.(this, AppError);
  }
}

/**
 * Identifies an AppError without relying on `instanceof`.
 *
 * `instanceof` is not safe here. The same class imported through two different
 * specifiers (`@/common/errors/app-error` and `../common/errors/app-error`)
 * produces two distinct classes at runtime, so an error thrown by one module
 * fails the check in another — and a deliberate 404 silently becomes a 500.
 * Verified: the two specifiers compared unequal.
 *
 * The structural check costs nothing and cannot break that way.
 */
export function isAppError(error: unknown): error is AppError {
  if (error instanceof AppError) return true;
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { isOperational?: unknown }).isOperational === true &&
    typeof (error as { status?: unknown }).status === "number" &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

/* Named helpers, so call sites read as intent rather than as numbers. */
export const badRequest = (message = "Bad request", errors?: unknown) =>
  new AppError(400, message, errors);
export const unauthorized = (message = "Authentication required") => new AppError(401, message);
export const forbidden = (message = "You do not have access to this") => new AppError(403, message);
export const notFound = (message = "Not found") => new AppError(404, message);
export const conflict = (message = "Conflict", errors?: unknown) =>
  new AppError(409, message, errors);
export const tooManyRequests = (message = "Too many requests") => new AppError(429, message);
