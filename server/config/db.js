import mongoose from "mongoose";

const DEFAULT_URI = "mongodb://127.0.0.1:27017/rossell";

/**
 * Connects to MongoDB. The connection is intentionally non fatal: the Express
 * server still serves the static site (and /api/health) when Mongo is down, so
 * the front end can fall back to its bundled demo content.
 */
export async function connectDB(uri = process.env.MONGODB_URI || DEFAULT_URI) {
  if (mongoose.connection.readyState === 1) {
    return { connected: true, uri: mongoose.connection.name };
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS) || 5000,
      // Fail fast instead of buffering queries while Mongo is unreachable;
      // requireDb already turns that state into a clean 503.
      bufferCommands: false,
    });
    console.log(`[db] connected to "${mongoose.connection.name}"`);
    return { connected: true, uri: mongoose.connection.name };
  } catch (error) {
    console.warn(`[db] could not connect to MongoDB: ${error.message}`);
    console.warn("[db] the API will answer 503 until MongoDB is running and `npm run seed` has been executed.");
    return { connected: false, error };
  }
}

export function isDbReady() {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
