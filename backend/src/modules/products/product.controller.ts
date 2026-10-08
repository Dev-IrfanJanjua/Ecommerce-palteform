import type { Request, Response } from "express";
import { asyncHandler } from "@/common/utils/async-handler";
import { sendSuccess } from "@/common/utils/respond";
import * as service from "./product.service";
import type { ListProductsQuery } from "./product.validation";

/**
 * Controllers are HTTP only: read the validated request, call the service,
 * send the response. No business logic, no database calls.
 *
 * Input always comes from `req.validated` — never `req.query` or `req.body`
 * directly. That is what guarantees a handler can only see fields someone
 * declared in a schema.
 */

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validated!.query as ListProductsQuery;
  const { items, meta, facets } = await service.listProducts(query);
  sendSuccess(res, { items, facets }, 200, meta);
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.validated!.params as { slug: string };
  sendSuccess(res, await service.getProductBySlug(slug));
});

export const getRelated = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.validated!.params as { slug: string };
  const { limit } = req.validated!.query as { limit: number };
  sendSuccess(res, await service.getRelatedProducts(slug, limit));
});

export const getFeatured = asyncHandler(async (req: Request, res: Response) => {
  const { limit } = req.validated!.query as { limit: number };
  sendSuccess(res, await service.getFeaturedProducts(limit));
});

export const getNewArrivals = asyncHandler(async (req: Request, res: Response) => {
  const { limit } = req.validated!.query as { limit: number };
  sendSuccess(res, await service.getNewArrivals(limit));
});

export const getBestsellers = asyncHandler(async (req: Request, res: Response) => {
  const { limit } = req.validated!.query as { limit: number };
  sendSuccess(res, await service.getBestsellers(limit));
});
