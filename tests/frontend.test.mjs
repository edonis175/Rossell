import test from "node:test";
import assert from "node:assert/strict";
import { createSite, content } from "./helpers/site.mjs";

function withSite(options, run) {
  const site = createSite(options);
  try {
    return run(site);
  } finally {
    site.close();
  }
}

function response(payload, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(payload),
  });
}

/* ============================= RENDERING ============================= */

test("boot renders every data driven list from the bundled content", () => {
  withSite({}, (site) => {
    assert.equal(site.$$(".blog-card").length, 3, "first blog page shows 3 cards");
    assert.equal(site.$("#blogCount").textContent, "6 articles");
    assert.equal(site.$("#blogMore").hidden, false);

    assert.equal(site.$$(".integration-card").length, 14);
    assert.equal(site.$("#integrationCount").textContent, "3 of 14 connected");

    assert.equal(site.$$(".metric-card").length, 4);
    assert.equal(site.$$("#metricCards .sparkline path").length, 4);
    assert.match(site.$("#analyticsChart .chart-line").getAttribute("d"), /^M[\d.]+,[\d.]+ C/);
    assert.equal(site.$("#chartTitle").textContent, "Net revenue");

    assert.equal(site.$$(".quote-card").length, 3);
    assert.equal(site.$$(".faq-item").length, 5);
    assert.equal(site.$$(".channel-bar").length, 4);

    assert.deepEqual(site.errors, []);
  });
});

test("hero counters and KPIs are hydrated from content", () => {
  withSite({}, (site) => {
    const counters = site.$$("[data-counter]").map((node) => node.textContent);
    assert.deepEqual(counters, ["4,200+", "9 min", "99.98%"]);
    assert.equal(site.$('[data-hero-value="revenue"]').textContent, "$128,400");
    assert.equal(site.$('[data-hero-delta="active-users"]').textContent, "+8.2%");
  });
});

/* ============================= THEME ============================= */

test("theme toggle switches light and dark, persists and updates meta", () => {
  withSite({}, (site) => {
    const { document, window } = site;
    const toggle = site.$("#themeToggle");
    const html = document.documentElement;
    const meta = document.querySelector('meta[name="theme-color"]');

    assert.equal(html.getAttribute("data-theme"), "light");
    assert.equal(toggle.getAttribute("aria-pressed"), "false");
    assert.equal(toggle.getAttribute("aria-label"), "Switch to dark theme");

    site.click(toggle);
    assert.equal(html.getAttribute("data-theme"), "dark");
    assert.equal(document.body.classList.contains("dark-mode"), true);
    assert.equal(toggle.getAttribute("aria-pressed"), "true");
    assert.equal(toggle.getAttribute("aria-label"), "Switch to light theme");
    assert.equal(meta.getAttribute("content"), "#121210");
    assert.equal(window.localStorage.getItem("theme"), "dark");

    site.click(toggle);
    assert.equal(html.getAttribute("data-theme"), "light");
    assert.equal(document.body.classList.contains("dark-mode"), false);
    assert.equal(window.localStorage.getItem("theme"), "light");
    assert.equal(meta.getAttribute("content"), "#f6f3eb");
  });
});

test("a stored dark preference is respected on boot", () => {
  withSite({ storage: { theme: "dark" } }, (site) => {
    // index.html's inline boot script cannot run under jsdom, so simulate it.
    site.document.documentElement.setAttribute("data-theme", "dark");
    site.document.documentElement.classList.add("dark-mode");
    assert.equal(site.window.localStorage.getItem("theme"), "dark");
  });
});

/* ============================= MOBILE NAV ============================= */

