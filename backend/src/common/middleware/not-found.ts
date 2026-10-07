import type { Request, Response, NextFunction } from "express";
import { AppError } from "@/common/errors/app-error";

/** Turns an unmatched route into a normal 404 that the error handler formats. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, `Cannot ${req.method} ${req.path}`));
}
