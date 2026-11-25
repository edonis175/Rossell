import path from "node:path";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import apiRouter from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export function createApp({ staticDir } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true);

  const allowedOrigins = String(process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));
  app.use(express.json({ limit: "64kb" }));
  app.use(express.urlencoded({ extended: false, limit: "64kb" }));

  // Health is available even when MongoDB is down: it reports the real state.
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      uptime: Number(process.uptime().toFixed(2)),
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api", apiRouter);
  app.use("/api", notFoundHandler);

  if (staticDir) {
    // Never expose backend source, tests or dependencies over HTTP.
    app.use(["/server", "/tests", "/node_modules"], (_req, res) => {
      res.status(404).json({ message: "Not found." });
    });

    // The Express server also serves the static marketing site from the repo
    // root, so `npm start` in /server is enough to preview everything.
    app.use(express.static(staticDir, {
      extensions: ["html"],
      maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
    }));

    // Unknown page routes answer with the real 404 page and a real 404
    // status, so the Express server behaves like a static host would.
    app.use((req, res) => {
      if (path.extname(req.path)) {
        return res.status(404).json({ message: "Not found." });
      }

      return res.status(404).sendFile(path.join(staticDir, "404.html"), (error) => {
        if (!error) {
          return;
        }

        if (res.headersSent) {
          return res.end();
        }

        return res.status(404).type("text/plain").send("Not found.");
      });
    });
  }

  app.use(errorHandler);

  return app;
}
