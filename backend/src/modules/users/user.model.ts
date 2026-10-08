import { Schema, model, type InferSchemaType, models, type Model } from "mongoose";

/**
 * USER MODEL
 *
 * Security rules encoded in the schema itself, so they cannot be forgotten at
 * a call site:
 *
 *  - `passwordHash` has `select: false`, so it is NEVER returned unless a
 *    query explicitly asks for it. A plain `User.findOne()` cannot leak it.
 *  - `toJSON` strips the hash and the one-time tokens even if a query did
 *    select them, so an accidental `res.json(user)` is still safe.
 *  - `role` defaults to "customer" and is never read from request input (see
 *    auth.service.ts). A registration body containing `role: "admin"` must not
 *    be able to create an admin.
 *  - Reset and verification tokens are stored HASHED. A leaked database must
 *    not hand an attacker working password-reset links.
 */

export const ROLES = ["customer", "admin"] as const;
export type Role = (typeof ROLES)[number];

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
    },

    /**
     * bcrypt hash. Never the password.
     * select: false keeps it out of every query that does not ask for it.
     */
    passwordHash: { type: String, required: true, select: false },

    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },

    role: { type: String, enum: ROLES, default: "customer", index: true },

    isEmailVerified: { type: Boolean, default: false },

    /* --- One-time tokens: stored as SHA-256 hashes, never raw ------------- */
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    /**
     * Invalidates every refresh token issued before this moment.
     *
     * Refresh tokens are stateless JWTs, so "log out everywhere" and "password
     * changed" need a way to reject tokens that are still cryptographically
     * valid. Comparing the token's issued-at against this timestamp does that
     * with one field instead of a token table.
     */
    tokensValidFrom: { type: Date, default: () => new Date() },

    /* --- Brute-force protection ------------------------------------------ */
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, select: false },

    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        // Defence in depth: even a query that selected these must not serialise
        // them. An accidental res.json(user) stays safe.
        delete ret.passwordHash;
        delete ret.emailVerificationTokenHash;
        delete ret.emailVerificationExpires;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetExpires;
        delete ret.failedLoginAttempts;
        delete ret.lockedUntil;
        delete ret.tokensValidFrom;
        return ret;
      },
    },
  },
);

/** Lookups by one-time token hash, used on verify and reset. */
userSchema.index({ emailVerificationTokenHash: 1 }, { sparse: true });
userSchema.index({ passwordResetTokenHash: 1 }, { sparse: true });

export type UserDoc = InferSchemaType<typeof userSchema>;
/**
 * Registered idempotently.
 *
 * mongoose.model() throws OverwriteModelError if the same name is registered
 * twice, which happens whenever one module is loaded through two different
 * specifiers (an "@/" alias and a relative path resolve to separate module
 * instances), and on every hot reload in dev. Reusing an existing model is
 * both safe and what callers expect.
 */
export const User = (models.User as Model<InferSchemaType<typeof userSchema>>) ?? model("User", userSchema);
