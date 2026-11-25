import { isDbReady } from "../config/db.js";

/**
 * Returns 503 with a machine readable body when MongoDB is not connected.
 * The front end treats that as "offline" and uses its bundled content.
 */
export function requireDb(_req, res, next) {
  if (isDbReady()) {
    return next();
  }
  return res.status(503).json({
    error: "database_unavailable",
    offline: true,
    message: "MongoDB is not connected. Start MongoDB and run `npm run seed` inside /server.",
  });
}
