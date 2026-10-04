---
name: auth-jwt-rbac
description: Implement and review authentication and authorization for the E-Commerce project, including JWT access and refresh tokens, bcrypt password hashing, httpOnly cookies, email verification, forgot/reset password, role-based access control (customer, admin), Helmet, CORS and rate limiting. Use this skill whenever the user mentions login, register, tokens, sessions, passwords, roles, protected routes, admin-only endpoints, security headers or auth bugs, even if they do not say "JWT".
---

# Authentication and RBAC

## Design (decided, follow it)

| | Access token | Refresh token |
| --- | --- | --- |
| Lifetime | 15 minutes | 7 days |
| Sent as | `Authorization: Bearer <token>` header | `httpOnly`, `secure`, `sameSite` cookie |
| Frontend storage | In memory only (never localStorage) | Browser cookie jar (JS cannot read it) |
| Server state | None (stateless) | Hash stored in DB or Redis so it can be revoked |
| Secret | `JWT_ACCESS_SECRET` | `JWT_REFRESH_SECRET` (different value) |

Why: a short-lived access token limits damage if stolen; the refresh token lets users stay signed in and can be revoked on logout or suspected theft. Keeping the access token out of localStorage protects it from XSS.

JWT payload contains only `sub` (user id), `role` and standard `exp`/`iat`. Never put passwords, emails or card data in it: the payload is readable by anyone.

## Endpoints

| Route | Purpose |
| --- | --- |
| `POST /auth/register` | Create user (role forced to `customer`), hash password, send verification email via queue |
| `POST /auth/login` | Verify password, issue access token + set refresh cookie |
| `POST /auth/refresh` | Verify refresh cookie, rotate it, issue a new access token |
| `POST /auth/logout` | Delete stored refresh token, clear cookie |
| `GET /auth/verify-email/:token` | Mark email verified |
| `POST /auth/forgot-password` | Always respond 200 with the same message (do not reveal whether the email exists) |
| `POST /auth/reset-password/:token` | Set new password, revoke all refresh tokens |

## Passwords

```typescript
const hash = await bcrypt.hash(password, 12);
const ok = await bcrypt.compare(input, user.passwordHash);
```

- Store only `passwordHash` with `select: false` in the schema.
- Use the same generic error for wrong email and wrong password: `"Invalid email or password"`.
- Enforce a minimum length (8+) in the Zod schema.

## One-time tokens (verify email, reset password)

Generate with `crypto.randomBytes(32).toString("hex")`, email the raw token inside a link, store only its SHA-256 hash plus an expiry (24h for verification, 1h for reset), and delete it after use. Compare hashes, check expiry, make it single-use.

## Middleware

```typescript
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next(new AppError(401, "Not authenticated"));
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = { id: payload.sub as string, role: payload.role };
    next();
  } catch {
    next(new AppError(401, "Invalid or expired token"));
  }
};

export const authorize = (...roles: Role[]): RequestHandler => (req, _res, next) =>
  roles.includes(req.user!.role) ? next() : next(new AppError(403, "Forbidden"));
```

- 401 means "who are you?" (missing or bad token). 403 means "I know you, but no."
- Always add ownership checks in services: `Order.findOne({ _id, user: req.user.id })`, not just `findById`.
- Never accept `role` from a registration or profile-update body.

## Frontend refresh flow

On a 401 from the API, call `POST /auth/refresh` once (with `credentials: "include"`), store the new access token in memory, and retry the original request. If refresh fails, clear auth state and redirect to login. Queue concurrent requests behind a single refresh call.

## Hardening checklist

- `helmet()` enabled; `cors({ origin: env.FRONTEND_URL, credentials: true })` with an explicit origin, never `*` with credentials.
- Rate limit `login`, `register`, `forgot-password` (for example 5 attempts per 15 minutes per IP + email), backed by Redis in production.
- Strip `$`-prefixed keys from input or validate types with Zod to block NoSQL operator injection.
- Cookies: `httpOnly: true`, `secure: true` in production, `sameSite: "lax"` (or `"none"` only if frontend and API are on different sites and HTTPS).
- Compare secrets with constant-time functions where applicable; never log tokens or passwords.
- Lock or slow down accounts after repeated failed logins.
- Review against the OWASP Top 10 (broken access control, injection, auth failures) before calling a feature done.
