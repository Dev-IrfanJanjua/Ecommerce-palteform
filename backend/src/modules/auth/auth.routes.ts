import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "@/common/middleware/validate";
import { authenticate, optionalAuth } from "@/common/middleware/authenticate";
import { env } from "@/config/env";
import * as controller from "./auth.controller";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.validation";

const router = Router();

/**
 * Auth routes get their own, much tighter rate limit.
 *
 * The global limit (300 per 15 minutes) is sized for browsing a catalogue and
 * is useless against credential stuffing. 10 attempts per 15 minutes is not.
 * This sits alongside the per-account lockout in the service: the limiter
 * slows one IP attacking many accounts, the lockout stops many IPs attacking
 * one account.
 */
const authLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // Successful logins should not consume the quota, or a busy shared office
  // network locks itself out.
  skipSuccessfulRequests: true,
  message: { success: false, message: "Too many attempts, please try again later" },
});

router.post("/register", authLimiter, validate(registerSchema), controller.register);
router.post("/login", authLimiter, validate(loginSchema), controller.login);
router.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), controller.forgotPassword);
router.post("/reset-password/:token", authLimiter, validate(resetPasswordSchema), controller.resetPassword);

router.get("/verify-email/:token", validate(verifyEmailSchema), controller.verifyEmail);

// Refresh is authenticated by the cookie, not a bearer token.
router.post("/refresh", controller.refresh);

// Logout works signed in or not: a client with an expired access token must
// still be able to clear its cookie.
router.post("/logout", optionalAuth, controller.logout);

router.get("/me", authenticate, controller.me);

export const authRoutes = router;
