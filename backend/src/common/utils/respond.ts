import type { Response } from "express";

/**
 * The two response envelopes, in one place.
 *
 * Every endpoint returns the same shape, so the frontend's data layer can rely
 * on it without special-casing per route:
 *
 *   success: { success: true, data, meta? }
 *   failure: { success: false, message, errors? }
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function sendSuccess<T>(res: Response, data: T, status = 200, meta?: PaginationMeta) {
  return res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });
}

export function sendCreated<T>(res: Response, data: T) {
  return sendSuccess(res, data, 201);
}

/** Builds the pagination block from a total and the validated query. */
export function buildMeta(total: number, page: number, limit: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
