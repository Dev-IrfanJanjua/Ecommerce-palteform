import type { NextFunction, Request, RequestHandler, Response } from "express";
import { forbidden, unauthorized } from "@/common/errors/app-error";
import { verifyAccessToken } from "@/modules/auth/token.service";
import type { Role } from "@/modules/users/user.model";

/**
 * AUTHENTICATION AND AUTHORISATION
 *
 * 401 means "I do not know who you are" — no token, or a bad one.
 * 403 means "I know who you are, and no" — valid token, wrong role.
 * Conflating them tells an attacker nothing useful and tells a legitimate
 * client nothing actionable.
 */

export const authenticate: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return next(unauthorized("Authentication required"));
  }

  const token = header.slice(7).trim();
  if (!token) return next(unauthorized("Authentication required"));

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    // The reason is deliberately not echoed. "Signature invalid" versus
    // "expired" tells someone probing the API which part of their forgery
    // worked.
    next(unauthorized("Invalid or expired token"));
  }
};

/**
 * Attaches the user when a token is present, but never rejects.
 *
 * For endpoints that are public yet behave differently when signed in — a
 * product page that also shows whether the item is wishlisted, for example.
 */
export const optionalAuth: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();
  try {
    const payload = verifyAccessToken(header.slice(7).trim());
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    // A bad token on an optional route is simply "not signed in".
  }
  next();
};

/**
 * Role check. Must run AFTER authenticate.
 *
 * Role comes from the signed token, never from a header or body — those are
 * attacker-controlled.
 */
export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized("Authentication required"));
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
