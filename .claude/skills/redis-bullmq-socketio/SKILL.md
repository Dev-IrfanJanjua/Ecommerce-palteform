---
name: redis-bullmq-socketio
description: Add caching, rate limiting, background jobs and real-time features to the E-Commerce backend using Redis, BullMQ and Socket.IO. Use this skill whenever the user mentions cache, Redis, rate limit, OTP expiry, queue, worker, background job, retry, delayed job, email sending, invoice generation, real-time updates, notifications, WebSocket or live order status, even if they just say "send the email later" or "make the product list faster".
---

# Redis, BullMQ and Socket.IO

## Redis: one shared client

Create a single `ioredis` client in `config/redis.ts` from `REDIS_URL`. Export it, and give BullMQ its own connection options (BullMQ requires `maxRetriesPerRequest: null`). Log connection errors, and let the app keep working (without cache) if Redis is down where safe.

### Use cases and key conventions

Name keys `<domain>:<id>:<detail>` so they are easy to find and invalidate.

| Use | Key | TTL |
| --- | --- | --- |
| Product list/detail cache | `cache:products:list:<hash of filters>`, `cache:products:<id>` | 60-300 s |
| Rate limiting | `rl:<route>:<ip>` | window length |
| Email verification / OTP | `otp:<userId>` (store a hash) | 10 minutes |
| Refresh-token allowlist | `rt:<userId>:<tokenId>` | 7 days |

### Cache-aside pattern

```typescript
export async function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit) as T;
  const value = await load();
  await redis.set(key, JSON.stringify(value), "EX", ttl);
  return value;
}
```

**Invalidate on write.** When an admin creates, updates or deletes a product, delete the affected keys (use a version prefix or `SCAN` with a pattern, never `KEYS` in production). A stale price shown to a customer is worse than a slow page, so never cache cart totals, stock-at-checkout or anything user-specific without the user id in the key.

### Rate limiting

Use `rate-limit-redis` with `express-rate-limit`. Suggested limits: global 100 requests per 15 minutes per IP; auth routes 5 per 15 minutes; password reset 3 per hour. Return 429 with a `Retry-After` header.

## BullMQ: background jobs

Use a queue when the work is slow, can fail, or does not need to block the response.

```
backend/src/queues/
├── connection.ts
├── email.queue.ts       add jobs
├── email.worker.ts      process jobs
└── index.ts
backend/src/worker.ts    entry point that starts workers (run as its own process/container)
```

```typescript
export const emailQueue = new Queue("email", { connection });

await emailQueue.add("order-confirmation", { orderId }, {
  attempts: 5,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
});

new Worker("email", async (job) => {
  switch (job.name) {
    case "order-confirmation": return sendOrderConfirmation(job.data.orderId);
    case "verify-email":       return sendVerification(job.data.userId);
  }
}, { connection, concurrency: 5 });
```

Rules:

- **Pass ids, not whole objects.** The worker loads fresh data, so retries never send stale content.
- **Make jobs idempotent.** A retry must not send two emails or generate two invoices. Use a deterministic `jobId` (for example `order-confirmation:<orderId>`) so duplicates are ignored.
- Run workers in a separate process so slow jobs never affect API latency.
- Handle `failed` events: log with Sentry, and keep failed jobs for inspection.
- Delayed jobs: abandoned-cart reminder (`delay: 24h`), low-stock alerts, pending-order expiry.
- Optional: Bull Board for a job dashboard, protected by admin auth.

## Socket.IO: real-time

Attach to the same HTTP server as Express. Authenticate every connection with the access token.

```typescript
const io = new Server(httpServer, { cors: { origin: env.FRONTEND_URL, credentials: true } });

io.use((socket, next) => {
  try {
    const payload = jwt.verify(socket.handshake.auth.token, env.JWT_ACCESS_SECRET) as JwtPayload;
    socket.data.user = { id: payload.sub, role: payload.role };
    next();
  } catch { next(new Error("unauthorized")); }
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.data.user.id}`);
  if (socket.data.user.role === "admin") socket.join("admins");
});
```

Emit from services through a small `notify` helper (not directly from controllers):

```typescript
io.to(`user:${order.user}`).emit("order:updated", { orderId, status });
io.to("admins").emit("order:new", { orderId, total });
```

Event names: `domain:action` (`order:updated`, `stock:low`, `notification:new`). Persist important notifications in MongoDB too, because sockets only reach users who are online.

On the client, connect once in a provider, listen in hooks, and on events call `queryClient.invalidateQueries` so TanStack Query refetches the truth.

If the API runs on more than one instance, add the Redis adapter (`@socket.io/redis-adapter`) so events reach sockets on every instance.
