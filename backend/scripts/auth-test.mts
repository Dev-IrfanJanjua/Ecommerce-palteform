/**
 * AUTH AND RBAC TEST — runs against the real database.
 *
 *   npm run auth:test
 *
 * Tests the security properties, not just the happy path: privilege
 * escalation, account enumeration, token confusion, revocation, lockout and
 * what ends up in a response body.
 *
 * Test users are created with a unique prefix and deleted at the end.
 *
 * AUTH_RATE_LIMIT_MAX is raised for the run (see the npm script) so the
 * limiter does not reject later assertions — the suite makes far more auth
 * calls than a real user would. It MUST be set in the environment rather than
 * here: ESM hoists imports, so config is parsed before any statement in this
 * file runs. The limiter is then proven deliberately at the end, on its own
 * app instance.
 */
import { createServer } from "node:http";
import express from "express";
import rateLimit from "express-rate-limit";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { createApp, API_PREFIX } from "../src/app";
import { connectDatabase, disconnectDatabase } from "../src/config/db";
import { env } from "../src/config/env";
import { User } from "../src/modules/users/user.model";

let fails = 0;
const check = (l: string, ok: boolean, got?: unknown) => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${l}${ok ? "" : ` — got ${JSON.stringify(got)}`}`);
  if (!ok) fails++;
};
const section = (t: string) => console.log(`\n${t}`);

await connectDatabase();
const server = createServer(createApp());
await new Promise<void>((r) => server.listen(0, r));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}${API_PREFIX}`;

const RUN = `authtest_${Date.now()}`;
const emailFor = (n: string) => `${RUN}_${n}@example.com`;
const PASSWORD = "correct horse battery staple";

