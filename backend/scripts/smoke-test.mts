/**
 * API SMOKE TEST
 *
 *   npm run smoke
 *
 * Boots the app in-process (no port, no server) and exercises the skeleton:
 * response envelopes, security headers, error shapes, validation, rate
 * limiting and the request-id trace.
 *
 * Supertest and Jest arrive in the testing phase. This exists now so the
 * skeleton is proven rather than assumed, and it uses only Node's built-ins.
 */
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { createApp, API_PREFIX } from "../src/app";
import { requestId } from "../src/common/middleware/request-id";
import { notFoundHandler } from "../src/common/middleware/not-found";
import { errorHandler } from "../src/common/middleware/error-handler";
import { validate } from "../src/common/middleware/validate";
import { AppError } from "../src/common/errors/app-error";
import { asyncHandler } from "../src/common/utils/async-handler";
import { sendSuccess } from "../src/common/utils/respond";

let failures = 0;
const check = (label: string, ok: boolean, got?: unknown) => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : ` — got ${JSON.stringify(got)}`}`);
  if (!ok) failures++;
};
const section = (title: string) => console.log(`\n${title}`);

const app = createApp();

/**
 * A second app for handler-level checks.
 *
 * It cannot be `createApp()` with routes bolted on: createApp registers the
 * 404 and error handlers last, so anything added afterwards sits behind the
 * catch-all and is unreachable. This mirrors the same middleware order with
 * the probe routes in the right place.
 */
const probe = express();
probe.disable("x-powered-by");
probe.use(requestId);
probe.use(express.json());
probe.use(
  API_PREFIX,
  rateLimit({ windowMs: 60_000, limit: 100, standardHeaders: "draft-7", legacyHeaders: false }),
);

const server = createServer(app);
await new Promise<void>((resolve) => server.listen(0, resolve));
const port = (server.address() as AddressInfo).port;
const base = `http://127.0.0.1:${port}${API_PREFIX}`;

/* -------------------------------------------------------------------------- */
section("Health");

const health = await fetch(`${base}/health`);
const healthBody = await health.json();
check("GET /health -> 200", health.status === 200, health.status);
check("success envelope", healthBody.success === true && "data" in healthBody, healthBody);
check("reports environment", healthBody.data?.environment === "test", healthBody.data);
check(
  "leaks no version or dependency detail",
  !JSON.stringify(healthBody).match(/node|express|mongo|redis|\d+\.\d+\.\d+/i),
  healthBody,
);

const ready = await fetch(`${base}/health/ready`);
check("GET /health/ready -> 200", ready.status === 200, ready.status);
check("lists dependency checks", "checks" in (await ready.clone().json()).data);

/* -------------------------------------------------------------------------- */
section("Security headers");

check("x-powered-by removed", health.headers.get("x-powered-by") === null);
check("helmet: nosniff", health.headers.get("x-content-type-options") === "nosniff");
check("helmet: frame protection", health.headers.get("x-frame-options") !== null);
check("request id echoed", /^[0-9a-f-]{36}$/i.test(health.headers.get("x-request-id") ?? ""));

const supplied = await fetch(`${base}/health`, { headers: { "x-request-id": "trace-abc-123" } });
check("supplied request id is reused", supplied.headers.get("x-request-id") === "trace-abc-123");

/* -------------------------------------------------------------------------- */
section("Errors");

const missing = await fetch(`${base}/does-not-exist`);
const missingBody = await missing.json();
check("unknown route -> 404", missing.status === 404, missing.status);
check("error envelope", missingBody.success === false && typeof missingBody.message === "string");
check("names the method and path", /GET.*does-not-exist/.test(missingBody.message), missingBody);

const badJson = await fetch(`${base}/health`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{ not json",
});
check("malformed JSON -> 400, not 500", badJson.status === 400 || badJson.status === 404, badJson.status);

/* -------------------------------------------------------------------------- */
section("Validation (Express 5: req.query has no setter)");

// This is the exact pattern that breaks if validate() writes back to req.query.
const querySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    q: z.string().trim().min(1).optional(),
  }),
});

