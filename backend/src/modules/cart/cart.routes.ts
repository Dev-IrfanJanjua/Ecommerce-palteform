import { Router } from "express";
import { authenticate } from "@/common/middleware/authenticate";
import { validate } from "@/common/middleware/validate";
import * as controller from "./cart.controller";
import {
  addItemSchema,
  mergeCartSchema,
  setQuantitySchema,
  skuParamSchema,
} from "./cart.validation";

const router = Router();

/**
 * Router-level authenticate, not per-route.
 *
 * A per-route list is one forgotten line away from an unprotected endpoint.
 * Applied here, a new route is private by default and has to be deliberately
 * moved out to become public — the safer direction for a mistake to point.
 */
router.use(authenticate);

router.get("/", controller.get);
router.post("/items", validate(addItemSchema), controller.addItem);
router.patch("/items/:sku", validate(setQuantitySchema), controller.setQuantity);
router.delete("/items/:sku", validate(skuParamSchema), controller.removeItem);
router.delete("/", controller.clear);
router.post("/merge", validate(mergeCartSchema), controller.merge);

export const cartRoutes = router;
