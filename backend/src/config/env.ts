import "dotenv/config";
import { z } from "zod";

/**
 * ENVIRONMENT CONFIGURATION
 *
 * Validated once, at startup, and the process exits if anything is missing or
 * malformed. The alternative — reading process.env where it is needed — fails
 * halfway through serving a request, in production, with a confusing error.
 * Failing at boot means a misconfigured deploy never starts.
 *
 * Secrets are never logged. Only variable NAMES appear in error output.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),

  /** Comma-separated list of origins allowed to call this API. */
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  /**
   * MongoDB connection string.
   *
   * Required in production — a production API with no database is broken, and
   * should refuse to start rather than serve 503s. Optional in development and
   * test so the skeleton still boots before Atlas is set up; the readiness
   * probe then reports the database as "not configured".
   */
  MONGODB_URI: z
    .string()
    .trim()
    .optional()
    // `MONGODB_URI=` in a .env file produces an EMPTY STRING, not undefined.
    // Without this, "unset" and "set to nothing" behave differently and a
    // blank line in .env fails validation instead of meaning "no database".
    .transform((value) => (value ? value : undefined)),
  /** Database name, when not already part of the URI. */
  MONGODB_DB_NAME: z.string().trim().min(1).default("qadam"),

  /**
   * JWT secrets. Access and refresh MUST be different values: if they were
   * shared, an access token would be accepted as a refresh token, and a
   * 15-minute compromise would become a 7-day one.
   *
   * 32 characters minimum. Generate with:
   *   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   */
  JWT_ACCESS_SECRET: z.string().min(32, "must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "must be at least 32 characters"),

  ACCESS_TOKEN_TTL: z.string().trim().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),

  /** Attempts allowed per IP per window on login / register. */
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

  /** Requests allowed per IP per window. */
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
});

const parsed = envSchema
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production" && !value.MONGODB_URI) {
      ctx.addIssue({
        code: "custom",
        path: ["MONGODB_URI"],
        message: "is required in production",
      });
    }
    // Reusing one secret for both token types collapses the whole point of
    // having two: a stolen 15-minute access token would be usable as a
    // 7-day refresh token.
    if (value.JWT_ACCESS_SECRET === value.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["JWT_REFRESH_SECRET"],
        message: "must be different from JWT_ACCESS_SECRET",
      });
    }
  })
  .safeParse(process.env);

if (!parsed.success) {
  // console, not the logger: the logger is configured FROM this file, so it
  // does not exist yet when this fails.
  const issues = parsed.error.issues
    .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  console.error(`\nInvalid environment configuration:\n${issues}\n`);
  console.error("See backend/.env.example for the expected values.\n");
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
