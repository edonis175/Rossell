import { Router } from "express";
import { requireDb } from "../middleware/requireDb.js";
import integrationRoutes from "./integrations.routes.js";
import leadRoutes from "./leads.routes.js";
import metricRoutes from "./metrics.routes.js";
import postRoutes from "./posts.routes.js";
import testimonialRoutes from "./testimonials.routes.js";

const router = Router();

router.use("/posts", requireDb, postRoutes);
router.use("/integrations", requireDb, integrationRoutes);
router.use("/metrics", requireDb, metricRoutes);
router.use("/testimonials", requireDb, testimonialRoutes);

// Write endpoints gate on the database themselves, so an unknown /api path
// still receives a 404 (instead of a misleading 503).
router.use("/", leadRoutes);

export default router;
