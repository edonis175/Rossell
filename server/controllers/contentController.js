import Post from "../models/Post.js";
import Integration from "../models/Integration.js";
import Metric from "../models/Metric.js";
import Testimonial from "../models/Testimonial.js";

function withId(doc) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  plain.id = String(plain._id);
  delete plain._id;
  return plain;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseLimit(value, fallback = 50, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

/** GET /api/posts?category=Product&q=reporting&limit=6 */
export async function listPosts(req, res, next) {
  try {
    const { category, q, limit } = req.query;
    const filter = {};

    if (category && category !== "all") {
      filter.category = category;
    }
    if (q) {
      const pattern = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ title: pattern }, { excerpt: pattern }, { category: pattern }];
    }

    const posts = await Post.find(filter)
      .sort({ publishedAt: -1 })
      .limit(parseLimit(limit))
      .lean();

    res.json({ count: posts.length, data: posts.map(withId) });
  } catch (error) {
    next(error);
  }
}

/** GET /api/posts/:slug */
export async function getPost(req, res, next) {
  try {
    const post = await Post.findOne({ slug: req.params.slug }).lean();
    if (!post) {
      return res.status(404).json({ message: "Article not found." });
    }
    return res.json({ data: withId(post) });
  } catch (error) {
    return next(error);
  }
}

/** GET /api/integrations?category=Development&q=git */
export async function listIntegrations(req, res, next) {
  try {
    const { category, q } = req.query;
    const filter = {};

    if (category && category !== "all") {
      filter.category = category;
    }
    if (q) {
      const pattern = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: pattern }, { description: pattern }, { category: pattern }];
    }

    const integrations = await Integration.find(filter).sort({ order: 1, name: 1 }).lean();
    res.json({ count: integrations.length, data: integrations.map(withId) });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/integrations/:slug  { connected: boolean } */
export async function toggleIntegration(req, res, next) {
  try {
    if (typeof req.body.connected !== "boolean") {
      return res.status(400).json({ message: "`connected` must be a boolean." });
    }

    const integration = await Integration.findOneAndUpdate(
      { slug: req.params.slug },
      { connected: req.body.connected },
      { new: true, runValidators: true }
    ).lean();

    if (!integration) {
      return res.status(404).json({ message: "Integration not found." });
    }

    return res.json({
      data: withId(integration),
      message: `${integration.name} ${integration.connected ? "connected" : "disconnected"}.`,
    });
  } catch (error) {
    return next(error);
  }
}

/** GET /api/metrics */
export async function listMetrics(_req, res, next) {
  try {
    const metrics = await Metric.find({}).sort({ order: 1 }).lean();
    res.json({ count: metrics.length, data: metrics.map(withId) });
  } catch (error) {
    next(error);
  }
}

/** GET /api/testimonials */
export async function listTestimonials(_req, res, next) {
  try {
    const testimonials = await Testimonial.find({}).sort({ order: 1 }).lean();
    res.json({ count: testimonials.length, data: testimonials.map(withId) });
  } catch (error) {
    next(error);
  }
}
