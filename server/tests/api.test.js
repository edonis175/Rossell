import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../app.js";
import { resetRateLimits } from "../middleware/rateLimit.js";
import ContactMessage from "../models/ContactMessage.js";
import Integration from "../models/Integration.js";
import Metric from "../models/Metric.js";
import Post from "../models/Post.js";
import Subscriber from "../models/Subscriber.js";
import Testimonial from "../models/Testimonial.js";
import TrialRequest from "../models/TrialRequest.js";

const app = createApp();

/** Pretend MongoDB is connected without opening a socket. */
function forceDbReady(state) {
  Object.defineProperty(mongoose.connection, "readyState", {
    configurable: true,
    value: state,
  });
}

function clearDbReady() {
  delete mongoose.connection.readyState;
}

function postDoc(overrides = {}) {
  return {
    _id: "post-1",
    title: "A stub article",
    slug: "a-stub-article",
    category: "Product",
    excerpt: "A short excerpt used by the test suite.",
    publishedAt: new Date("2026-11-12"),
    readTime: 6,
    image: { src: "./assets/img/blog-reporting.jpg", alt: "alt" },
    author: { name: "Mina Okafor", role: "Head of Product" },
    body: ["one", "two", "three"],
    featured: true,
    ...overrides,
  };
}

beforeEach(() => {
  resetRateLimits();
  forceDbReady(1);
});

afterEach(() => {
  clearDbReady();
});

/* ============================= HEALTH + DB GATE ============================= */

test("GET /api/health reports the real database state", async () => {
  forceDbReady(0);
  let response = await request(app).get("/api/health").expect(200);
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.database, "disconnected");

  forceDbReady(1);
  response = await request(app).get("/api/health").expect(200);
  assert.equal(response.body.database, "connected");
  assert.equal(typeof response.body.uptime, "number");
});

test("read endpoints answer 503 with an offline flag when Mongo is down", async () => {
  forceDbReady(0);
  const response = await request(app).get("/api/posts").expect(503);
  assert.equal(response.body.offline, true);
  assert.equal(response.body.error, "database_unavailable");

  await request(app).post("/api/contact").send({
    name: "Alex",
    email: "alex@company.com",
    message: "A long enough message for the test.",
  }).expect(503);
});

/* ============================= POSTS ============================= */

test("GET /api/posts returns documents with id instead of _id and applies filters", async (t) => {
  let capturedFilter = null;
  t.mock.method(Post, "find", (filter) => {
    capturedFilter = filter;
    return {
      sort: () => ({
        limit: () => ({ lean: async () => [postDoc()] }),
      }),
    };
  });

  const response = await request(app)
    .get("/api/posts?category=Design&q=report&limit=2")
    .expect(200);

  assert.equal(response.body.count, 1);
  assert.equal(response.body.data[0].id, "post-1");
  assert.equal(response.body.data[0]._id, undefined);
  assert.equal(capturedFilter.category, "Design");
  assert.ok(capturedFilter.$or, "search is translated into an $or filter");
});

test("GET /api/posts/:slug returns the article or a 404", async (t) => {
  t.mock.method(Post, "findOne", () => ({ lean: async () => postDoc() }));
  let response = await request(app).get("/api/posts/a-stub-article").expect(200);
  assert.equal(response.body.data.slug, "a-stub-article");
  assert.equal(response.body.data.body.length, 3);

  t.mock.method(Post, "findOne", () => ({ lean: async () => null }));
  response = await request(app).get("/api/posts/missing-article").expect(404);
  assert.match(response.body.message, /not found/i);
});

/* ============================= INTEGRATIONS ============================= */

test("GET /api/integrations lists integrations", async (t) => {
  const items = [
    { _id: "i1", name: "Slack", slug: "slack", category: "Communication", connected: true },
    { _id: "i2", name: "GitHub", slug: "github", category: "Development", connected: false },
  ];
  t.mock.method(Integration, "find", () => ({
    sort: () => ({ lean: async () => items }),
  }));

  const response = await request(app).get("/api/integrations?category=Development").expect(200);
  assert.equal(response.body.count, 2);
  assert.equal(response.body.data[0].id, "i1");
});

test("PATCH /api/integrations/:slug validates and toggles", async (t) => {
  await request(app).patch("/api/integrations/slack").send({ connected: "yes" }).expect(400);

  t.mock.method(Integration, "findOneAndUpdate", () => ({
    lean: async () => ({ _id: "i1", name: "Slack", slug: "slack", connected: true }),
  }));

  const response = await request(app)
    .patch("/api/integrations/slack")
    .send({ connected: true })
    .expect(200);

  assert.equal(response.body.data.connected, true);
  assert.match(response.body.message, /connected/i);

  t.mock.method(Integration, "findOneAndUpdate", () => ({ lean: async () => null }));
  await request(app).patch("/api/integrations/nope").send({ connected: true }).expect(404);
});

/* ============================= METRICS + TESTIMONIALS ============================= */

