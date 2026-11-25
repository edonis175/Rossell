/**
 * server/seed.js
 * ---------------------------------------------------------------------------
 * Fills MongoDB with the dummy content used by the marketing site.
 * Run it from /server:   npm run seed
 *
 * WARNING: this script clears the collections it seeds before inserting.
 * ---------------------------------------------------------------------------
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import content from "../shared/content.js";
import { connectDB } from "./config/db.js";
import ContactMessage from "./models/ContactMessage.js";
import Integration from "./models/Integration.js";
import Metric from "./models/Metric.js";
import Post from "./models/Post.js";
import Subscriber from "./models/Subscriber.js";
import Testimonial from "./models/Testimonial.js";
import TrialRequest from "./models/TrialRequest.js";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, ".env") });

function postDocuments() {
  return content.posts.map((post) => ({
    title: post.title,
    slug: post.slug,
    category: post.category,
    excerpt: post.excerpt,
    publishedAt: new Date(post.publishedAt),
    readTime: post.readTime,
    image: { src: post.image.src, alt: post.image.alt },
    author: { name: post.author.name, role: post.author.role },
    body: post.body,
    featured: Boolean(post.featured),
  }));
}

function integrationDocuments() {
  return content.integrations.map((integration, index) => ({
    name: integration.name,
    slug: integration.slug,
    mark: integration.mark,
    category: integration.category,
    description: integration.description,
    connected: Boolean(integration.connected),
    order: index,
  }));
}

function metricDocuments() {
  return content.metrics.map((metric, index) => ({
    key: metric.key,
    label: metric.label,
    shortLabel: metric.shortLabel,
    format: metric.format,
    value: metric.value,
    delta: metric.delta,
    series: metric.series,
    timeframe: metric.timeframe,
    order: index,
  }));
}

function testimonialDocuments() {
  return content.testimonials.map((testimonial, index) => ({
    quote: testimonial.quote,
    name: testimonial.name,
    role: testimonial.role,
    company: testimonial.company,
    order: index,
  }));
}

async function seed() {
  console.log("[seed] connecting…");
  const { connected } = await connectDB();

  if (!connected) {
    console.error("[seed] aborted: no MongoDB connection. Is mongod running? (see server/.env.example)");
    process.exitCode = 1;
    await mongoose.disconnect().catch(() => {});
    return;
  }

  console.log("[seed] clearing existing demo collections…");
  await Promise.all([
    Post.deleteMany({}),
    Integration.deleteMany({}),
    Metric.deleteMany({}),
    Testimonial.deleteMany({}),
    ContactMessage.deleteMany({}),
    Subscriber.deleteMany({}),
    TrialRequest.deleteMany({}),
  ]);

  const [posts, integrations, metrics, testimonials] = await Promise.all([
    Post.insertMany(postDocuments()),
    Integration.insertMany(integrationDocuments()),
    Metric.insertMany(metricDocuments()),
    Testimonial.insertMany(testimonialDocuments()),
  ]);

  // A single welcome subscriber keeps the newsletter collection non-empty
  // when checking the admin side. Delete this block if you do not want it.
  await Subscriber.create({ email: "demo@rossell.com", source: "seed" });

  console.log("[seed] done:");
  console.log(`  posts          ${posts.length}`);
  console.log(`  integrations   ${integrations.length}`);
  console.log(`  metrics        ${metrics.length}`);
  console.log(`  testimonials   ${testimonials.length}`);
  console.log("  subscribers    1 (demo@rossell.com)");
  console.log("  contact + trial collections are ready but start empty.");

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error("[seed] failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
