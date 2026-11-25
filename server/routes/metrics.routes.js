import { Router } from "express";
import { listMetrics } from "../controllers/contentController.js";

const router = Router();

router.get("/", listMetrics);

export default router;
