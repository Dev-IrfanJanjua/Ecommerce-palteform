import bcrypt from "bcryptjs";
import { AppError, conflict, unauthorized } from "@/common/errors/app-error";
import { logger } from "@/common/logger";
import { User } from "@/modules/users/user.model";
import {
  createOneTimeToken,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./token.service";

/**
 * AUTH SERVICE
 *
 * No Request or Response here — just the rules.
 */

/** bcrypt work factor. 12 is the current sensible balance: roughly 250ms to
 *  hash, which is unnoticeable on login and expensive to brute-force. */
const BCRYPT_ROUNDS = 12;

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

/**
 * One message for every login failure.
 *
 * "No account with that email" tells an attacker which addresses are
 * registered, which is both a privacy leak and a shortcut for credential
 * stuffing. Wrong email and wrong password must be indistinguishable.
 */
const INVALID_CREDENTIALS = "Invalid email or password";

export interface AuthResult {
  user: { id: string; email: string; firstName: string; lastName: string; role: string };
  accessToken: string;
  refreshToken: string;
}

function toAuthUser(user: {
  _id: unknown;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}) {
  return {
    id: String(user._id),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

/* -------------------------------------------------------------------------- */
/* Register                                                                    */
/* -------------------------------------------------------------------------- */

export async function register(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<AuthResult & { verificationToken: string }> {
  const existing = await User.findOne({ email: input.email }).lean();
  if (existing) {
    // Registration is the one place the address must be acknowledged — a
    // generic error would make a taken email impossible to act on. Rate
    // limiting is what stops this becoming an enumeration oracle.
    throw conflict("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const { token: verificationToken, hash } = createOneTimeToken();

  const user = await User.create({
    email: input.email,
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    // role is NOT taken from input. A body containing role:"admin" must not be
    // able to create an admin; the schema default applies instead.
    emailVerificationTokenHash: hash,
    emailVerificationExpires: new Date(Date.now() + VERIFICATION_TTL_MS),
  });

  return {
    user: toAuthUser(user),
    accessToken: signAccessToken(String(user._id), user.role),
    refreshToken: signRefreshToken(String(user._id)),
    // Returned so the caller can email it. Emailing arrives with the queue;
    // until then it is logged in development only.
    verificationToken,
  };
}

/* -------------------------------------------------------------------------- */
/* Login                                                                       */
/* -------------------------------------------------------------------------- */

export async function login(input: { email: string; password: string }): Promise<AuthResult> {
  const user = await User.findOne({ email: input.email }).select(
    "+passwordHash +failedLoginAttempts +lockedUntil",
  );

  if (!user) {
    // Hash anyway. Returning immediately makes "no such user" measurably
    // faster than "wrong password", which turns response time into an account
    // enumeration oracle regardless of the identical message.
    await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    throw unauthorized(INVALID_CREDENTIALS);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw new AppError(429, `Too many failed attempts. Try again in ${minutes} minutes.`);
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);

  if (!valid) {
    user.failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      user.failedLoginAttempts = 0;
      logger.warn({ userId: String(user._id) }, "Account locked after repeated failed logins");
    }
    await user.save();
    throw unauthorized(INVALID_CREDENTIALS);
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();

  return {
    user: toAuthUser(user),
    accessToken: signAccessToken(String(user._id), user.role),
    refreshToken: signRefreshToken(String(user._id)),
  };
}

/* -------------------------------------------------------------------------- */
/* Refresh                                                                     */
/* -------------------------------------------------------------------------- */

export async function refresh(token: string): Promise<AuthResult> {
  let payload: { sub: string; iat: number };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw unauthorized("Invalid or expired session");
  }

  const user = await User.findById(payload.sub).select("+passwordHash");
  if (!user) throw unauthorized("Invalid or expired session");

  // A refresh token issued before tokensValidFrom is rejected even though it is
  // still cryptographically valid. This is what makes logout-everywhere and
  // password-change actually revoke sessions, without a token table.
  // iat is in seconds; allow a second of clock skew.
  if (user.tokensValidFrom && payload.iat * 1000 < user.tokensValidFrom.getTime() - 1000) {
    throw unauthorized("Session has been revoked");
  }

  return {
    user: toAuthUser(user),
    accessToken: signAccessToken(String(user._id), user.role),
    // Rotated on every refresh: a stolen token has a much shorter useful life.
    refreshToken: signRefreshToken(String(user._id)),
  };
}

/* -------------------------------------------------------------------------- */
/* Logout                                                                      */
/* -------------------------------------------------------------------------- */

/** Revokes every refresh token for the user by moving the validity cutoff. */
export async function logoutEverywhere(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, { tokensValidFrom: new Date() });
}

/* -------------------------------------------------------------------------- */
/* Email verification                                                          */
/* -------------------------------------------------------------------------- */

export async function verifyEmail(token: string): Promise<void> {
  const user = await User.findOne({
    emailVerificationTokenHash: hashToken(token),
    emailVerificationExpires: { $gt: new Date() },
  }).select("+emailVerificationTokenHash +emailVerificationExpires");

  if (!user) throw new AppError(400, "This verification link is invalid or has expired");

  user.isEmailVerified = true;
  // Single use.
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();
}

/* -------------------------------------------------------------------------- */
/* Password reset                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Always succeeds from the caller's point of view.
 *
 * Replying "no account with that email" would turn this endpoint into a free
 * account-enumeration service. The response is identical either way; only the
 * returned token differs, and that is never sent to the client.
 */
export async function requestPasswordReset(email: string): Promise<string | null> {
  const user = await User.findOne({ email });
  if (!user) return null;

  const { token, hash } = createOneTimeToken();
  user.passwordResetTokenHash = hash;
  user.passwordResetExpires = new Date(Date.now() + RESET_TTL_MS);
  await user.save();

  return token;
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const user = await User.findOne({
    passwordResetTokenHash: hashToken(token),
    passwordResetExpires: { $gt: new Date() },
  }).select("+passwordResetTokenHash +passwordResetExpires +passwordHash");

  if (!user) throw new AppError(400, "This reset link is invalid or has expired");

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  // Anyone already signed in with the old password is signed out. If the reset
  // happened because the account was compromised, leaving those sessions alive
  // would defeat the whole exercise.
  user.tokensValidFrom = new Date();
  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  await user.save();
}

/* -------------------------------------------------------------------------- */

export async function getUserById(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw unauthorized("Account no longer exists");
  return user;
}
