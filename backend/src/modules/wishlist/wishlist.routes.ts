import { Router } from "express";
import { authenticate } from "@/common/middleware/authenticate";
import { validate } from "@/common/middleware/validate";
import { productSlugParamSchema } from "@/modules/cart/cart.validation";
import * as controller from "./wishlist.controller";

const router = Router();

// Private by default — see the note in cart.routes.ts.
router.use(authenticate);

router.get("/", controller.get);
router.put("/:slug", validate(productSlugParamSchema), controller.add);
router.delete("/:slug", validate(productSlugParamSchema), controller.remove);

export const wishlistRoutes = router;
