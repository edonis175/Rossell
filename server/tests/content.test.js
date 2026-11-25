import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import content from "../../shared/content.js";
import ContactMessage from "../models/ContactMessage.js";
import Integration from "../models/Integration.js";
import Metric from "../models/Metric.js";
import Post from "../models/Post.js";
import Subscriber from "../models/Subscriber.js";
import Testimonial from "../models/Testimonial.js";
import TrialRequest from "../models/TrialRequest.js";
import { INTEGRATION_CATEGORIES } from "../models/Integration.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "../..");

test("all Mongoose models are registered", () => {
  const names = mongoose.modelNames().sort();
  assert.deepEqual(names, [
    "ContactMessage",
    "Integration",
    "Metric",
    "Post",
    "Subscriber",
    "Testimonial",
    "TrialRequest",
  ]);
  assert.equal(Post.modelName, "Post");
  assert.equal(ContactMessage.modelName, "ContactMessage");
  assert.equal(Subscriber.modelName, "Subscriber");
  assert.equal(TrialRequest.modelName, "TrialRequest");
});

test("seed content is complete and internally consistent", () => {
  assert.equal(content.posts.length, 6);
  const slugs = content.posts.map((post) => post.slug);
  assert.equal(new Set(slugs).size, slugs.length, "post slugs are unique");

  content.posts.forEach((post) => {
    assert.ok(post.title && post.excerpt && post.category);
    assert.ok(!Number.isNaN(new Date(post.publishedAt).getTime()));
    assert.ok(post.body.length >= 3);
    assert.ok(post.image.src.startsWith("./assets/img/"));
    const imagePath = path.join(projectRoot, post.image.src.replace(/^\.\//, ""));
    assert.ok(fs.existsSync(imagePath), `missing image for ${post.slug}`);
  });

  assert.equal(content.integrations.length, 14);
  const integrationSlugs = content.integrations.map((item) => item.slug);
  assert.equal(new Set(integrationSlugs).size, integrationSlugs.length);
  content.integrations.forEach((integration) => {
    assert.ok(INTEGRATION_CATEGORIES.includes(integration.category), `bad category: ${integration.category}`);
    assert.ok(integration.mark.length <= 3);
    assert.equal(typeof integration.description, "string");
  });

  assert.equal(content.metrics.length, 4);
  const metricKeys = content.metrics.map((metric) => metric.key);
  assert.equal(new Set(metricKeys).size, metricKeys.length);
  content.metrics.forEach((metric) => {
    assert.equal(metric.series.length, 12);
    metric.series.forEach((value) => assert.equal(typeof value, "number"));
    assert.ok(["currency", "number", "percent", "compact", "decimal"].includes(metric.format));
  });

  assert.equal(content.testimonials.length, 3);
  content.testimonials.forEach((testimonial) => {
    assert.ok(testimonial.quote.length > 40);
    assert.ok(testimonial.name && testimonial.role && testimonial.company);
  });

  assert.equal(content.faqs.length, 5);
  content.faqs.forEach((faq) => {
    assert.ok(faq.question.endsWith("?"));
    assert.ok(faq.answer.length > 60);
  });

  ["privacy", "terms", "cookies"].forEach((key) => {
    assert.ok(content.legal[key].title);
    assert.ok(content.legal[key].body.length >= 2);
    assert.match(content.legal[key].body[0], /TODO/);
  });
});

test("seed.js maps the shared content into MongoDB documents", () => {
  const source = fs.readFileSync(path.join(here, "../seed.js"), "utf8");
  assert.match(source, /shared\/content\.js/);
  assert.match(source, /deleteMany/);
  assert.match(source, /insertMany/);
  ["Post", "Integration", "Metric", "Testimonial"].forEach((model) => {
    assert.match(source, new RegExp(model));
  });
  assert.match(source, /publishedAt: new Date/);
  assert.match(source, /mongoose\.disconnect/);
});

test("environment example documents the required variables", () => {
  const example = fs.readFileSync(path.join(here, "../.env.example"), "utf8");
  ["PORT", "MONGODB_URI", "NODE_ENV", "CORS_ORIGIN"].forEach((variable) => {
    assert.match(example, new RegExp(`${variable}=`));
  });
});

test("models expose sane validation rules", () => {
  const contact = new ContactMessage({ name: "A", email: "a@b.co", message: "too short" });
  const error = contact.validateSync();
  assert.ok(error && error.errors.message, "contact message has a minimum length");

  const integration = new Integration({ name: "X", slug: "x", mark: "X", category: "Nope", description: "d" });
  assert.ok(integration.validateSync().errors.category, "integration categories are constrained");

  const post = new Post({ title: "T", slug: "t", category: "Other", excerpt: "e", publishedAt: new Date() });
  assert.ok(post.validateSync().errors.category, "post categories are constrained");
});
