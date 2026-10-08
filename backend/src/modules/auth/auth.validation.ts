import { z } from "zod";

/**
 * A password policy that rewards length rather than punctuation.
 *
 * Long passphrases beat short cryptic strings in both strength and usability,
 * so the floor is 8 and there is no "must contain a symbol" rule — those push
 * people towards Password1! and a sticky note. The upper bound matters too:
 * bcrypt silently truncates at 72 BYTES, so a longer password would have its
 * tail ignored, and two different long passwords could both work.
 */
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters");

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .max(254)
  .email("Enter a valid email address");

const name = (field: string) =>
  z.string().trim().min(1, `${field} is required`).max(80);

export const registerSchema = z.object({
  body: z
    .object({
      email,
      password,
      firstName: name("First name"),
      lastName: name("Last name"),
    })
    // .strict() rejects unknown keys outright rather than stripping them, so a
    // body containing `role: "admin"` is a visible 400 rather than a silent
    // near-miss. The service never reads role either — defence in depth.
    .strict(),
});

export const loginSchema = z.object({
  body: z.object({ email, password: z.string().min(1, "Password is required") }).strict(),
});

export const forgotPasswordSchema = z.object({
  body: z.object({ email }).strict(),
});

export const resetPasswordSchema = z.object({
  params: z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, "Invalid reset token") }),
  body: z.object({ password }).strict(),
});

export const verifyEmailSchema = z.object({
  params: z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, "Invalid verification token") }),
});
