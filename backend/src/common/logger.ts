import pino from "pino";
import { env, isProduction, isTest } from "@/config/env";

/**
 * Structured logger.
 *
 * JSON in production so logs are searchable by field in whatever aggregator
 * runs there; pretty-printed in development so they are readable by a human.
 * Silent during tests so a passing suite is not buried in noise.
 *
 * `redact` is a safety net, not a licence to log secrets: even if a token or
 * password reaches a log call by accident, it is replaced before it is written.
 */
export const logger = pino({
  level: isTest ? "silent" : env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.accessToken",
      "*.refreshToken",
    ],
    censor: "[redacted]",
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
        },
      }),
});
