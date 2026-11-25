import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import { JSDOM, VirtualConsole } from "jsdom";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const page = read("404.html");
const styles = read("styles/404.css");
const script = read("scripts/404.js");
const mainStyles = read("styles/main.css");
const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u;

const dom = new JSDOM(page);
const document = dom.window.document;

function boot(url = "https://rossell.test/some/missing-page", options = {}) {
  const virtualConsole = new VirtualConsole();
  const errors = [];
  virtualConsole.on("jsdomError", (error) => errors.push(error));

  const browser = new JSDOM(page, {
    url,
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole,
  });

  const { window } = browser;

  if (options.reduceMotion) {
    window.matchMedia = () => ({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    });
  }

  window.eval(script);
  window.document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));

  return {
    window,
    document: window.document,
    errors,
    click(node) {
      node.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
    },
    settle: () => new Promise((resolve) => setTimeout(resolve, 60)),
    close: () => window.close(),
  };
}

test("the 404 page ships its own stylesheet and script on top of the site design", () => {
  const parsed = postcss.parse(styles); // throws on malformed CSS
  assert.ok(parsed.nodes.length > 5);

  assert.match(page, /<link rel="stylesheet" href="\/styles\/main\.css">/);
  assert.match(page, /<link rel="stylesheet" href="\/styles\/404\.css">/);
  assert.match(page, /<script src="\/scripts\/404\.js" defer><\/script>/);

  // It must borrow the existing design tokens rather than invent colours.
  assert.ok((styles.match(/var\(--/g) || []).length > 20);
  assert.match(styles, /--ink\)/);
  assert.match(styles, /var\(--gutter\)/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(mainStyles, /\.site-header\.is-scrolled/);
});

test("the 404 page has one headline and real ways back to the site", () => {
  const headings = document.querySelectorAll("h1");
  assert.equal(headings.length, 1);
  assert.match(headings[0].textContent.trim(), /wrong turn/i);

  const homeLinks = Array.from(document.querySelectorAll('a[href="/"]'));
  assert.ok(homeLinks.length >= 2, "header button and main call to action both point home");
  assert.ok(document.querySelector('.lost-actions a.btn--primary[href="/"]'));

  const sections = Array.from(document.querySelectorAll(".lost-links a")).map((a) => a.getAttribute("href"));
  ["/#features", "/#analytics", "/#blog", "/#contact"].forEach((href) => {
    assert.ok(sections.includes(href), `links to ${href}`);
  });

  assert.equal(document.querySelector("#themeToggle").getAttribute("aria-pressed"), "false");
  assert.ok(document.querySelector("#themeToggle .sun-icon"));
  assert.ok(document.querySelector("#themeToggle .moon-icon"));
});

test("the 404 chrome is the floating header pill from the rest of the site", () => {
  const header = document.querySelector("header.site-header");
  assert.ok(header.classList.contains("is-scrolled"), "the pill is applied at rest");
  assert.ok(header.querySelector(".logo"));
  assert.equal(document.querySelectorAll("header .theme-toggle-btn").length, 1);
  assert.ok(document.querySelector("header .lost-header-btn"));
});

test("the artwork is three outlined digits and the zero is a keyboard-reachable button", () => {
  const digits = document.querySelectorAll("[data-magnet]");
  assert.equal(digits.length, 3);

  const zero = document.querySelector("#lostZero");
  assert.equal(zero.tagName, "BUTTON");
  assert.equal(zero.getAttribute("type"), "button");
  assert.match(zero.getAttribute("aria-label"), /missing page/i);
  assert.equal(zero.textContent.trim(), "0");

  // The decorative digits stay out of the accessibility tree.
  const decorative = Array.from(document.querySelectorAll(".lost-mark > .lost-digit"))
    .filter((node) => node !== zero);
  decorative.forEach((node) => assert.equal(node.getAttribute("aria-hidden"), "true"));

  assert.match(styles, /-webkit-text-stroke/);
  assert.match(styles, /@supports not \(-webkit-text-stroke/);
});

test("no emojis anywhere on the 404 page", () => {
  [page, styles, script].forEach((source) => {
    assert.ok(!emoji.test(source), "404 assets are emoji-free");
  });
});

test("the theme toggle switches, updates its label and persists the choice", () => {
  const site = boot();
  const toggle = site.document.querySelector("#themeToggle");
  const meta = site.document.querySelector('meta[name="theme-color"]');

  site.click(toggle);
  assert.equal(site.document.documentElement.getAttribute("data-theme"), "dark");
  assert.ok(site.document.documentElement.classList.contains("dark-mode"));
  assert.equal(toggle.getAttribute("aria-pressed"), "true");
  assert.equal(toggle.getAttribute("aria-label"), "Switch to light theme");
  assert.equal(meta.getAttribute("content"), "#121210");
  assert.equal(site.window.localStorage.getItem("theme"), "dark");

  site.click(toggle);
  assert.equal(site.document.documentElement.getAttribute("data-theme"), "light");
  assert.equal(toggle.getAttribute("aria-pressed"), "false");
  assert.equal(meta.getAttribute("content"), "#f6f3eb");
  assert.equal(site.window.localStorage.getItem("theme"), "light");

  assert.deepEqual(site.errors, []);
  site.close();
});

test("the page shows the requested path as text, never as markup", () => {
  const site = boot("https://rossell.test/missing/report?ref=newsletter");
  const chip = site.document.querySelector("#lostPath");

  assert.equal(chip.textContent, "/missing/report?ref=newsletter");
  assert.equal(chip.children.length, 0);

  const hostile = boot("https://rossell.test/%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E");
  const hostileChip = hostile.document.querySelector("#lostPath");
  assert.equal(hostileChip.querySelectorAll("*").length, 0);
  assert.match(hostileChip.textContent, /^\/%3Cimg/);
  hostile.close();
  site.close();
});

test("the zero spins and answers with a new line each time it is pressed", () => {
  const site = boot();
  const zero = site.document.querySelector("#lostZero");
  const reaction = site.document.querySelector("#lostReaction");

  assert.equal(reaction.textContent, "");
  assert.ok(!reaction.classList.contains("is-visible"));

  site.click(zero);
  const first = reaction.textContent;
  assert.ok(first.length > 0);
  assert.ok(reaction.classList.contains("is-visible"));
  assert.ok(zero.classList.contains("is-spinning"));

  site.click(zero);
  assert.notEqual(reaction.textContent, first);

  site.click(zero);
  site.click(zero);
  assert.equal(reaction.textContent, "Alright, the homepage is that way.");

  assert.deepEqual(site.errors, []);
  site.close();
});

test("the digits lean toward the cursor and settle back to rest", async () => {
  const site = boot();
  const zero = site.document.querySelector("#lostZero");

  site.window.innerWidth = 1200;
  site.window.innerHeight = 800;
  // jsdom has no layout, so give the zero a real box near the middle.
  zero.getBoundingClientRect = () => ({
    left: 480, top: 300, width: 220, height: 260, right: 700, bottom: 560,
    x: 480, y: 300, toJSON() { return this; },
  });

  const move = new site.window.MouseEvent("pointermove", { bubbles: true });
  Object.defineProperty(move, "clientX", { value: 700 });
  Object.defineProperty(move, "clientY", { value: 430 });
  site.window.dispatchEvent(move);

  await site.settle();
  assert.notEqual(zero.style.transform, "", "the zero drifts toward the pointer");

  site.window.dispatchEvent(new site.window.Event("pointerleave"));
  await new Promise((resolve) => setTimeout(resolve, 900));
  assert.equal(zero.style.transform, "", "and eases back to rest");

  site.close();
});

test("motion-sensitive visitors get a still page", async () => {
  const site = boot("https://rossell.test/missing", { reduceMotion: true });
  const zero = site.document.querySelector("#lostZero");

  zero.getBoundingClientRect = () => ({
    left: 480, top: 300, width: 220, height: 260, right: 700, bottom: 560,
    x: 480, y: 300, toJSON() { return this; },
  });

  const move = new site.window.MouseEvent("pointermove", { bubbles: true });
  Object.defineProperty(move, "clientX", { value: 690 });
  Object.defineProperty(move, "clientY", { value: 440 });
  site.window.dispatchEvent(move);

  await site.settle();
  assert.equal(zero.style.transform, "", "no magnet when reduced motion is requested");

  site.close();
});
