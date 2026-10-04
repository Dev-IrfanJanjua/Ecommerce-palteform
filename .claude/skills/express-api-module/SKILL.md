---
name: express-api-module
description: Scaffold or modify a backend feature module in the Express + TypeScript + Mongoose API (routes, controller, service, model, Zod validators, error handling, pagination, filtering, indexes, transactions). Use this skill whenever the user asks to add or change an endpoint, model, CRUD feature, query filter, pagination or backend logic for products, categories, cart, wishlist, orders, inventory, coupons or users, even if they only say "add an API for X".
---

# Express API module pattern

Every backend feature is a folder under `backend/src/modules/<name>/` with the same files, so any feature is easy to find and test.

```
modules/products/
├── product.model.ts        Mongoose schema + indexes
├── product.validation.ts   Zod schemas for body, query, params
├── product.service.ts      business logic; no req/res
├── product.controller.ts   HTTP only: read req, call service, send res
├── product.routes.ts       route table + middleware chain
└── product.test.ts         Supertest integration tests
```

Why the split: services can be unit-tested and reused (a webhook handler and a controller can call the same `orderService`), while controllers stay thin.

## Steps to add a module

1. **Model.** Schema with `required`, `min`, `trim`, `enum`, `{ timestamps: true }`. Index every field used in filters or sorts, and add unique indexes where needed. Money as integer cents.
2. **Validation.** Zod schemas for create, update (partial) and list query. Coerce query strings with `z.coerce.number()`.
3. **Service.** Async functions that throw `AppError` for expected failures (`new AppError(404, "Product not found")`). Never import `Request` or `Response` here.
4. **Controller.** Wrap handlers in `asyncHandler` so rejected promises reach the error middleware.
5. **Routes.** Chain: `authenticate`, then `authorize(...)`, then `validate(schema)`, then controller. Public reads need no auth.
6. **Register** the router in `app.ts` under `/api/v1/<plural-noun>`.
7. **Tests.** At minimum: happy path, validation failure (400), unauthenticated (401), wrong role (403), not found (404).

## Shared building blocks (in `common/`)

```typescript
// errors/AppError.ts
export class AppError extends Error {
  constructor(public status: number, message: string, public errors?: unknown) {
    super(message);
  }
}

// utils/asyncHandler.ts
export const asyncHandler =
  (fn: RequestHandler): RequestHandler => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// middleware/validate.ts
export const validate = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
  if (!result.success) return next(new AppError(400, "Validation failed", result.error.flatten()));
  Object.assign(req, result.data);
  next();
};

// middleware/errorHandler.ts  (register LAST in app.ts)
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = err instanceof AppError ? err.status : 500;
  if (status === 500) logger.error({ err }, "Unhandled error"); // also report to Sentry
  res.status(status).json({
    success: false,
    message: status === 500 ? "Internal server error" : err.message,
    errors: err.errors,
  });
};
```

Never leak stack traces or internal messages on 500 responses.

## Pagination, filtering, sorting

- Accept `page` (default 1), `limit` (default 20, cap 100), `sort` (whitelist such as `price`, `-createdAt`) and explicit filters (`category`, `minPrice`, `maxPrice`, `q`).
- Never pass `req.query` straight into `Model.find()`. That allows NoSQL injection. Build the filter from validated fields only.
- Return `meta: { page, limit, total, totalPages }`.
- Use `.lean()` for read-only list queries.

## Transactions

Use a Mongo transaction whenever two or more writes must succeed together (create order, decrement stock, clear cart):

```typescript
const session = await mongoose.startSession();
try {
  await session.withTransaction(async () => {
    const updated = await Product.updateOne(
      { _id, stock: { $gte: qty } },        // guard against overselling
      { $inc: { stock: -qty } },
      { session }
    );
    if (updated.modifiedCount === 0) throw new AppError(409, "Out of stock");
    await Order.create([orderData], { session });
  });
} finally {
  await session.endSession();
}
```

Transactions need a replica set. MongoDB Atlas has one; for local Docker, start Mongo with `--replSet rs0` and initiate it.

## Security checklist for every endpoint

- Authenticated and authorized as narrowly as possible; check ownership (a customer reads only their own orders).
- Input validated with Zod; unknown fields stripped.
- Rate limited if it is login, register, forgot-password or another abuse-prone route.
- No sensitive fields in responses (`select: false` on `passwordHash` and tokens).
