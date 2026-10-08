import type { Request, Response } from "express";
import { asyncHandler } from "@/common/utils/async-handler";
import { sendSuccess } from "@/common/utils/respond";
import * as service from "./wishlist.service";

export const get = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await service.getWishlist(req.user!.id));
});

export const add = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.validated!.params as { slug: string };
  sendSuccess(res, await service.addToWishlist(req.user!.id, slug));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.validated!.params as { slug: string };
  sendSuccess(res, await service.removeFromWishlist(req.user!.id, slug));
});
