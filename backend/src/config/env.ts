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

  /** Requests allowed per IP per window. */
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
});

const parsed = envSchema.safeParse(process.env);

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
