const buckets = new Map();

/**
 * Small dependency free rate limiter. Good enough for a marketing site's
 * public write endpoints; swap for a shared store before running multi-region.
 */
export function rateLimit({ windowMs = 60_000, max = 20 } = {}) {
  return function limiter(req, res, next) {
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      return res.status(429).json({ message: "Too many requests. Please try again in a minute." });
    }
    return next();
  };
}

/** Used by the tests so each suite starts with a clean limiter. */
export function resetRateLimits() {
  buckets.clear();
}
