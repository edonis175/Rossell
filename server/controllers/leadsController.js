import ContactMessage from "../models/ContactMessage.js";
import Subscriber from "../models/Subscriber.js";
import TrialRequest from "../models/TrialRequest.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const TOPICS = ["product-demo", "pricing", "partnership", "support", "other"];
const TEAM_SIZES = ["1-10", "11-50", "51-200", "201+"];

const clean = (value) => (typeof value === "string" ? value.trim() : "");

function requiredMissing(pairs) {
  return pairs.filter(([, value]) => !value).map(([field]) => field);
}

/** POST /api/contact */
export async function createContact(req, res, next) {
  try {
    const body = req.body || {};
    const name = clean(body.name);
    const email = clean(body.email).toLowerCase();
    const company = clean(body.company);
    const message = clean(body.message);
    const topic = TOPICS.includes(body.topic) ? body.topic : "other";

    const missing = requiredMissing([["name", name], ["email", email], ["message", message]]);
    if (missing.length) {
      return res.status(400).json({ message: `Missing required field(s): ${missing.join(", ")}.` });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email address." });
    }
    if (message.length < 10) {
      return res.status(400).json({ message: "Please write at least 10 characters." });
    }

    const doc = await ContactMessage.create({ name, email, company, topic, message });
    return res.status(201).json({
      message: "Message received — we will reply within one business day.",
      data: { id: String(doc._id) },
    });
  } catch (error) {
    return next(error);
  }
}

/** POST /api/subscribers */
export async function createSubscriber(req, res, next) {
  try {
    const body = req.body || {};
    const email = clean(body.email).toLowerCase();
    const source = clean(body.source) || "footer";

    if (!email) {
      return res.status(400).json({ message: "An email address is required." });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email address." });
    }

    const existing = await Subscriber.findOne({ email }).lean();
    if (existing) {
      return res.status(200).json({
        message: "You are already on the list.",
        data: { id: String(existing._id) },
      });
    }

    const doc = await Subscriber.create({ email, source });
    return res.status(201).json({
      message: "Subscribed. Check your inbox.",
      data: { id: String(doc._id) },
    });
  } catch (error) {
    return next(error);
  }
}

/** POST /api/trials */
export async function createTrial(req, res, next) {
  try {
    const body = req.body || {};
    const name = clean(body.name);
    const email = clean(body.email).toLowerCase();
    const company = clean(body.company);
    const teamSize = TEAM_SIZES.includes(body.teamSize) ? body.teamSize : "11-50";

    const missing = requiredMissing([["name", name], ["email", email], ["company", company]]);
    if (missing.length) {
      return res.status(400).json({ message: `Missing required field(s): ${missing.join(", ")}.` });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ message: "Please provide a valid work email address." });
    }

    const doc = await TrialRequest.create({ name, email, company, teamSize });
    return res.status(201).json({
      message: "Workspace request received.",
      data: { id: String(doc._id) },
    });
  } catch (error) {
    return next(error);
  }
}
