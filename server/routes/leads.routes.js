import { Router } from "express";
import { createContact, createSubscriber, createTrial } from "../controllers/leadsController.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { requireDb } from "../middleware/requireDb.js";

const router = Router();

router.post("/contact", requireDb, rateLimit({ windowMs: 60_000, max: 10 }), createContact);
router.post("/subscribers", requireDb, rateLimit({ windowMs: 60_000, max: 20 }), createSubscriber);
router.post("/trials", requireDb, rateLimit({ windowMs: 60_000, max: 10 }), createTrial);

export default router;
