# Learning Roadmap — E-Commerce Platform

A beginner-friendly path through every tool in the blueprint.
Companion to [REQUIREMENTS.md](REQUIREMENTS.md).

**Rule of thumb:** learn each tool *just enough to use it in the next feature*,
then move on. Do not try to "finish" a tool before writing code with it.

---

## Phase 0 — Foundations (do this before Step 1)

You cannot skip these. Everything else sits on top.

| Topic | Why you need it | Where to learn |
|---|---|---|
| HTML + CSS | Every page is HTML; Tailwind is CSS | [MDN HTML](https://developer.mozilla.org/en-US/docs/Learn_web_development) · [web.dev/learn/css](https://web.dev/learn/css) |
| JavaScript (ES2015+) | The language of the whole project | [javascript.info](https://javascript.info) — the single best free resource |
| Async JS: promises, `async/await`, `fetch` | Every DB call and API call is async | javascript.info, "Promises, async/await" chapter |
| Git + GitHub basics | Required by the blueprint (Step 16) | [Learn Git Branching](https://learngitbranching.js.org) (interactive) |
| Terminal basics | `cd`, `ls`, `npm`, running servers | Any "command line crash course" |
| HTTP: methods, status codes, headers, JSON | REST APIs are just HTTP | [MDN HTTP overview](https://developer.mozilla.org/en-US/docs/Web/HTTP) |

**Time estimate:** 3–5 weeks if you are starting from zero.

---

## Phase 1 — Frontend and UI (Blueprint Step 1)

### Concepts to understand first
- **Component** — a reusable function that returns UI.
- **Props** — inputs passed into a component.
- **State** — data that changes over time and re-renders the UI.
- **Client vs. server rendering** — Next.js renders some pages on the server.

### Tools

| Tool | What it is | Learn from |
|---|---|---|
| **React** | Library for building UI out of components | [react.dev/learn](https://react.dev/learn) — official, excellent |
| **Next.js** | A framework on top of React: routing, server rendering, API routes | [nextjs.org/learn](https://nextjs.org/learn) — free official course |
| **TypeScript** | JavaScript + type checking; catches bugs before you run | [typescriptlang.org/docs/handbook](https://www.typescriptlang.org/docs/handbook/intro.html) |
| **Tailwind CSS** | Style with utility classes in your HTML | [tailwindcss.com/docs](https://tailwindcss.com/docs) |
| **shadcn/ui** | Copy-paste accessible components built on Tailwind | [ui.shadcn.com](https://ui.shadcn.com) |
| **React Hook Form** | Manages form state and validation efficiently | [react-hook-form.com](https://react-hook-form.com) |
| **Zod** | Describes the *shape* of data and validates it | [zod.dev](https://zod.dev) |
| **TanStack Query** | Fetches server data, caches it, refetches it | [tanstack.com/query](https://tanstack.com/query/latest) |
| **Redux Toolkit** | Global client state (cart, UI state) | [redux-toolkit.js.org/tutorials](https://redux-toolkit.js.org/tutorials/quick-start) |
| **Framer Motion** | Animations | [motion.dev](https://motion.dev) |

### Key distinction to internalize
**TanStack Query = server state** (products from the API — it can go stale, needs refetching).
**Redux Toolkit = client state** (is the cart drawer open, what's the current theme).
Beginners overuse Redux. Reach for TanStack Query first.

### Build in this phase
Product listing, product details, search UI, filters/sorting, categories, variants,
wishlist, cart, checkout UI, order history, profile — all with **fake/mock data**.

---

## Phase 2 — Backend and REST APIs (Steps 2–3)

### Concepts
- **REST** — resources (`/products`) + HTTP verbs (GET/POST/PUT/DELETE).
- **Middleware** — a function that runs before your route handler (auth check, logging).
- **Schema / Model** — the shape of a document in MongoDB, enforced by Mongoose.
- **Index** — a lookup structure that makes queries fast. Without one, MongoDB scans every document.
- **Transaction** — several writes that all succeed or all fail together (e.g. reduce stock *and* create order).

### Tools

| Tool | What it is | Learn from |
|---|---|---|
| **Node.js** | Runs JavaScript outside the browser | [nodejs.org/docs/latest/api](https://nodejs.org/docs/latest/api/) |
| **Express.js** | Minimal web framework for building HTTP APIs | [expressjs.com](https://expressjs.com) |
| **MongoDB** | Document database — stores JSON-like documents | [MongoDB University](https://learn.mongodb.com) — free courses |
| **Mongoose** | Adds schemas, validation, and relations on top of MongoDB | [mongoosejs.com/docs](https://mongoosejs.com/docs/guide.html) |

### Build in this phase
The `src/modules/*` structure from the blueprint. Each module gets
`*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.model.ts`, `*.validation.ts`.
Add pagination, filtering, sorting, central error handling.

---

## Phase 3 — Authentication and RBAC (Step 4)

### Concepts
- **Hashing vs. encryption** — bcrypt hashing is *one-way*. You never "decrypt" a password; you hash the attempt and compare.
- **JWT** — a signed token carrying claims (`userId`, `role`). The server verifies the signature instead of a DB lookup.
- **Access token** — short-lived (~15 min), sent with every request.
- **Refresh token** — long-lived (~7 days), stored in an httpOnly cookie, used only to get a new access token.
- **Authentication** = who are you. **Authorization (RBAC)** = what are you allowed to do.

### Learn from
- [jwt.io/introduction](https://jwt.io/introduction)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

### Build
Register, login, logout, email verification, forgot/reset password,
`requireAuth` middleware, `requireRole('admin')` middleware.

---

## Phase 4 — Payments (Step 8) ⚠️ The most important section

### Concepts
- **Webhook** — Stripe calls *your* server to report what happened. The reverse of a normal API call.
- **Why webhooks matter:** if the browser marks an order paid, a user can fake it, or close the tab mid-payment and never mark it. Stripe's webhook is the only trustworthy source.
- **Idempotency** — Stripe may send the same webhook twice. Your handler must produce the same result both times.
- **Signature verification** — verify Stripe's signature header, or anyone can POST a fake "paid" event.

### Flow (from the blueprint)
```
Cart → Checkout → Stripe → Webhook → Payment verification → Order confirmation
```

### Learn from
- [stripe.com/docs/payments/quickstart](https://stripe.com/docs/payments/quickstart)
- [stripe.com/docs/webhooks](https://stripe.com/docs/webhooks)
- Stripe CLI — forwards webhooks to `localhost` for testing

Use **test mode** and Stripe's published test card numbers throughout.

---

## Phase 5 — Media, Email, Admin (Steps 9–10)

| Tool | What it is | Learn from |
|---|---|---|
| **Cloudinary** | Hosts and transforms images (resize, compress, format) | [cloudinary.com/documentation](https://cloudinary.com/documentation) |
| **Resend / SendGrid / Nodemailer** | Sends transactional email | [resend.com/docs](https://resend.com/docs) |

**Admin dashboard** = the same stack, different pages, gated by `requireRole('admin')`.
Charts: Recharts or Chart.js. Analytics queries: MongoDB **aggregation pipeline** — worth learning properly.

---

## Phase 6 — Redis, Real-Time, Background Jobs (Steps 11–13)

### Concepts
- **Cache** — store a slow result in fast memory; serve it until it expires (TTL). Key question: *when do I invalidate it?*
- **Rate limiting** — cap requests per IP per window, to resist brute-force and abuse.
- **WebSocket** — a persistent two-way connection, so the server can push to the client.
- **Queue** — hand slow work (sending email, generating a PDF) to a background worker so the HTTP response returns immediately.

| Tool | What it is | Learn from |
|---|---|---|
| **Redis** | In-memory key-value store: caching, rate limits, TTL data | [redis.io/docs](https://redis.io/docs/latest/) |
| **Socket.IO** | Real-time bidirectional events over WebSocket | [socket.io/docs](https://socket.io/docs/v4/) |
| **BullMQ** | Job queue built on Redis: retries, delays, scheduling | [docs.bullmq.io](https://docs.bullmq.io) |

---

## Phase 7 — Testing (Step 14)

### The testing pyramid
- **Unit** — one function in isolation. Fast, many.
- **Integration** — your API + a real test database. Jest + Supertest.
- **End-to-end** — a real browser doing a real checkout. Playwright. Slow, few.

| Tool | Learn from |
|---|---|
| **Jest / Vitest** | [vitest.dev](https://vitest.dev) · [jestjs.io](https://jestjs.io) |
| **Supertest** | [github.com/ladjs/supertest](https://github.com/ladjs/supertest) |
| **React Testing Library** | [testing-library.com/react](https://testing-library.com/docs/react-testing-library/intro/) |
| **Playwright** | [playwright.dev](https://playwright.dev) |

---

## Phase 8 — Security (Step 16)

Read the [OWASP Top 10](https://owasp.org/www-project-top-ten/) once, slowly. It is the industry baseline.

| Control | What it stops |
|---|---|
| bcrypt hashing | Leaked DB → plaintext passwords |
| Input validation (Zod) | Injection, malformed data |
| Helmet | Missing security headers |
| CORS | Unauthorized cross-origin calls |
| Rate limiting | Brute force, credential stuffing |
| httpOnly + Secure cookies | Token theft via XSS |
| File upload validation | Malicious uploads |
| Env vars / secrets | Credentials committed to git |

Never commit `.env`. Add it to `.gitignore` on day one.

---

## Phase 9 — Docker, CI/CD, Deployment (Steps 15–17)

### Concepts
- **Image** — a recipe/snapshot of your app + its dependencies.
- **Container** — a running instance of an image.
- **Docker Compose** — runs several containers together (frontend, backend, MongoDB, Redis) with one command.
- **CI** — on every push, automatically install, lint, test, build.
- **CD** — if CI passes, deploy automatically.

| Tool | Learn from |
|---|---|
| **Docker** | [docs.docker.com/get-started](https://docs.docker.com/get-started/) |
| **GitHub Actions** | [docs.github.com/actions](https://docs.github.com/en/actions) |
| **Vercel** | [vercel.com/docs](https://vercel.com/docs) |
| **Railway / Render** | [docs.railway.com](https://docs.railway.com) · [render.com/docs](https://render.com/docs) |
| **MongoDB Atlas** | [mongodb.com/docs/atlas](https://www.mongodb.com/docs/atlas/) |

---

## Phase 10 — Logging and Monitoring (Step 18)

### Concepts
- **Structured logging** — log JSON, not prose, so it is searchable.
- **Correlation / request ID** — one id threaded through every log line of a request.
- **Error tracking** — Sentry groups exceptions and gives you a stack trace with context.
- **Metrics** — counters and timings (Prometheus) drawn on dashboards (Grafana).

| Tool | Learn from |
|---|---|
| **Pino** | [getpino.io](https://getpino.io) |
| **Winston** | [github.com/winstonjs/winston](https://github.com/winstonjs/winston) |
| **Sentry** | [docs.sentry.io](https://docs.sentry.io) |

---

## Suggested pace

| Weeks | Focus |
|---|---|
| 1–5 | Phase 0 — HTML, CSS, JS, Git, HTTP |
| 6–11 | Phase 1 — React, Next.js, TypeScript, Tailwind, frontend with mock data |
| 12–16 | Phases 2–3 — Express, MongoDB, Mongoose, auth, RBAC |
| 17–20 | Phases 4–5 — Stripe, Cloudinary, email, admin dashboard |
| 21–24 | Phase 6 — Redis, Socket.IO, BullMQ |
| 25–28 | Phases 7–8 — testing, security hardening |
| 29–32 | Phases 9–10 — Docker, CI/CD, deploy, monitoring |

Roughly 7–8 months part-time from zero. Faster if you already know JavaScript.

---

## Advice that matters more than the tool list

1. **Build vertical slices.** Pick one feature (products) and take it all the way: model → API → UI → test. Repeat. Do not build "all the models", then "all the APIs".
2. **Commit daily with meaningful messages.** The blueprint grades this (Step 16), and your git history becomes evidence of the work.
3. **Write the README as you go**, not at the end.
4. **Read error messages fully.** The answer is usually in the last line.
5. **Use official docs first.** They are more accurate than most tutorials.
6. **Don't chase perfection in Phase 1.** You will rewrite the frontend once the real API exists. That is normal.
