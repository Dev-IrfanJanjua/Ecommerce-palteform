---
name: testing-quality
description: Write and run tests for the E-Commerce project with Jest, Supertest, Vitest, React Testing Library and Playwright, plus linting and API documentation with Swagger/OpenAPI. Use this skill whenever the user asks to add tests, fix a failing test, test an endpoint, component, auth flow, cart, checkout or payment, set up test databases or mocks, write an end-to-end test, document the API, or says "does this work?" about new code that has no tests yet.
---

# Testing and quality

Test the behaviour users and API clients rely on, not implementation details. A test that breaks when you rename a private function is a bad test; a test that breaks when checkout charges the wrong amount is a good one.

## Pyramid and tools

| Level | Tool | Scope | Quantity |
| --- | --- | --- | --- |
| Unit | Jest (backend), Vitest (frontend) | pure functions: totals, coupon math, status transitions | many |
| Integration | Jest + Supertest | an endpoint through middleware, service and real test DB | a good number |
| Component | React Testing Library + Vitest | one component as a user sees it | some |
| End-to-end | Playwright | full user journeys in a real browser | few, critical flows |

## Backend setup

- Jest with `ts-jest` (or `@swc/jest`). Separate scripts: `test:unit`, `test:integration`.
- `app.ts` exports the Express app without calling `listen`, so Supertest can use it.
- Use `mongodb-memory-server` (replica-set mode, so transactions work) or a disposable Mongo container for integration tests. Clear collections `beforeEach`, never run tests against the dev or production database.
- Mock external services at the boundary: Stripe client, Resend, Cloudinary, BullMQ queues. Never make real network calls in tests.

```typescript
describe("POST /api/v1/orders/checkout", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app).post("/api/v1/orders/checkout").send({});
    expect(res.status).toBe(401);
  });

  it("ignores client-supplied prices", async () => {
    const { token, product } = await seedCustomerWithCart();
    const res = await request(app)
      .post("/api/v1/orders/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ productId: product.id, quantity: 1, priceCents: 1 }] });
    expect(res.status).toBe(201);
    expect(res.body.data.order.totalCents).toBe(product.priceCents);
  });
});
```

Provide test helpers (`createUser`, `loginAs`, `seedProducts`) in `tests/helpers/` instead of repeating setup.

## Cases every endpoint needs

Success; validation error (400); no token (401); wrong role (403); someone else's resource (403/404); not found (404); and, for writes, the effect on the database.

## Must-test flows from the blueprint

Registration and login, token refresh and logout, role protection on admin routes, product listing with filters and pagination, cart operations, checkout creating a `pending` order, **Stripe webhook** (valid signature marks paid and reduces stock once; invalid signature returns 400; duplicate event is ignored), order status transitions, stock never going negative, admin product CRUD.

## Frontend tests (Vitest + React Testing Library)

- Query by role and visible text (`getByRole("button", { name: /add to cart/i })`), not by class names.
- Wrap with the providers the component needs (QueryClient, store). Mock the network with MSW rather than mocking `fetch` by hand.
- Use `userEvent` for typing and clicking; assert on what the user sees (error messages, disabled button, updated count).

## Playwright end-to-end

- Run against a seeded test environment (Docker Compose test profile).
- Critical journeys: browse and search, add to cart, register and login, checkout to Stripe test mode (or intercept the redirect and trigger the webhook via API), view order history, admin creates a product.
- Prefer role-based locators, avoid fixed `waitForTimeout`, rely on auto-waiting and `expect(...).toBeVisible()`.
- Save traces on failure (`trace: "retain-on-failure"`) and upload them in CI.

## Quality gates

- ESLint + Prettier on both apps; `tsc --noEmit` must pass.
- Run lint, type-check and tests in GitHub Actions on every pull request (see `docker-cicd-deploy`).
- Coverage is a signal, not a goal: aim for high coverage on services, auth and payments rather than a global number.

## API documentation (Swagger / OpenAPI)

- Use `swagger-jsdoc` + `swagger-ui-express`, served at `/api/docs` (disable or protect in production if needed).
- Document each route: summary, auth requirement (bearer), request schema, response schema, error codes. Keep schemas close to the Zod validators so docs and validation do not drift (`zod-to-openapi` can generate them).
- Add a docs check to the definition of done for a new endpoint.
