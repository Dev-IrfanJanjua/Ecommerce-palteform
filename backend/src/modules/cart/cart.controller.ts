import type { Request, Response } from "express";
import { asyncHandler } from "@/common/utils/async-handler";
import { sendSuccess } from "@/common/utils/respond";
import * as service from "./cart.service";

/**
 * Every handler passes `req.user!.id` — the id from the VERIFIED token, never
 * anything from the body, params or a header. There is deliberately no way for
 * a request to name whose cart it means.
 *
 * `req.user!` is safe here because every route in this module sits behind
 * `authenticate`, which 401s before a handler runs.
 */

export const get = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await service.getCart(req.user!.id));
});

export const addItem = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as { sku: string; quantity: number };
  sendSuccess(res, await service.addItem(req.user!.id, body));
});

export const setQuantity = asyncHandler(async (req: Request, res: Response) => {
  const { sku } = req.validated!.params as { sku: string };
  const { quantity } = req.validated!.body as { quantity: number };
  sendSuccess(res, await service.setQuantity(req.user!.id, sku, quantity));
});

export const removeItem = asyncHandler(async (req: Request, res: Response) => {
  const { sku } = req.validated!.params as { sku: string };
  sendSuccess(res, await service.removeItem(req.user!.id, sku));
});

export const clear = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await service.clearCart(req.user!.id));
});

export const merge = asyncHandler(async (req: Request, res: Response) => {
  const { items } = req.validated!.body as { items: { sku: string; quantity: number }[] };
  sendSuccess(res, await service.mergeCart(req.user!.id, items));
});