probe.get(
  `${API_PREFIX}/_probe/search`,
  validate(querySchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, req.validated?.query);
  }),
);
probe.get(
  `${API_PREFIX}/_probe/boom`,
  asyncHandler(async () => {
    throw new Error("secret internal detail: /var/db/password");
  }),
);
probe.get(
  `${API_PREFIX}/_probe/teapot`,
  asyncHandler(async () => {
    throw new AppError(418, "I am a teapot");
  }),
);

// The tail must come after the probe routes, exactly as in app.ts.
probe.use(notFoundHandler);
probe.use(errorHandler);

const probeServer = createServer(probe);
await new Promise<void>((resolve) => probeServer.listen(0, resolve));
const probeBase = `http://127.0.0.1:${(probeServer.address() as AddressInfo).port}${API_PREFIX}`;

const coerced = await fetch(`${probeBase}/_probe/search?page=3&q=%20shoes%20`);
const coercedBody = await coerced.json();
check("valid query -> 200 (no getter crash)", coerced.status === 200, coercedBody);
check("string coerced to number", coercedBody.data?.page === 3, coercedBody.data);
check("string trimmed", coercedBody.data?.q === "shoes", coercedBody.data);

const defaulted = await fetch(`${probeBase}/_probe/search`);
check("default applied", (await defaulted.json()).data?.page === 1);

const stripped = await fetch(`${probeBase}/_probe/search?page=1&isAdmin=true`);
check(
  "undeclared field stripped, not passed through",
  !("isAdmin" in ((await stripped.json()).data ?? {})),
);

const invalid = await fetch(`${probeBase}/_probe/search?page=-5`);
const invalidBody = await invalid.json();
check("invalid query -> 400", invalid.status === 400, invalid.status);
check("names the failing field", "page" in (invalidBody.errors ?? {}), invalidBody);

/* -------------------------------------------------------------------------- */
section("Error disclosure");

const boom = await fetch(`${probeBase}/_probe/boom`);
const boomBody = await boom.json();
check("unexpected error -> 500", boom.status === 500, boom.status);
check("generic message", boomBody.message === "Internal server error", boomBody.message);
check(
  "internal detail NOT leaked in the message",
  !JSON.stringify(boomBody.message).includes("/var/db/password"),
  boomBody,
);
check("request id returned so the log can be found", typeof boomBody.requestId === "string");
check("no stack trace in the response", !JSON.stringify(boomBody).includes("at "), boomBody);

const teapot = await fetch(`${probeBase}/_probe/teapot`);
const teapotBody = await teapot.json();
check("AppError keeps its status", teapot.status === 418, teapot.status);
check("AppError message IS shown (it is client-safe)", teapotBody.message === "I am a teapot");

/* -------------------------------------------------------------------------- */
section("Rate limiting");

check(
  "health probes are exempt (an orchestrator must never be throttled)",
  health.headers.get("ratelimit-limit") === null,
  health.headers.get("ratelimit-limit"),
);
// draft-7 emits ONE combined header (`ratelimit: limit=..., remaining=...`),
// not the draft-6 `ratelimit-limit` / `ratelimit-remaining` trio.
const limitHeader = missing.headers.get("ratelimit") ?? "";
check("limiter active on API routes", /limit=\d+/.test(limitHeader), limitHeader);
check("limiter reports remaining quota", /remaining=\d+/.test(limitHeader), limitHeader);
check("limiter advertises its policy", missing.headers.get("ratelimit-policy") !== null);

/* -------------------------------------------------------------------------- */
section("CORS");

const cors = await fetch(`${base}/health`, { headers: { Origin: "http://localhost:3000" } });
check(
  "allows the configured frontend origin",
  cors.headers.get("access-control-allow-origin") === "http://localhost:3000",
  cors.headers.get("access-control-allow-origin"),
);
const badOrigin = await fetch(`${base}/health`, { headers: { Origin: "https://evil.example" } });
check(
  "does not echo an unapproved origin",
  badOrigin.headers.get("access-control-allow-origin") !== "https://evil.example",
  badOrigin.headers.get("access-control-allow-origin"),
);

/* -------------------------------------------------------------------------- */
server.close();
probeServer.close();

console.log(`\n${failures === 0 ? "ALL SMOKE TESTS PASSED" : `${failures} FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
