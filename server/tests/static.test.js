import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { createApp } from "../app.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const app = createApp({ staticDir: projectRoot });

test("the Express server serves the marketing site and the 404 assets", async () => {
  const home = await request(app).get("/").expect(200);
  assert.match(home.headers["content-type"], /text\/html/);
  assert.match(home.text, /Rossell/);

  const stylesheet = await request(app).get("/styles/404.css").expect(200);
  assert.match(stylesheet.headers["content-type"], /text\/css/);

  const script = await request(app).get("/scripts/404.js").expect(200);
  assert.match(script.headers["content-type"], /javascript/);
});

test("unknown page routes answer with the 404 page and a real 404 status", async () => {
  const response = await request(app).get("/this-page-does-not-exist").expect(404);
  assert.match(response.headers["content-type"], /text\/html/);
  assert.match(response.text, /This page took a wrong turn/);
  assert.match(response.text, /styles\/404\.css/);

  const nested = await request(app).get("/reports/2026/missing" + "?ref=old-link").expect(404);
  assert.match(nested.text, /lostPath/);
});

test("missing assets and backend source stay machine-readable", async () => {
  const asset = await request(app).get("/assets/img/not-here.png").expect(404);
  assert.match(asset.headers["content-type"], /application\/json/);
  assert.equal(asset.body.message, "Not found.");

  const source = await request(app).get("/server/app.js").expect(404);
  assert.match(source.headers["content-type"], /application\/json/);
  assert.doesNotMatch(source.text, /createApp/);
});

test("unknown API routes keep their JSON 404", async () => {
  const response = await request(app).get("/api/still-not-a-route").expect(404);
  assert.match(response.headers["content-type"], /application\/json/);
  assert.ok(response.body.message);
});
