import type { Request, Response } from "express";
import { asyncHandler } from "@/common/utils/async-handler";
import { sendCreated, sendSuccess } from "@/common/utils/respond";
import { unauthorized } from "@/common/errors/app-error";
import { logger } from "@/common/logger";
import { isProduction } from "@/config/env";
import * as service from "./auth.service";
import { clearRefreshCookie, REFRESH_COOKIE, setRefreshCookie } from "./token.service";

/**
 * The access token is returned in the BODY, not a cookie: the frontend keeps
 * it in memory only, so XSS cannot read it from storage. The refresh token
 * goes in an httpOnly cookie, which JavaScript cannot read at all.
 */

export const register = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as Parameters<typeof service.register>[0];
  const { user, accessToken, refreshToken, verificationToken } = await service.register(body);

  setRefreshCookie(res, refreshToken);

  // Emailing arrives with the queue. Until then the link is logged in
  // development only — never in production, where logs are retained and shared.
  if (!isProduction) {
    logger.info({ verificationToken }, "Email verification token (development only)");
  }

  sendCreated(res, { user, accessToken });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as { email: string; password: string };
  const { user, accessToken, refreshToken } = await service.login(body);

  setRefreshCookie(res, refreshToken);
  sendSuccess(res, { user, accessToken });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw unauthorized("No session");

  const { user, accessToken, refreshToken } = await service.refresh(token);

  setRefreshCookie(res, refreshToken);
  sendSuccess(res, { user, accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  // Revoke server-side when we know who it is, so the session dies everywhere
  // rather than only in this browser.
  if (req.user) await service.logoutEverywhere(req.user.id);
  clearRefreshCookie(res);
  sendSuccess(res, { message: "Signed out" });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await service.getUserById(req.user!.id));
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.validated!.params as { token: string };
  await service.verifyEmail(token);
  sendSuccess(res, { message: "Email verified" });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.validated!.body as { email: string };
  const token = await service.requestPasswordReset(email);

  if (token && !isProduction) {
    logger.info({ resetToken: token }, "Password reset token (development only)");
  }

  // Identical response whether or not the account exists — otherwise this
  // endpoint tells anyone which emails are registered.
  sendSuccess(res, {
    message: "If an account exists for that email, a reset link has been sent.",
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.validated!.params as { token: string };
  const { password } = req.validated!.body as { password: string };

  await service.resetPassword(token, password);
  // Every session is revoked by the service, so this browser's cookie must go
  // too or it would sit there sending a token the server now rejects.
  clearRefreshCookie(res);

  sendSuccess(res, { message: "Password updated. Please sign in again." });
});
