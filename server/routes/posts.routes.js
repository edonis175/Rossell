import { Router } from "express";
import { getPost, listPosts } from "../controllers/contentController.js";

const router = Router();

router.get("/", listPosts);
router.get("/:slug", getPost);

export default router;
