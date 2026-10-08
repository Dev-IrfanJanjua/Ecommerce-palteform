import type { PaginationMeta } from "@/types/catalog";

/**
 * API CLIENT
 *
 * One typed wrapper around fetch, so every call shares the same base URL,
 * error handling and response unwrapping.
 *
 * The API always replies in one of two envelopes:
 *   { success: true,  data, meta? }
 *   { success: false, message, errors? }
 * This unwraps the first and throws a typed ApiError for the second, so
 * callers deal in plain data and real errors rather than checking a flag.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly errors?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

interface ErrorEnvelope {
  success: false;
  message: string;
  errors?: unknown;
}

export interface ApiResult<T> {
  data: T;
  meta?: PaginationMeta;
}

/**
 * Turns a query object into a query string.
 *
 * Arrays become comma-separated (`gender=men,women`) and `undefined` /
 * `false` are dropped, so an unset filter never appears in the URL — which
 * keeps the cache key stable and the URL readable.
 */
export function toQueryString(params: Record<string, unknown> = {}): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(","));
    } else if (value === true) {
      search.set(key, "1");
    } else {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      // Sends the refresh cookie once auth exists.
      credentials: "include",
      // Product data is public and changes rarely. Revalidating on an interval
      // rather than every request keeps pages fast without serving a stale
      // catalogue for long. Overridable per call.
      next: { revalidate: 60, ...(init as { next?: object })?.next },
    });
  } catch (cause) {
    // A network failure is not an HTTP status — distinguish it so the UI can
    // say "cannot reach the server" rather than inventing a code.
    throw new ApiError(0, "Could not reach the API", cause);
  }

  let body: SuccessEnvelope<T> | ErrorEnvelope;
  try {
    body = (await response.json()) as SuccessEnvelope<T> | ErrorEnvelope;
  } catch {
    throw new ApiError(response.status, `Unexpected response from the API (${response.status})`);
  }

  if (!response.ok || body.success === false) {
    const message = "message" in body ? body.message : `Request failed (${response.status})`;
    throw new ApiError(response.status, message, "errors" in body ? body.errors : undefined);
  }

  return { data: body.data, meta: body.meta };
}

/** Returns null on 404 instead of throwing, for "find one or nothing" reads. */
export async function apiFetchOrNull<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    return (await apiFetch<T>(path, init)).data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