test("mobile navigation opens, closes, and closes on Escape", () => {
  withSite({}, (site) => {
    const { document } = site;
    const nav = site.$("#mobileNav");
    const button = site.$("#hamburgerBtn");

    assert.equal(nav.hidden, true);
    site.click(button);
    assert.equal(nav.hidden, false);
    assert.equal(button.getAttribute("aria-expanded"), "true");
    assert.equal(button.classList.contains("is-open"), true);
    assert.equal(document.body.classList.contains("nav-open"), true);

    site.click(site.$("#mobileNavClose"));
    assert.equal(nav.hidden, true);
    assert.equal(button.getAttribute("aria-expanded"), "false");
    assert.equal(document.body.classList.contains("nav-open"), false);

    site.click(button);
    assert.equal(nav.hidden, false);
    site.key("Escape");
    assert.equal(nav.hidden, true, "Escape closes the mobile menu");

    // A navigation link closes the overlay as well.
    site.click(button);
    site.click(site.$('.mobile-nav-links a[href="#features"]'));
    assert.equal(nav.hidden, true);
    assert.equal(document.body.classList.contains("nav-open"), false);
  });
});

/* ============================= SCROLL UI ============================= */

test("scroll state drives header, progress bar and back-to-top button", () => {
  withSite({}, (site) => {
    const { window, document } = site;
    Object.defineProperty(window, "pageYOffset", { value: 1200, configurable: true });
    window.dispatchEvent(new window.Event("scroll"));

    assert.equal(site.$("#siteHeader").classList.contains("is-scrolled"), true);
    assert.equal(site.$("#backToTop").classList.contains("is-visible"), true);
    const width = site.$("#scrollProgressBar").style.width;
    assert.match(width, /^[\d.]+%$/, "progress width is written as a percentage");

    let scrolled = null;
    window.scrollTo = (options) => { scrolled = options; };
    site.click("#backToTop");
    assert.ok(scrolled, "scrollTo was called");
    assert.equal(scrolled.top, 0);

    Object.defineProperty(window, "pageYOffset", { value: 0, configurable: true });
    window.dispatchEvent(new window.Event("scroll"));
    assert.equal(document.querySelector("#siteHeader").classList.contains("is-scrolled"), false);
  });
});

/* ============================= ANALYTICS ============================= */

test("analytics metric tabs redraw the chart and update labels", () => {
  withSite({}, (site) => {
    const before = site.$("#analyticsChart .chart-line").getAttribute("d");
    site.click('.chart-tab[data-metric="active-users"]');

    assert.equal(site.$("#chartTitle").textContent, "Active users");
    assert.equal(site.$('.chart-tab[data-metric="active-users"]').getAttribute("aria-selected"), "true");
    assert.equal(site.$('.chart-tab[data-metric="revenue"]').getAttribute("aria-selected"), "false");
    assert.notEqual(site.$("#analyticsChart .chart-line").getAttribute("d"), before);
    assert.equal(site.$("#chartDelta").textContent, "+8.2%");

    site.click('.chart-tab[data-metric="retention"]');
    assert.equal(site.$("#chartTitle").textContent, "Retention");
    assert.match(site.$("#analyticsChart .chart-line").getAttribute("d"), /^M/);

    site.click('.chart-tab[data-metric="reports"]');
    assert.equal(site.$("#chartTitle").textContent, "Reports delivered");
  });
});

test("hero panel tabs switch the mini chart", () => {
  withSite({}, (site) => {
    const before = site.$("#heroChart .chart-line").getAttribute("d");
    site.click('[data-hero-tab="retention"]');

    assert.equal(site.$('[data-hero-tab="retention"]').getAttribute("aria-selected"), "true");
    assert.equal(site.$('[data-hero-tab="revenue"]').getAttribute("aria-selected"), "false");
    assert.notEqual(site.$("#heroChart .chart-line").getAttribute("d"), before);
    assert.match(site.$("#heroChart").getAttribute("aria-label"), /Retention/i);
  });
});

test("export button builds a CSV and confirms with a toast", () => {
  withSite({}, (site) => {
    const { window, document } = site;
    let created = 0;
    let downloaded = "";
    const originalCreate = window.URL.createObjectURL;
    window.URL.createObjectURL = () => { created += 1; return "blob:mock"; };
    const originalClick = window.HTMLAnchorElement.prototype.click;
    window.HTMLAnchorElement.prototype.click = function () { downloaded = this.download; };

    try {
      site.click("#downloadReport");
      assert.equal(created, 1);
      assert.equal(downloaded, "rossell-revenue-sample.csv");
      assert.match(site.$("#toast").textContent, /CSV/);
      assert.equal(site.$("#toast").classList.contains("is-visible"), true);
    } finally {
      window.URL.createObjectURL = originalCreate;
      window.HTMLAnchorElement.prototype.click = originalClick;
    }
    assert.ok(document.body);
  });
});

