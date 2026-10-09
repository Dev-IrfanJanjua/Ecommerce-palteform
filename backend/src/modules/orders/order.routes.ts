import { Router } from "express";
import { authenticate, authorize } from "@/common/middleware/authenticate";
import { validate } from "@/common/middleware/validate";
import * as controller from "./order.controller";
import {
  createOrderSchema,
  listAllOrdersSchema,
  listOrdersSchema,
  orderNumberSchema,
  updateStatusSchema,
} from "./order.validation";

const router = Router();

// Private by default — no order route is ever public.
router.use(authenticate);

/**
 * Admin routes are declared BEFORE "/:orderNumber", or Express would match
 * "admin" as an order number. They also carry authorize("admin") explicitly:
 * a customer reaching them gets 403, not a 404 that hides their existence.
 */
router.get("/admin/all", authorize("admin"), validate(listAllOrdersSchema), controller.listAll);
router.patch(
  "/admin/:orderNumber/status",
  authorize("admin"),
  validate(updateStatusSchema),
  controller.updateStatus,
);

router.post("/", validate(createOrderSchema), controller.create);
router.get("/", validate(listOrdersSchema), controller.listMine);
router.get("/:orderNumber", validate(orderNumberSchema), controller.getOne);
router.post("/:orderNumber/cancel", validate(orderNumberSchema), controller.cancel);

export const orderRoutes = router;
