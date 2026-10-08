import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { Response } from "express";
import { env, isProduction } from "@/config/env";
import type { Role } from "@/modules/users/user.model";

/**
 * TOKEN SERVICE
 *
 * All token creation, verification and cookie handling in one place, so the
 * security decisions are reviewable together rather than scattered.
 */

export const REFRESH_COOKIE = "qadam_refresh";

/**
 * JWT payload.
 *
 * Only an id and a role. A JWT is signed, NOT encrypted — anyone holding it
 * can read the payload. Email, name or anything personal would be disclosed to
 * whoever intercepts it.
 */
export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

export interface RefreshTokenPayload {
  sub: string;
  /** Rotation id, so a reused old token is detectable. */
  jti: string;
}

/* -------------------------------------------------------------------------- */
/* Access tokens                                                              */
/* -------------------------------------------------------------------------- */

export function signAccessToken(userId: string, role: Role): string {
  return jwt.sign({ sub: userId, role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
    issuer: "qadam-api",
    audience: "qadam-web",
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  // Pinning issuer and audience stops a token minted for another service
  // (or another environment) being accepted here.
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: "qadam-api",
    audience: "qadam-web",
  }) as jwt.JwtPayload;

  return { sub: String(payload.sub), role: payload.role as Role };
}

/* -------------------------------------------------------------------------- */
/* Refresh tokens                                                             */
/* -------------------------------------------------------------------------- */

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, jti: randomBytes(16).toString("hex") }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
    issuer: "qadam-api",
    audience: "qadam-web",
  } as SignOptions);
}

export function verifyRefreshToken(token: string): RefreshTokenPayload & { iat: number } {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: "qadam-api",
    audience: "qadam-web",
  }) as jwt.JwtPayload;

  return { sub: String(payload.sub), jti: String(payload.jti), iat: Number(payload.iat) };
}

/* -------------------------------------------------------------------------- */
/* Refresh cookie                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The refresh token lives in an httpOnly cookie, not in localStorage.
 *
 *  - httpOnly: JavaScript cannot read it, so an XSS payload cannot steal it.
 *  - secure: HTTPS only in production, so it cannot be sniffed in transit.
 *  - sameSite lax: the browser will not attach it to a cross-site POST, which
 *    is what makes CSRF against the refresh endpoint impractical.
 *  - path scoped to the auth routes: it is never sent with ordinary API calls,
 *    so it is exposed on far fewer requests.
 */
export function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response) {
  // Must match the attributes it was set with, or the browser keeps the old one.
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api/v1/auth",
  });
}

/* -------------------------------------------------------------------------- */
/* One-time tokens (email verification, password reset)                       */
/* -------------------------------------------------------------------------- */

/**
 * Returns the raw token to email, and the hash to store.
 *
 * Only the hash is persisted. A leaked database then contains no usable
 * password-reset links — the same reasoning as storing password hashes.
 */
export function createOneTimeToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Constant-time comparison.
 *
 * A normal `===` on strings returns as soon as two bytes differ, so the time
 * it takes leaks how much of a guess was correct. For a value an attacker can
 * submit repeatedly, that is enough to recover it byte by byte.
 */
export function safeCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