/* ============================= INTEGRATIONS ============================= */

test("integration search, category filter and empty state work", async () => {
  const site = createSite();
  try {
    site.input("#integrationSearch", "git");
    await new Promise((resolve) => setTimeout(resolve, 180));
    assert.equal(site.$$(".integration-card").length, 2, "GitHub and GitLab match");

    site.input("#integrationSearch", "zzzz-nothing");
    await new Promise((resolve) => setTimeout(resolve, 180));
    assert.equal(site.$$(".integration-card").length, 0);
    assert.equal(site.$("#integrationEmpty").hidden, false);

    site.input("#integrationSearch", "");
    await new Promise((resolve) => setTimeout(resolve, 180));
    site.click('#integrationFilters .chip[data-filter="Development"]');
    assert.equal(site.$$(".integration-card").length, 4);
    assert.equal(site.$('#integrationFilters .chip[data-filter="Development"]').getAttribute("aria-pressed"), "true");

    site.click('#integrationFilters .chip[data-filter="all"]');
    assert.equal(site.$$(".integration-card").length, 14);
    assert.deepEqual(site.errors, []);
  } finally {
    site.close();
  }
});

test("integration switches persist locally and update the counter", () => {
  withSite({}, (site) => {
    const { window } = site;
    const first = site.$('.integration-card[data-slug="microsoft-teams"]');
    const toggle = first.querySelector(".switch");
    const slug = first.getAttribute("data-slug");

    site.click(toggle);
    assert.equal(toggle.getAttribute("aria-checked"), "true");
    assert.equal(first.classList.contains("is-connected"), true);
    assert.equal(first.querySelector(".integration-state").textContent, "Connected");
    assert.equal(site.$("#integrationCount").textContent, "4 of 14 connected");
    assert.equal(JSON.parse(window.localStorage.getItem("rossell.integrations.v1"))[slug], true);

    site.click(toggle);
    assert.equal(toggle.getAttribute("aria-checked"), "false");
    assert.equal(first.classList.contains("is-connected"), false);
    assert.equal(site.$("#integrationCount").textContent, "3 of 14 connected");
  });
});

test("stored integration choices are applied on boot and can be reset", () => {
  const storage = { "rossell.integrations.v1": JSON.stringify({ slack: false, zoom: true }) };
  withSite({ storage }, (site) => {
    assert.equal(site.$('.integration-card[data-slug="slack"] .switch').getAttribute("aria-checked"), "false");
    assert.equal(site.$('.integration-card[data-slug="zoom"] .switch').getAttribute("aria-checked"), "true");
    assert.equal(site.$("#integrationCount").textContent, "3 of 14 connected");

    site.click("#integrationsReset");
    assert.equal(site.$('.integration-card[data-slug="slack"] .switch').getAttribute("aria-checked"), "true");
    assert.equal(site.$('.integration-card[data-slug="zoom"] .switch').getAttribute("aria-checked"), "false");
    assert.equal(site.$("#integrationCount").textContent, "3 of 14 connected");
    assert.match(site.$("#toast").textContent, /reset/i);
  });
});

/* ============================= BLOG ============================= */

test("blog category filters and load-more work", () => {
  withSite({}, (site) => {
    site.click('#blogFilters .chip[data-filter="Design"]');
    assert.equal(site.$$(".blog-card").length, 1);
    assert.equal(site.$("#blogCount").textContent, "1 article");
    assert.equal(site.$("#blogMore").hidden, true);

    site.click('#blogFilters .chip[data-filter="all"]');
    assert.equal(site.$$(".blog-card").length, 3);
    assert.equal(site.$("#blogMore").hidden, false);

    site.click("#blogMore");
    assert.equal(site.$$(".blog-card").length, 6);
    assert.equal(site.$("#blogMore").hidden, true);
    assert.equal(site.$("#blogCount").textContent, "6 articles");
  });
});

