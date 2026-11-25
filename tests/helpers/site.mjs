/**
 * Boots the real index.html + real scripts inside jsdom, with GSAP stubbed.
 * The stub keeps DOM behaviour testable without a layout engine; the real GSAP
 * bundle is only loaded in a browser (see scripts/vendor).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

export const html = read("index.html");
export const contentSource = read("shared/content.js");
export const apiSource = read("scripts/api.js");
export const mainSource = read("scripts/main.js");

export const content = (() => {
  const module = { exports: {} };
  // shared/content.js is UMD — evaluate it as CommonJS here.
  new Function("module", "exports", contentSource)(module, module.exports);
  return module.exports;
})();

function gsapStub() {
  const tween = () => ({ kill() {}, pause() {}, resume() {}, play() {}, progress() { return 1; } });
  const chainable = () => {
    const api = {
      from: () => api,
      to: () => api,
      add: () => api,
      set: () => api,
      fromTo: () => api,
      kill: () => api,
    };
    return api;
  };
  return {
    registerPlugin() {},
    utils: { toArray: (value) => (Array.isArray(value) ? value : [value]) },
    set: () => tween(),
    to: (_target, vars) => {
      // A paused tween only updates once it is played — same as GSAP.
      if (vars && vars.paused !== true && typeof vars.onUpdate === "function") { vars.onUpdate(); }
      return tween();
    },
    from: () => tween(),
    fromTo: () => tween(),
    timeline: () => chainable(),
  };
}

/**
 * @param {object} options
 * @param {(url: string, init?: object) => Promise<any>} [options.fetchImpl]
 * @param {object} [options.storage] initial localStorage entries
 */
export function createSite(options = {}) {
  const virtualConsole = new VirtualConsole();
  const errors = [];
  virtualConsole.on("jsdomError", (error) => errors.push(error));
  virtualConsole.on("error", (...args) => errors.push(new Error(args.join(" "))));

  const dom = new JSDOM(html, {
    url: "https://rossell.test/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole,
  });

  const { window } = dom;

  window.gsap = gsapStub();
  window.ScrollTrigger = {
    create: () => ({ kill() {} }),
    refresh() {},
    getAll: () => [],
    config() {},
  };
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  if (!window.URL.createObjectURL) { window.URL.createObjectURL = () => "blob:mock"; }
  if (!window.URL.revokeObjectURL) { window.URL.revokeObjectURL = () => {}; }

  const fetchCalls = [];
  window.fetch = (url, init) => {
    fetchCalls.push({ url: String(url), init: init || {} });
    if (options.fetchImpl) { return options.fetchImpl(String(url), init || {}); }
    return Promise.reject(new TypeError("offline"));
  };

  if (options.storage) {
    Object.entries(options.storage).forEach(([key, value]) => window.localStorage.setItem(key, value));
  }

  window.eval(contentSource);
  window.eval(apiSource);
  window.eval(mainSource);

  // jsdom keeps readyState at "loading" until the load event, so fire the
  // event after the scripts (which register their DOMContentLoaded listener).
  window.document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));

  return {
    dom,
    window,
    document: window.document,
    errors,
    fetchCalls,
    $: (selector) => window.document.querySelector(selector),
    $$: (selector) => Array.from(window.document.querySelectorAll(selector)),
    click(selectorOrNode) {
      const node = typeof selectorOrNode === "string"
        ? window.document.querySelector(selectorOrNode)
        : selectorOrNode;
      if (!node) { throw new Error("Cannot click missing element: " + selectorOrNode); }
      node.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
      return node;
    },
    input(selector, value) {
      const node = window.document.querySelector(selector);
      if (!node) { throw new Error("Cannot type into missing element: " + selector); }
      node.value = value;
      node.dispatchEvent(new window.Event("input", { bubbles: true }));
      return node;
    },
    select(selector, value) {
      const node = window.document.querySelector(selector);
      if (!node) { throw new Error("Cannot select missing element: " + selector); }
      node.value = value;
      node.dispatchEvent(new window.Event("change", { bubbles: true }));
      return node;
    },
    submit(selector) {
      const form = window.document.querySelector(selector);
      if (!form) { throw new Error("Cannot submit missing form: " + selector); }
      form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
      return form;
    },
    key(key, target) {
      const node = target || window.document;
      node.dispatchEvent(new window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    },
    flush: () => new Promise((resolve) => window.setTimeout(resolve, 0)),
    close: () => window.close(),
  };
}
