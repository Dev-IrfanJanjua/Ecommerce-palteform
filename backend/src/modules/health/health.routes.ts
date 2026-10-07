import { Router } from "express";
import { getHealth, getReadiness } from "./health.controller";

const router = Router();

router.get("/", getHealth);
router.get("/ready", getReadiness);

export const healthRoutes = router;