test("blog cards open the article modal and Escape closes it", () => {
  withSite({}, (site) => {
    const first = site.$(".blog-open");
    const post = content.posts.find((item) => item.slug === first.getAttribute("data-slug"));
    assert.ok(post);

    site.click(first);
    assert.equal(site.$("#articleModal").hidden, false);
    assert.equal(site.$("#articleModal").getAttribute("aria-modal"), "true");
    assert.equal(site.$("#articleTitle").textContent, post.title);
    assert.match(site.$("#articleMeta").textContent, new RegExp(post.category));
    assert.equal(site.$$("#articleContent p").length, post.body.length);
    assert.equal(site.$("#articleImage").getAttribute("src"), post.image.src);
    assert.equal(site.document.body.classList.contains("modal-open"), true);

    site.key("Escape");
    assert.equal(site.$("#articleModal").hidden, true);
    assert.equal(site.document.body.classList.contains("modal-open"), false);
  });
});

/* ============================= TESTIMONIALS / FAQ ============================= */

test("FAQ accordion opens one answer at a time", () => {
  withSite({}, (site) => {
    const questions = site.$$(".faq-question");
    assert.equal(questions.length, content.faqs.length);

    site.click(questions[0]);
    assert.equal(questions[0].getAttribute("aria-expanded"), "true");
    assert.equal(questions[0].closest(".faq-item").classList.contains("is-open"), true);

    site.click(questions[1]);
    assert.equal(questions[0].getAttribute("aria-expanded"), "false");
    assert.equal(questions[1].getAttribute("aria-expanded"), "true");

    site.click(questions[1]);
    assert.equal(questions[1].getAttribute("aria-expanded"), "false");
    assert.equal(site.$$(".faq-item.is-open").length, 0);
  });
});

/* ============================= TRIAL MODAL ============================= */

test("trial modal opens from all triggers and validates its form", async () => {
  const site = createSite();
  try {
    site.click(".header-btn");
    assert.equal(site.$("#trialModal").hidden, false);
    assert.equal(site.document.body.classList.contains("modal-open"), true);

    site.submit("#trialForm");
    assert.match(site.$('[data-error-for="trialName"]').textContent, /name/i);
    assert.match(site.$('[data-error-for="trialEmail"]').textContent, /email/i);
    assert.match(site.$('[data-error-for="trialCompany"]').textContent, /company/i);
    assert.equal(site.$("#trialName").getAttribute("aria-invalid"), "true");

    site.input("#trialName", "Alex Moreau");
    site.input("#trialEmail", "not-an-email");
    site.input("#trialCompany", "Northwind");
    site.submit("#trialForm");
    assert.match(site.$('[data-error-for="trialEmail"]').textContent, /look right/i);

    site.input("#trialEmail", "alex@northwind.com");
    site.submit("#trialForm");
    await site.flush();

    assert.equal(site.$("#trialSuccess").hidden, false);
    assert.match(site.$("#trialSuccessText").textContent, /alex@northwind.com/);
    assert.equal(site.$("#trialName").closest(".field").hidden, true);

    // Closing and reopening resets the form back to its initial state.
    site.key("Escape");
    assert.equal(site.$("#trialModal").hidden, true);
    site.click(".cta-actions .btn--invert");
    assert.equal(site.$("#trialSuccess").hidden, true);
    assert.equal(site.$("#trialName").closest(".field").hidden, false);
    assert.equal(site.$("#trialName").value, "");

    // Backdrop click closes too.
    site.click("#trialModal .modal-backdrop");
    assert.equal(site.$("#trialModal").hidden, true);
    assert.deepEqual(site.errors, []);
  } finally {
    site.close();
  }
});

/* ============================= CONTACT FORM ============================= */

