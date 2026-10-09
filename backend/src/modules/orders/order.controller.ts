import type { Request, Response } from "express";
import { asyncHandler } from "@/common/utils/async-handler";
import { sendCreated, sendSuccess } from "@/common/utils/respond";
import * as service from "./order.service";
import type { OrderStatus } from "./order.model";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as service.CreateOrderInput;
  sendCreated(res, await service.createOrder(req.user!.id, body));
});

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.validated!.query as { page: number; limit: number };
  const { items, meta } = await service.listMyOrders(req.user!.id, page, limit);
  sendSuccess(res, items, 200, meta);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const { orderNumber } = req.validated!.params as { orderNumber: string };
  // Ownership is enforced in the service, so every caller gets it.
  sendSuccess(res, await service.getOrder(orderNumber, req.user!.id, req.user!.role));
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const { orderNumber } = req.validated!.params as { orderNumber: string };
  sendSuccess(res, await service.cancelOrder(orderNumber, req.user!.id, req.user!.role));
});

/* --- Admin ------------------------------------------------------------- */

export const listAll = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validated!.query as { status?: OrderStatus; page: number; limit: number };
  const { items, meta } = await service.listAllOrders(query);
  sendSuccess(res, items, 200, meta);
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { orderNumber } = req.validated!.params as { orderNumber: string };
  const { status } = req.validated!.body as { status: OrderStatus };
  sendSuccess(res, await service.updateStatus(orderNumber, status));
});
