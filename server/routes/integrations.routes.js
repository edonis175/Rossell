import { Router } from "express";
import { listIntegrations, toggleIntegration } from "../controllers/contentController.js";

const router = Router();

router.get("/", listIntegrations);
router.patch("/:slug", toggleIntegration);

export default router;
