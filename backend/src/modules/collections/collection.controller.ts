import type { Request, Response } from "express";
import { asyncHandler } from "@/common/utils/async-handler";
import { sendSuccess } from "@/common/utils/respond";
import { notFound } from "@/common/errors/app-error";
import { ProductCollection } from "./collection.model";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await ProductCollection.find().sort({ sortOrder: 1 }));
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.validated!.params as { slug: string };
  const collection = await ProductCollection.findOne({ slug });
  if (!collection) throw notFound("Collection not found");
  sendSuccess(res, collection);
});
