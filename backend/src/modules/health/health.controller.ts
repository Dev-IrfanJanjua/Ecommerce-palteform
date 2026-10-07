import type { Request, Response } from "express";
import { asyncHandler } from "@/common/utils/async-handler";
import { sendSuccess } from "@/common/utils/respond";
import { env } from "@/config/env";

/**
 * Health check.
 *
 * Deliberately says nothing a stranger could use: no versions, no dependency
 * hostnames, no build paths. A load balancer only needs to know whether this
 * process is willing to serve traffic.
 */
export const getHealth = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, {
    status: "ok",
    environment: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness.
 *
 * Separate from liveness on purpose: once MongoDB and Redis exist, this is
 * where their connection state is checked, and it returns 503 while a
 * dependency is down so a deploy does not take traffic too early. Liveness
 * must stay dumb, or a flapping dependency gets the container killed.
 */
export const getReadiness = asyncHandler(async (_req: Request, res: Response) => {
  const checks: Record<string, "ok" | "down" | "not configured"> = {
    // Added as each dependency arrives.
    database: "not configured",
    cache: "not configured",
  };

  const degraded = Object.values(checks).includes("down");
  res.status(degraded ? 503 : 200).json({
    success: !degraded,
    data: { status: degraded ? "degraded" : "ready", checks },
  });
});