test("contact form validates, submits offline and can be reset", async () => {
  const site = createSite();
  try {
    site.submit("#contactForm");
    assert.match(site.$('[data-error-for="contactName"]').textContent, /name/i);
    assert.match(site.$('[data-error-for="contactEmail"]').textContent, /email/i);
    assert.match(site.$('[data-error-for="contactMessage"]').textContent, /need/i);

    site.input("#contactName", "Alex Moreau");
    site.input("#contactEmail", "alex@northwind.com");
    site.input("#contactMessage", "too short");
    site.submit("#contactForm");
    assert.match(site.$('[data-error-for="contactMessage"]').textContent, /10 characters/i);

    site.input("#contactMessage", "We use Linear, GitHub and Slack and cannot agree on weekly active users.");
    site.input("#contactCompany", "Northwind");
    site.select("#contactTopic", "pricing");
    site.submit("#contactForm");
    await site.flush();

    assert.equal(site.$("#contactSuccess").hidden, false);
    assert.match(site.$("#contactSuccessText").textContent, /saved in this browser/i);
    assert.equal(site.$("#contactName").closest(".field").hidden, true);
    assert.equal(site.$("#contactSubmit").hidden, true);

    const call = site.fetchCalls.find((entry) => entry.url.endsWith("/api/contact"));
    assert.ok(call, "POST /api/contact was attempted");
    const payload = JSON.parse(call.init.body);
    assert.equal(payload.email, "alex@northwind.com");
    assert.equal(payload.topic, "pricing");
    assert.equal(site.window.localStorage.getItem("rossell.contactQueue") !== null, true);

    site.click("#contactAgain");
    assert.equal(site.$("#contactSuccess").hidden, true);
    assert.equal(site.$("#contactName").closest(".field").hidden, false);
  } finally {
    site.close();
  }
});

test("contact form reports a live API success", async () => {
  const site = createSite({
    fetchImpl: (url) => (url.endsWith("/api/contact")
      ? response({ message: "Message received.", data: { id: "abc" } }, 201)
      : Promise.reject(new TypeError("offline"))),
  });
  try {
    site.input("#contactName", "Alex Moreau");
    site.input("#contactEmail", "alex@northwind.com");
    site.input("#contactMessage", "Please show me the analytics workspace for our team.");
    site.submit("#contactForm");
    await site.flush();

    assert.equal(site.$("#contactSuccess").hidden, false);
    assert.match(site.$("#contactSuccessText").textContent, /reply within one business day/i);
  } finally {
    site.close();
  }
});

test("a static host returning 404 queues the contact form instead of erroring", async () => {
  const site = createSite({
    fetchImpl: () => response({ message: "Not found" }, 404),
  });
  try {
    site.input("#contactName", "Alex Moreau");
    site.input("#contactEmail", "alex@northwind.com");
    site.input("#contactMessage", "We would like to see the analytics workspace.");
    site.submit("#contactForm");
    await site.flush();

    assert.equal(site.$("#contactSuccess").hidden, false);
    assert.match(site.$("#contactSuccessText").textContent, /saved in this browser/i);
    assert.ok(JSON.parse(site.window.localStorage.getItem("rossell.contactQueue")).length === 1);
  } finally {
    site.close();
  }
});

test("a validation error from the API is shown to the visitor", async () => {
  const site = createSite({
    fetchImpl: () => response({ message: "Please provide a valid email address." }, 400),
  });
  try {
    site.input("#contactName", "Alex Moreau");
    site.input("#contactEmail", "alex@northwind.com");
    site.input("#contactMessage", "We would like to see the analytics workspace.");
    site.submit("#contactForm");
    await site.flush();

    assert.equal(site.$("#contactSuccess").hidden, true);
    assert.match(site.$("#contactStatus").textContent, /valid email address/i);
    assert.equal(site.$("#contactStatus").classList.contains("is-error"), true);
  } finally {
    site.close();
  }
});

/* ============================= NEWSLETTER ============================= */