test("GET /api/metrics and /api/testimonials return ordered lists", async (t) => {
  t.mock.method(Metric, "find", () => ({
    sort: () => ({
      lean: async () => [
        { _id: "m1", key: "revenue", label: "Net revenue", value: 128400, series: [1, 2, 3] },
      ],
    }),
  }));
  t.mock.method(Testimonial, "find", () => ({
    sort: () => ({
      lean: async () => [
        { _id: "t1", quote: "Great product", name: "Amara Diallo", role: "VP Ops", company: "Northwind" },
      ],
    }),
  }));

  const metrics = await request(app).get("/api/metrics").expect(200);
  assert.equal(metrics.body.data[0].key, "revenue");
  assert.equal(metrics.body.data[0].id, "m1");

  const testimonials = await request(app).get("/api/testimonials").expect(200);
  assert.equal(testimonials.body.data[0].company, "Northwind");
});

/* ============================= CONTACT ============================= */

test("POST /api/contact rejects invalid payloads", async () => {
  let response = await request(app).post("/api/contact").send({}).expect(400);
  assert.match(response.body.message, /Missing required/);

  response = await request(app)
    .post("/api/contact")
    .send({ name: "Alex", email: "not-an-email", message: "A sufficiently long message." })
    .expect(400);
  assert.match(response.body.message, /valid email/i);

  response = await request(app)
    .post("/api/contact")
    .send({ name: "Alex", email: "alex@company.com", message: "short" })
    .expect(400);
  assert.match(response.body.message, /at least 10 characters/i);
});

test("POST /api/contact stores a normalised message", async (t) => {
  let received = null;
  t.mock.method(ContactMessage, "create", async (payload) => {
    received = payload;
    return { _id: "contact-1", ...payload };
  });

  const response = await request(app)
    .post("/api/contact")
    .send({
      name: "  Alex Moreau ",
      email: "  ALEX@Company.com ",
      company: " Northwind ",
      topic: "pricing",
      message: " We use Linear, GitHub and Slack and need clarity. ",
    })
    .expect(201);

  assert.equal(response.body.data.id, "contact-1");
  assert.equal(received.name, "Alex Moreau");
  assert.equal(received.email, "alex@company.com");
  assert.equal(received.company, "Northwind");
  assert.equal(received.topic, "pricing");
  assert.equal(received.message, "We use Linear, GitHub and Slack and need clarity.");
});

/* ============================= SUBSCRIBERS ============================= */

test("POST /api/subscribers validates, deduplicates and stores", async (t) => {
  await request(app).post("/api/subscribers").send({ email: "bad" }).expect(400);
  await request(app).post("/api/subscribers").send({}).expect(400);

  t.mock.method(Subscriber, "findOne", () => ({
    lean: async () => ({ _id: "sub-1", email: "reader@company.com" }),
  }));
  let response = await request(app)
    .post("/api/subscribers")
    .send({ email: "Reader@Company.com" })
    .expect(200);
  assert.match(response.body.message, /already on the list/i);

  t.mock.method(Subscriber, "findOne", () => ({ lean: async () => null }));
  t.mock.method(Subscriber, "create", async (payload) => ({ _id: "sub-2", ...payload }));
  response = await request(app)
    .post("/api/subscribers")
    .send({ email: "new@company.com", source: "footer" })
    .expect(201);
  assert.equal(response.body.data.id, "sub-2");
});

/* ============================= TRIALS ============================= */

test("POST /api/trials validates required fields and stores the request", async (t) => {
  let response = await request(app)
    .post("/api/trials")
    .send({ name: "Alex", email: "alex@company.com" })
    .expect(400);
  assert.match(response.body.message, /company/);

  response = await request(app)
    .post("/api/trials")
    .send({ name: "Alex", email: "bad", company: "Northwind" })
    .expect(400);
  assert.match(response.body.message, /valid work email/i);

  let received = null;
  t.mock.method(TrialRequest, "create", async (payload) => {
    received = payload;
    return { _id: "trial-1", ...payload };
  });

  response = await request(app)
    .post("/api/trials")
    .send({
      name: " Alex Moreau ",
      email: "ALEX@company.com ",
      company: " Northwind ",
      teamSize: "51-200",
    })
    .expect(201);

  assert.equal(response.body.data.id, "trial-1");
  assert.equal(received.email, "alex@company.com");
  assert.equal(received.teamSize, "51-200");
});

/* ============================= MISC ============================= */

test("unknown API routes return a JSON 404, with or without Mongo", async () => {
  let response = await request(app).get("/api/does-not-exist").expect(404);
  assert.match(response.body.message, /No API route/i);

  forceDbReady(0);
  response = await request(app).get("/api/still-not-a-route").expect(404);
  assert.match(response.body.message, /No API route/i);
});

test("public write endpoints are rate limited", async () => {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    // Invalid body: the request is counted by the limiter but never reaches
    // the database, so this test stays fast and does not need a connection.
    const response = await request(app).post("/api/contact").send({});
    lastStatus = response.status;
  }
  assert.equal(lastStatus, 429, "the 12th request is rejected (limit is 10/minute)");
});
