import { Router } from "express";
import { validate } from "@/common/middleware/validate";
import * as controller from "./product.controller";
import {
  listProductsSchema,
  productRailSchema,
  productSlugSchema,
  relatedProductsSchema,
} from "./product.validation";

const router = Router();

/**
 * All product reads are public — a storefront catalogue is meant to be
 * crawlable. Writes arrive with the admin module and will be behind
 * authenticate + authorize("admin").
 *
 * The rail routes are declared BEFORE "/:slug", or Express would match
 * "featured" as a product slug.
 */
router.get("/featured", validate(productRailSchema), controller.getFeatured);
router.get("/new", validate(productRailSchema), controller.getNewArrivals);
router.get("/bestsellers", validate(productRailSchema), controller.getBestsellers);

router.get("/", validate(listProductsSchema), controller.list);
router.get("/:slug", validate(productSlugSchema), controller.getBySlug);
router.get("/:slug/related", validate(relatedProductsSchema), controller.getRelated);

export const productRoutes = router;