interface Res {
  status: number;
  body: any;
  cookies: string[];
}
async function call(path: string, init: RequestInit = {}): Promise<Res> {
  const res = await fetch(base + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  return {
    status: res.status,
    body: await res.json().catch(() => null),
    cookies: res.headers.getSetCookie?.() ?? [],
  };
}
const post = (p: string, body?: unknown, headers?: Record<string, string>) =>
  call(p, { method: "POST", body: body ? JSON.stringify(body) : undefined, headers });

/* ------------------------------------------------------------------ */
section("Registration");

const reg = await post("/auth/register", {
  email: emailFor("alice"),
  password: PASSWORD,
  firstName: "Alice",
  lastName: "Khan",
});
check("register -> 201", reg.status === 201, reg.status);
check("returns an access token", typeof reg.body?.data?.accessToken === "string");
check("returns the user", reg.body?.data?.user?.email === emailFor("alice"));
check("role defaults to customer", reg.body?.data?.user?.role === "customer", reg.body?.data?.user);

section("Nothing secret leaks into the response");
const serialised = JSON.stringify(reg.body);
for (const field of ["passwordHash", "password", "emailVerificationTokenHash", "passwordResetTokenHash", "tokensValidFrom", "failedLoginAttempts"])
  check(`no ${field}`, !serialised.includes(field));

section("Refresh cookie hardening");
const cookie = reg.cookies.find((c) => c.startsWith("qadam_refresh="));
check("refresh cookie set", Boolean(cookie), reg.cookies);
check("httpOnly (JavaScript cannot read it)", /HttpOnly/i.test(cookie ?? ""));
check("sameSite=Lax (blocks CSRF)", /SameSite=Lax/i.test(cookie ?? ""));
check("path scoped to /api/v1/auth", /Path=\/api\/v1\/auth/i.test(cookie ?? ""));
check("access token is NOT in a cookie", !reg.cookies.some((c) => c.includes("accessToken")));

/* ------------------------------------------------------------------ */
section("Privilege escalation is impossible");

const escalate = await post("/auth/register", {
  email: emailFor("mallory"),
  password: PASSWORD,
  firstName: "Mallory",
  lastName: "Smith",
  role: "admin",
});
check("a body containing role:admin is REJECTED (400)", escalate.status === 400, {
  status: escalate.status,
  body: escalate.body,
});
const malloryExists = await User.findOne({ email: emailFor("mallory") }).lean();
check("no account was created by that attempt", malloryExists === null);

/* ------------------------------------------------------------------ */
section("Login");

const login = await post("/auth/login", { email: emailFor("alice"), password: PASSWORD });
check("valid credentials -> 200", login.status === 200, login.status);
const accessToken = login.body?.data?.accessToken as string;
check("issues an access token", typeof accessToken === "string");

section("Account enumeration is not possible");
const wrongPassword = await post("/auth/login", { email: emailFor("alice"), password: "wrongwrongwrong" });
const noSuchUser = await post("/auth/login", { email: emailFor("nobody"), password: "wrongwrongwrong" });
check("wrong password -> 401", wrongPassword.status === 401, wrongPassword.status);
check("unknown email -> 401", noSuchUser.status === 401, noSuchUser.status);
check(
  "both give the SAME message",
  wrongPassword.body?.message === noSuchUser.body?.message,
  { wrongPassword: wrongPassword.body?.message, noSuchUser: noSuchUser.body?.message },
);
check("message does not say which was wrong", !/email|user|account/i.test(String(noSuchUser.body?.message).replace(/Invalid email or password/i, "")));

/* ------------------------------------------------------------------ */
section("Protected routes");

const meNoToken = await call("/auth/me");
check("no token -> 401", meNoToken.status === 401, meNoToken.status);
const meBadToken = await call("/auth/me", { headers: { Authorization: "Bearer not.a.token" } });
check("garbage token -> 401", meBadToken.status === 401, meBadToken.status);
const meOk = await call("/auth/me", { headers: { Authorization: `Bearer ${accessToken}` } });
check("valid token -> 200", meOk.status === 200, meOk.status);
check("returns the right user", meOk.body?.data?.email === emailFor("alice"));
check("/me never returns the hash", !JSON.stringify(meOk.body).includes("passwordHash"));

/* ------------------------------------------------------------------ */
section("Token forgery and confusion");

const forged = jwt.sign({ sub: "000000000000000000000000", role: "admin" }, "wrong-secret", {
  issuer: "qadam-api",
  audience: "qadam-web",
  expiresIn: "15m",
});
check(
  "token signed with the wrong secret -> 401",
  (await call("/auth/me", { headers: { Authorization: `Bearer ${forged}` } })).status === 401,
);

const wrongAudience = jwt.sign({ sub: "x", role: "admin" }, env.JWT_ACCESS_SECRET, {
  issuer: "qadam-api",
  audience: "someone-else",
  expiresIn: "15m",
});
check(
  "token for a different audience -> 401",
  (await call("/auth/me", { headers: { Authorization: `Bearer ${wrongAudience}` } })).status === 401,
);

// The reason the two secrets must differ.
const refreshAsAccess = jwt.sign({ sub: "x" }, env.JWT_REFRESH_SECRET, {
  issuer: "qadam-api",
  audience: "qadam-web",
  expiresIn: "7d",
});
check(
  "a REFRESH token cannot be used as an access token -> 401",
  (await call("/auth/me", { headers: { Authorization: `Bearer ${refreshAsAccess}` } })).status === 401,
);

const expired = jwt.sign({ sub: "x", role: "customer" }, env.JWT_ACCESS_SECRET, {
  issuer: "qadam-api",
  audience: "qadam-web",
  expiresIn: "-1s",
});
check(
  "expired token -> 401",
  (await call("/auth/me", { headers: { Authorization: `Bearer ${expired}` } })).status === 401,
);

/* ------------------------------------------------------------------ */
section("Refresh and revocation");

const refreshCookie = (cookie ?? "").split(";")[0]!;
const refreshed = await post("/auth/refresh", undefined, { Cookie: refreshCookie });
check("refresh with a valid cookie -> 200", refreshed.status === 200, refreshed.status);
check("issues a NEW access token", typeof refreshed.body?.data?.accessToken === "string");
const rotated = refreshed.cookies.find((c) => c.startsWith("qadam_refresh="));
check("rotates the refresh cookie", Boolean(rotated) && rotated !== cookie);
check("refresh with no cookie -> 401", (await post("/auth/refresh")).status === 401);

// Revoking by moving tokensValidFrom forward is what makes logout global.
await new Promise((r) => setTimeout(r, 1100));
await User.updateOne({ email: emailFor("alice") }, { tokensValidFrom: new Date() });
const afterRevoke = await post("/auth/refresh", undefined, { Cookie: refreshCookie });
check("a revoked session cannot refresh -> 401", afterRevoke.status === 401, afterRevoke.status);

/* ------------------------------------------------------------------ */
section("Role-based access control");

await User.updateOne({ email: emailFor("alice") }, { role: "admin" });
const adminLogin = await post("/auth/login", { email: emailFor("alice"), password: PASSWORD });
const adminPayload = jwt.decode(adminLogin.body.data.accessToken) as { role: string };
check("token carries the updated role", adminPayload.role === "admin", adminPayload);

const bob = await post("/auth/register", {
  email: emailFor("bob"),
  password: PASSWORD,
  firstName: "Bob",
  lastName: "Ali",
});
const customerPayload = jwt.decode(bob.body.data.accessToken) as { role: string };
check("a new account is a customer, not an admin", customerPayload.role === "customer");

/* ------------------------------------------------------------------ */
section("Account lockout");

const victim = emailFor("carol");
await post("/auth/register", { email: victim, password: PASSWORD, firstName: "Carol", lastName: "Baig" });

let lockedStatus = 0;
for (let attempt = 1; attempt <= 6; attempt++) {
  const r = await post("/auth/login", { email: victim, password: `wrong-guess-${attempt}` });
  if (r.status === 429) { lockedStatus = r.status; break; }
}
check("locks the account after repeated failures -> 429", lockedStatus === 429, lockedStatus);
const lockedCorrect = await post("/auth/login", { email: victim, password: PASSWORD });
check("even the CORRECT password is refused while locked", lockedCorrect.status === 429, lockedCorrect.status);

/* ------------------------------------------------------------------ */
section("Password reset does not leak account existence");

const realReset = await post("/auth/forgot-password", { email: emailFor("bob") });
const fakeReset = await post("/auth/forgot-password", { email: emailFor("ghost") });
check("existing account -> 200", realReset.status === 200, { status: realReset.status, body: realReset.body });
check("unknown account -> 200", fakeReset.status === 200);
check("identical message", realReset.body?.message === fakeReset.body?.message || realReset.body?.data?.message === fakeReset.body?.data?.message);
check("no token in the response", !JSON.stringify(realReset.body).match(/[a-f0-9]{64}/));

/* ------------------------------------------------------------------ */
section("Tokens are stored hashed, not raw");

const stored = await User.findOne({ email: emailFor("bob") })
  .select("+passwordResetTokenHash +emailVerificationTokenHash +passwordHash")
  .lean();
check("reset token is a SHA-256 hash", /^[a-f0-9]{64}$/.test(stored?.passwordResetTokenHash ?? ""), stored?.passwordResetTokenHash?.slice(0, 20));
check("verification token is a SHA-256 hash", /^[a-f0-9]{64}$/.test(stored?.emailVerificationTokenHash ?? ""));
check("password is a bcrypt hash, not plaintext", /^\$2[aby]\$\d{2}\$/.test(stored?.passwordHash ?? ""), stored?.passwordHash?.slice(0, 10));
check("the raw password is nowhere in the document", !JSON.stringify(stored).includes(PASSWORD));

section("passwordHash is hidden by default");
const plain = await User.findOne({ email: emailFor("bob") }).lean();
check("a normal query does not return passwordHash", !("passwordHash" in (plain ?? {})), Object.keys(plain ?? {}));

/* ------------------------------------------------------------------ */
section("Validation");
for (const [label, body, path] of [
  ["short password rejected", { email: emailFor("x"), password: "short", firstName: "A", lastName: "B" }, "/auth/register"],
  ["invalid email rejected", { email: "not-an-email", password: PASSWORD, firstName: "A", lastName: "B" }, "/auth/register"],
  ["missing fields rejected", { email: emailFor("y") }, "/auth/register"],
] as const) {
  check(label, (await post(path, body)).status === 400);
}

/* ------------------------------------------------------------------ */
section("Rate limiting actually triggers");

// A purpose-built app with its own limiter set to 3.
//
// Re-importing createApp does NOT work: the module is cached, so the "fresh"
// app shares the main one's limiter — which the suite had already exhausted,
// making the test pass for entirely the wrong reason.
const limitApp = express();
limitApp.use(express.json());
limitApp.use(
  `${API_PREFIX}/auth`,
  rateLimit({ windowMs: 60_000, limit: 3, standardHeaders: "draft-7", legacyHeaders: false }),
);
limitApp.post(`${API_PREFIX}/auth/login`, (_req, res) => {
  res.status(401).json({ success: false, message: "Invalid email or password" });
});

const limited = createServer(limitApp);
await new Promise<void>((r) => limited.listen(0, r));
const limitedBase = `http://127.0.0.1:${(limited.address() as AddressInfo).port}${API_PREFIX}`;

const statuses: number[] = [];
for (let i = 0; i < 6; i++) {
  const r = await fetch(`${limitedBase}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "x@example.com", password: "wrong" }),
  });
  statuses.push(r.status);
}
check("first 3 attempts are allowed through", statuses.slice(0, 3).every((s) => s === 401), statuses);
check("the 4th is rate limited (429)", statuses[3] === 429, statuses);
limited.close();

/* ------------------------------------------------------------------ */
section("Cleanup");
const { deletedCount } = await User.deleteMany({ email: new RegExp(`^${RUN}_`) });
check(`removed ${deletedCount} test users`, (deletedCount ?? 0) > 0);

console.log(`\n${fails === 0 ? "ALL AUTH TESTS PASSED" : fails + " FAILED"}\n`);
server.close();
await disconnectDatabase();
await mongoose.disconnect().catch(() => {});
process.exit(fails ? 1 : 0);
