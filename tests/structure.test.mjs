import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import { JSDOM } from "jsdom";
import { html, content } from "./helpers/site.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dom = new JSDOM(html);
const document = dom.window.document;

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath.replace(/^\.\//, "")));
}

test("stylesheet parses and defines the theme system", () => {
  const css = fs.readFileSync(path.join(root, "styles/main.css"), "utf8");
  const parsed = postcss.parse(css); // throws on malformed CSS
  assert.ok(parsed.nodes.length > 50);

  assert.match(css, /@font-face/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.hero-title/);
  assert.match(css, /\.blog-card/);
  assert.match(css, /\.integration-card/);
  assert.match(css, /\.modal/);
  assert.match(css, /--link:/, "the original --link token is defined");
});

test("fonts and vendored animation libraries exist", () => {
  [
    "styles/fonts/manrope-latin-var.woff2",
    "styles/fonts/jakarta-latin-var.woff2",
    "scripts/vendor/gsap.min.js",
    "scripts/vendor/ScrollTrigger.min.js",
    "shared/content.js",
    "scripts/api.js",
    "scripts/main.js",
  ].forEach((file) => assert.ok(exists(file), `${file} is missing`));
});

test("every local asset referenced by index.html exists", () => {
  const references = [];
  document.querySelectorAll("link[href], script[src], img[src], source[src]").forEach((node) => {
    const value = node.getAttribute("href") || node.getAttribute("src");
    if (!value) return;
    if (/^(https?:|data:|mailto:|tel:|#)/.test(value)) return;
    references.push(value);
  });
  assert.ok(references.length >= 5);
  references.forEach((reference) => assert.ok(exists(reference), `missing asset: ${reference}`));
});

test("all ids are unique and every in-page link resolves", () => {
  const ids = Array.from(document.querySelectorAll("[id]")).map((node) => node.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);

  const hashLinks = Array.from(document.querySelectorAll('a[href^="#"]'));
  assert.ok(hashLinks.length > 5);
  hashLinks.forEach((link) => {
    const target = link.getAttribute("href").slice(1);
    if (!target) return; // placeholder links are handled by JS
    assert.ok(document.getElementById(target), `broken anchor: #${target}`);
  });
});

test("primary navigation matches the finished sections", () => {
  const nav = document.querySelector(".header-nav");
  const links = Array.from(nav.querySelectorAll("a"));
  assert.deepEqual(links.map((link) => link.textContent.trim()), [
    "Features",
    "Analytics",
    "Integrations",
    "Blog",
    "Get in Touch",
  ]);
  assert.deepEqual(links.map((link) => link.getAttribute("href")), [
    "#features",
    "#analytics",
    "#integrations",
    "#blog",
    "#contact",
  ]);
  links.forEach((link) => {
    assert.ok(document.getElementById(link.getAttribute("href").slice(1)));
  });
  assert.equal(nav.querySelectorAll("li").length, 0, "no leftover list markup in the nav");

  const mobileLinks = Array.from(document.querySelectorAll(".mobile-nav-links a"));
  assert.equal(mobileLinks.length, 5);
});

test("every button has an accessible name and a type", () => {
  const buttons = Array.from(document.querySelectorAll("button"));
  assert.ok(buttons.length > 20);
  buttons.forEach((button) => {
    const name = (button.textContent || "").trim() || button.getAttribute("aria-label");
    assert.ok(name, `button without a name: ${button.outerHTML.slice(0, 80)}`);
    assert.ok(button.getAttribute("type"), "buttons declare a type");
  });
});

test("form controls are labelled", () => {
  const controls = Array.from(document.querySelectorAll("input, select, textarea"));
  assert.ok(controls.length >= 10);
  controls.forEach((control) => {
    const id = control.getAttribute("id");
    const labelled = (id && document.querySelector(`label[for="${id}"]`)) || control.getAttribute("aria-label");
    assert.ok(labelled, `unlabelled control: ${control.outerHTML.slice(0, 80)}`);
  });
});

test("modal triggers point at real dialogs", () => {
  const triggers = Array.from(document.querySelectorAll("[data-open-modal]"));
  assert.ok(triggers.length >= 3);
  triggers.forEach((trigger) => {
    const value = trigger.getAttribute("data-open-modal");
    const id = value === "trial" ? "trialModal" : value;
    assert.ok(document.getElementById(id), `missing dialog: ${id}`);
    assert.equal(document.getElementById(id).getAttribute("role"), "dialog");
    assert.equal(document.getElementById(id).getAttribute("aria-modal"), "true");
  });
});

test("images carry an alt attribute", () => {
  Array.from(document.querySelectorAll("img")).forEach((image) => {
    assert.ok(image.hasAttribute("alt"), "images need an alt attribute");
  });
  content.posts.forEach((post) => {
    assert.ok(post.image && post.image.src && post.image.alt, `post ${post.slug} needs image + alt`);
    assert.ok(exists(post.image.src), `missing blog image: ${post.image.src}`);
  });
});

test("scroll reveals are declared from several directions", () => {
  const directions = new Set(
    Array.from(document.querySelectorAll("[data-anim]")).map((node) => node.getAttribute("data-anim"))
  );
  ["up", "right", "left", "up"].forEach((direction) => assert.ok(directions.has(direction)));
  assert.ok(document.querySelectorAll("[data-anim]").length > 40, "plenty of animated elements");
  assert.ok(document.querySelectorAll("[data-stagger]").length >= 4);
  assert.ok(document.querySelectorAll("[data-counter]").length >= 3);
});

test("the scrolled header becomes a rounded floating bar and resets at the top", () => {
  const css = fs.readFileSync(path.join(root, "styles/main.css"), "utf8");

  const base = css.match(/\.site-header \{([^}]*)\}/);
  assert.ok(base, ".site-header base rule exists");
  assert.match(base[1], /border-radius:\s*0/, "the header starts square");
  assert.match(base[1], /transition:[^;]*border-radius/s, "the radius is animated");
  assert.match(base[1], /transition:[^;]*left/s);

  const scrolled = css.match(/\.site-header\.is-scrolled \{([^}]*)\}/);
  assert.ok(scrolled, ".site-header.is-scrolled rule exists");
  assert.match(scrolled[1], /border-radius:\s*1[468]px/, "rounded while scrolled");
  assert.match(scrolled[1], /top:\s*12px/);
  assert.match(scrolled[1], /left:\s*clamp\(/);
  assert.match(scrolled[1], /right:\s*clamp\(/);
  assert.match(scrolled[1], /backdrop-filter/);
});

test("theme toggle ships both icons and the stylesheet swaps them", () => {
  const toggle = document.querySelector("#themeToggle");
  assert.ok(toggle.querySelector(".sun-icon"));
  assert.ok(toggle.querySelector(".moon-icon"));

  const css = fs.readFileSync(path.join(root, "styles/main.css"), "utf8");
  assert.match(css, /\.theme-toggle-btn \.sun-icon\s*\{\s*display: block/);
  assert.match(css, /data-theme="dark"\] \.theme-toggle-btn \.moon-icon/);
});

test("no emojis anywhere in the authored source", () => {
  const allowed = new Set(["©", "®", "™", "→", "←", "↑", "↓"]);
  const files = [
    "index.html",
    "styles/main.css",
    "scripts/main.js",
    "scripts/api.js",
    "shared/content.js",
    "server/server.js",
    "server/seed.js",
  ];
  files.forEach((file) => {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    const matches = source.match(/\p{Extended_Pictographic}/gu) || [];
    const offenders = [...new Set(matches)].filter((character) => !allowed.has(character));
    assert.deepEqual(offenders, [], `${file} contains emoji characters`);
  });
});

test("placeholder content is clearly marked with TODOs", () => {
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const shared = fs.readFileSync(path.join(root, "shared/content.js"), "utf8");
  const seed = fs.readFileSync(path.join(root, "server/seed.js"), "utf8");
  assert.match(index, /TODO/);
  assert.ok((shared.match(/TODO/g) || []).length >= 5, "content file lists its TODOs");
  assert.match(shared, /dummy/i);
  assert.ok(seed.length > 1000);
});

test("dummy content is complete enough to fill the page", () => {
  assert.equal(content.posts.length, 6);
  const slugs = content.posts.map((post) => post.slug);
  assert.equal(new Set(slugs).size, slugs.length, "post slugs are unique");
  content.posts.forEach((post) => {
    assert.ok(post.title.length > 10);
    assert.ok(post.excerpt.length > 40);
    assert.ok(post.body.length >= 3);
    assert.ok(post.readTime > 0);
    assert.ok(post.author.name && post.author.role);
  });

  assert.equal(content.integrations.length, 14);
  const integrationCategories = new Set(content.integrations.map((item) => item.category));
  const chips = Array.from(document.querySelectorAll("#integrationFilters .chip"))
    .map((chip) => chip.getAttribute("data-filter"))
    .filter((value) => value !== "all");
  assert.deepEqual([...integrationCategories].sort(), chips.sort(), "filters cover every category");

  assert.equal(content.metrics.length, 4);
  content.metrics.forEach((metric) => assert.equal(metric.series.length, 12));

  const blogCategories = new Set(content.posts.map((post) => post.category));
  const blogChips = Array.from(document.querySelectorAll("#blogFilters .chip"))
    .map((chip) => chip.getAttribute("data-filter"))
    .filter((value) => value !== "all");
  assert.deepEqual([...blogCategories].sort(), blogChips.sort());

  assert.equal(content.testimonials.length, 3);
  assert.equal(content.faqs.length, 5);
  assert.ok(content.contact.email.includes("@"));
  ["privacy", "terms", "cookies"].forEach((key) => {
    assert.ok(content.legal[key].body.length >= 1);
  });
});

test("backend folder follows the MERN structure", () => {
  [
    "server/package.json",
    "server/server.js",
    "server/app.js",
    "server/seed.js",
    "server/config/db.js",
    "server/models/Post.js",
    "server/models/Integration.js",
    "server/models/Metric.js",
    "server/models/Testimonial.js",
    "server/models/ContactMessage.js",
    "server/models/Subscriber.js",
    "server/models/TrialRequest.js",
    "server/routes/index.js",
    "server/controllers/contentController.js",
    "server/controllers/leadsController.js",
    "server/.env.example",
  ].forEach((file) => assert.ok(exists(file), `${file} is missing`));

  const manifest = JSON.parse(fs.readFileSync(path.join(root, "server/package.json"), "utf8"));
  ["express", "mongoose", "cors", "dotenv"].forEach((dependency) => {
    assert.ok(manifest.dependencies[dependency], `${dependency} must be a dependency`);
  });
  assert.equal(manifest.type, "module");
});

test("the site works without the API by shipping fallback content", () => {
  const api = fs.readFileSync(path.join(root, "scripts/api.js"), "utf8");
  assert.match(api, /ROSSELL_CONTENT/);
  assert.match(api, /source: "local"/);
  assert.match(api, /indexOf\(error\.status\)/);
  assert.match(api, /offline: true/);
});
