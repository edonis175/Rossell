/**
 * server/server.js
 * ---------------------------------------------------------------------------
 * Starts the Rossell API and serves the static site from the repository root.
 *   cd server && npm install && npm run seed && npm run dev
 * ---------------------------------------------------------------------------
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");

dotenv.config({ path: path.join(here, ".env") });

const port = Number(process.env.PORT) || 4000;
const { connected } = await connectDB();
const app = createApp({ staticDir: projectRoot });

// 0.0.0.0 so containers, sandboxes and preview proxies can reach the server.
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`[server] Rossell site  → http://localhost:${port}`);
  console.log(`[server] API health   → http://localhost:${port}/api/health`);
  console.log(`[server] MongoDB       → ${connected ? "connected" : "disconnected (API returns 503, site uses demo content)"}`);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[server] ${signal} received, closing…`);
  server.close(async () => {
    await mongoose.disconnect().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 8000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
