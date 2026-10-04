---
name: ecommerce-platform
description: Core architecture, stack decisions and conventions for the full-stack E-Commerce Platform project (Next.js + Express + MongoDB + Stripe + Redis). Use this skill whenever working anywhere in this repo, planning a feature, deciding where code belongs, naming files, choosing a library, or asking "what's next" in the build order, even if the user does not mention the blueprint. Read it before starting any new feature so the work stays consistent with the rest of the project.
---

# E-Commerce Platform: project conventions

This is a production-style learning and portfolio project. The goal is not just working features but the full engineering lifecycle: security, tests, Docker, CI/CD, monitoring. When in doubt, choose the option a production team would choose, and explain the reasoning briefly because the developer is still learning (strong HTML/CSS, limited JavaScript).

## Stack (do not swap without asking)

| Area | Choice |
| --- | --- |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, React Hook Form + Zod, TanStack Query, Redux Toolkit (UI/cart state only), Framer Motion |
| Backend | Node.js, Express, TypeScript, Mongoose, REST |
| Database | MongoDB (Atlas in production) |
| Auth | JWT access + refresh tokens, bcrypt, RBAC (`customer`, `admin`) |
| Payments | Stripe Checkout + webhooks |
| Media / email | Cloudinary; Resend (default), SendGrid or Nodemailer |
| Infra | Redis, BullMQ, Socket.IO |
| Quality | Jest, Supertest, Vitest, React Testing Library, Playwright, Pino, Sentry |
| DevOps | Docker, Docker Compose, GitHub Actions; Vercel (frontend), Railway/Render (backend) |

## Repository layout

```
/
├── frontend/          Next.js app
├── backend/
│   └── src/
│       ├── modules/   auth users products categories cart wishlist orders payments inventory coupons notifications
│       ├── common/    middleware validators errors utils
│       ├── config/    env validation, db, redis, stripe, cloudinary
│       ├── database/
│       ├── app.ts     builds the Express app (importable by Supertest)
│       └── server.ts  starts listening
├── docker-compose.yml
└── .github/workflows/
```

Group backend code by feature (module), not by file type. Each module owns its routes, controller, service, model and validators. See the `express-api-module` skill for the exact pattern.

## Rules that apply everywhere

1. **TypeScript strict mode.** No `any` unless commented with a reason.
2. **Never trust the client.** Validate every request body, query and param with Zod on the server, even if the form already validated it.
3. **Secrets live in environment variables.** Validate them once at startup in `config/env.ts` (Zod) and fail fast if missing. Never commit `.env`; keep `.env.example` current.
4. **Money is stored as integer cents**, never floats. Convert only for display.
5. **Orders snapshot prices.** Order items copy name, price and image at purchase time so later product edits do not change history.
6. **Payment truth comes from Stripe webhooks**, never from the frontend.
7. **Slow or fallible work goes to a queue** (email, invoices), never inside the request.
8. **Error shape:** `{ "success": false, "message": "...", "errors"?: [...] }` with correct HTTP status codes.
9. **Success shape:** `{ "success": true, "data": ..., "meta"?: { page, limit, total } }`.
10. **Conventional commits** (`feat:`, `fix:`, `chore:`, `test:`, `docs:`), one feature branch per feature, small pull requests.

## Build order

Follow this order unless the user says otherwise; each phase should work and be committed before the next begins:

1. Frontend and UI
2. REST API skeleton
3. MongoDB and Mongoose
4. Auth and RBAC
5. Products and categories
6. Cart and wishlist
7. Orders and inventory
8. Stripe payments and webhooks
9. Cloudinary and email
10. Admin dashboard
11. Redis caching
12. Socket.IO notifications
13. BullMQ background jobs
14. Testing
15. Docker
16. GitHub Actions CI/CD
17. Deployment
18. Logging, monitoring, performance

## Related skills

- `express-api-module`: scaffolding any backend feature
- `auth-jwt-rbac`: login, tokens, roles
- `stripe-payments-webhooks`: checkout and payment verification
- `nextjs-storefront`: frontend pages, forms and data fetching
- `redis-bullmq-socketio`: caching, queues, real-time
- `testing-quality`: Jest, Supertest, Vitest, Playwright
- `docker-cicd-deploy`: containers, pipelines, deployment, monitoring

## Working with the developer

Explain a new concept in one or two plain sentences the first time it appears (what it is, why it is needed here), then keep going. Prefer small, runnable steps. After generating code, say how to run it and what output to expect.
