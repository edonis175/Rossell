import { Router } from "express";
import { listTestimonials } from "../controllers/contentController.js";

const router = Router();

router.get("/", listTestimonials);

export default router;
