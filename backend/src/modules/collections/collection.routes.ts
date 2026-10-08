import { Router } from "express";
import { validate } from "@/common/middleware/validate";
import * as controller from "./collection.controller";
import { collectionSlugSchema } from "./collection.validation";

const router = Router();

router.get("/", controller.list);
router.get("/:slug", validate(collectionSlugSchema), controller.getBySlug);

export const collectionRoutes = router;