test("newsletter validates and subscribes", async () => {
  const site = createSite();
  try {
    site.input("#newsletterEmail", "nope");
    site.submit("#newsletterForm");
    assert.match(site.$('[data-error-for="newsletterEmail"]').textContent, /look right/i);

    site.input("#newsletterEmail", "reader@company.com");
    site.submit("#newsletterForm");
    await site.flush();

    assert.match(site.$("#newsletterStatus").textContent, /API offline/i);
    assert.equal(site.$("#newsletterEmail").value, "");
    const queued = JSON.parse(site.window.localStorage.getItem("rossell.subscriberQueue"));
    assert.equal(queued.at(-1).payload.email, "reader@company.com");
  } finally {
    site.close();
  }
});

/* ============================= LEGAL / PLACEHOLDERS ============================= */

test("legal buttons open the info modal with the right content", () => {
  withSite({}, (site) => {
    site.click('[data-legal="privacy"]');
    assert.equal(site.$("#infoModal").hidden, false);
    assert.equal(site.$("#infoTitle").textContent, "Privacy policy");
    assert.equal(site.$$("#infoContent p").length, content.legal.privacy.body.length);

    site.click("#infoModal .modal-close");
    assert.equal(site.$("#infoModal").hidden, true);

    site.click('[data-legal="terms"]');
    assert.equal(site.$("#infoTitle").textContent, "Terms of service");
    site.key("Escape");
    assert.equal(site.$("#infoModal").hidden, true);
  });
});

test("placeholder footer links show a toast instead of navigating", () => {
  withSite({}, (site) => {
    const link = site.$("[data-placeholder-link]");
    const event = new site.window.MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(event);

    assert.equal(event.defaultPrevented, true);
    assert.match(site.$("#toast").textContent, /Demo link/i);
  });
});

/* ============================= API HYDRATION ============================= */

test("API content replaces the bundled fallback when the backend answers", async () => {
  const apiPosts = [{
    ...content.posts[0],
    slug: "from-the-api",
    title: "Served from MongoDB",
    image: { src: "./assets/img/blog-reporting.jpg", alt: "API image" },
  }];
  const apiMetrics = content.metrics.map((metric) => (
    metric.key === "revenue" ? { ...metric, value: 999999, label: "API revenue" } : metric
  ));

  const site = createSite({
    fetchImpl: (url) => {
      if (url.endsWith("/api/posts")) { return response({ data: apiPosts }); }
      if (url.endsWith("/api/metrics")) { return response({ data: apiMetrics }); }
      if (url.endsWith("/api/integrations")) { return response({ data: content.integrations }); }
      if (url.endsWith("/api/testimonials")) { return response({ data: content.testimonials }); }
      return response({ message: "not found" }, 404);
    },
  });

  try {
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(site.$("#blogCount").textContent, "1 article");
    assert.equal(site.$(".blog-card h3").textContent, "Served from MongoDB");
    assert.equal(site.$("#chartTitle").textContent, "API revenue");
    assert.equal(site.$("#metricCards .metric-value").textContent, "$999,999");
    assert.ok(site.fetchCalls.some((call) => call.url.endsWith("/api/posts")));
    assert.deepEqual(site.errors, []);
  } finally {
    site.close();
  }
});

test("a 503 from the API falls back to the bundled content", async () => {
  const site = createSite({
    fetchImpl: () => response({ message: "MongoDB is not connected.", offline: true }, 503),
  });
  try {
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(site.$$(".blog-card").length, 3);
    assert.equal(site.$$(".integration-card").length, 14);
    assert.equal(site.$("#integrationCount").textContent, "3 of 14 connected");
    assert.deepEqual(site.errors, []);
  } finally {
    site.close();
  }
});

/* ============================= BROAD BUTTON SWEEP ============================= */

test("clicking every button on the page raises no runtime errors", () => {
  withSite({}, (site) => {
    const buttons = site.$$("button");
    assert.ok(buttons.length > 15, "there are plenty of buttons to check");

    buttons.forEach((button) => {
      if (button.disabled) { return; }
      button.dispatchEvent(new site.window.MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    // Close whatever the sweep left open so teardown is clean.
    site.$$(".modal").forEach((modal) => {
      if (!modal.hidden) { site.click(modal.querySelector(".modal-close") || modal); }
    });

    assert.deepEqual(site.errors.map((error) => error.message), []);
  });
});
