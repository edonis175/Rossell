/**
 * scripts/main.js
 * ---------------------------------------------------------------------------
 * Rossell front end.
 *
 *  1. Helpers            7. Charts
 *  2. Motion setup       8. Content hydration (metrics, integrations, blog…)
 *  3. Theme              9. Forms
 *  4. Custom cursor     10. FAQ / legal / utilities
 *  5. Header + nav      11. Boot
 *  6. Modals
 *
 * Every animated element is visible by default in CSS. GSAP only adds the
 * entrance, so a blocked/failed script can never leave the page blank.
 * ---------------------------------------------------------------------------
 */
(function (window, document) {
    "use strict";

    /* ============================= 1. HELPERS ============================= */

    var content = window.ROSSELL_CONTENT || {};
    var api = window.RossellAPI || null;
    var $ = function (selector, root) { return (root || document).querySelector(selector); };
    var $$ = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };

    var reduceMotion = false;
    var finePointer = false;
    try { reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (error) { /* old browsers */ }
    try { finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches; } catch (error) { /* old browsers */ }

    function esc(value) {
        return String(value === null || value === undefined ? "" : value).replace(/[&<>"']/g, function (character) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
        });
    }

    function initials(name) {
        return String(name || "")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(function (part) { return part.charAt(0).toUpperCase(); })
            .join("");
    }

    var numberFormatter = new Intl.NumberFormat("en-US");

    function formatNumber(value, format) {
        var numeric = Number(value);
        if (!isFinite(numeric)) { return String(value); }
        switch (format) {
            case "currency":
                return "$" + numberFormatter.format(Math.round(numeric));
            case "percent":
                return numeric.toFixed(1) + "%";
            case "decimal":
                return numeric.toFixed(2);
            case "compact":
                return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(numeric);
            default:
                return numberFormatter.format(numeric);
        }
    }

    function formatDelta(delta) {
        var numeric = Number(delta) || 0;
        return (numeric >= 0 ? "+" : "") + numeric.toFixed(1) + "%";
    }

    function formatDate(iso) {
        var date = new Date(iso);
        if (isNaN(date.getTime())) { return String(iso || ""); }
        try {
            return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
        } catch (error) {
            return date.toDateString();
        }
    }

    /* Toast ---------------------------------------------------------------- */

    var toastElement = $("#toast");
    var toastTimer = null;

    function toast(message, duration) {
        if (!toastElement) { return; }
        toastElement.textContent = message;
        toastElement.classList.add("is-visible");
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () {
            toastElement.classList.remove("is-visible");
        }, duration || 3200);
    }

    /* ============================= 2. MOTION SETUP ============================= */

    var gsap = window.gsap || null;
    var ScrollTrigger = window.ScrollTrigger || null;
    var hasGsap = !!(gsap && ScrollTrigger);

    if (hasGsap) {
        try { gsap.registerPlugin(ScrollTrigger); } catch (error) { hasGsap = false; }
    }

    var animate = hasGsap && !reduceMotion;
    var revealsReady = false;

    var FROM = {
        up: { y: 42, opacity: 0 },
        down: { y: -42, opacity: 0 },
        left: { x: -64, opacity: 0 },
        right: { x: 64, opacity: 0 },
        scale: { scale: 0.92, opacity: 0, transformOrigin: "50% 60%" },
        rotate: { rotate: -4, y: 26, opacity: 0, transformOrigin: "0% 100%" },
        fade: { opacity: 0 },
    };

    function revealNew(nodes, direction, trigger) {
        // Before initReveals() runs, the containers themselves are animated,
        // so individual renders stay silent to avoid double tweens.
        if (!animate || !revealsReady || !nodes || !nodes.length) { return; }
        gsap.from(nodes, Object.assign({}, FROM[direction || "up"], {
            duration: 0.8,
            stagger: 0.07,
            ease: "power3.out",
            clearProps: "transform,opacity,filter",
            scrollTrigger: {
                trigger: trigger || nodes[0].parentNode || nodes[0],
                start: "top 88%",
                once: true,
            },
        }));
    }

    function initReveals() {
        if (!animate) { return; }

        var handled = [];

        $$("[data-stagger]").forEach(function (group) {
            if (group.closest(".hero")) { return; }
            var children = $$("[data-anim]", group).filter(function (child) {
                return child.closest("[data-stagger]") === group;
            });
            if (!children.length) { return; }
            children.forEach(function (child) { handled.push(child); });

            var direction = children[0].getAttribute("data-anim") || "up";
            gsap.from(children, Object.assign({}, FROM[direction] || FROM.up, {
                duration: 0.85,
                stagger: 0.075,
                ease: "power3.out",
                clearProps: "transform,opacity,filter",
                scrollTrigger: { trigger: group, start: "top 86%", once: true },
            }));
        });

        $$("[data-anim]").forEach(function (element) {
            if (handled.indexOf(element) !== -1 || element.closest(".hero")) { return; }
            var direction = element.getAttribute("data-anim") || "up";
            var delay = parseFloat(element.getAttribute("data-delay") || "0") || 0;
            gsap.from(element, Object.assign({}, FROM[direction] || FROM.up, {
                duration: 0.9,
                delay: delay,
                ease: "power3.out",
                clearProps: "transform,opacity,filter",
                scrollTrigger: { trigger: element, start: "top 88%", once: true },
            }));
        });

        revealsReady = true;
    }

    function initHeroTimeline() {
        if (!animate) { return; }
        var lines = $$(".hero-title .line > span");
        var timeline = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.12 });

        if (lines.length) {
            timeline.from(lines, { yPercent: 116, duration: 1.05, stagger: 0.09 }, 0);
        }
        timeline
            .from(".hero .eyebrow", { y: 16, opacity: 0, duration: 0.7 }, 0.1)
            .from(".hero-lead", { y: 22, opacity: 0, duration: 0.8 }, 0.28)
            .from(".hero-actions", { y: 22, opacity: 0, duration: 0.8 }, 0.38)
            .from(".hero-note", { y: 12, opacity: 0, duration: 0.7 }, 0.46)
            .from(".hero-stats li", { y: 18, opacity: 0, duration: 0.7, stagger: 0.08 }, 0.5)
            .from(".hero-visual", { x: 52, opacity: 0, duration: 1.05 }, 0.2);
    }

    function initParallax() {
        if (!animate) { return; }
        var visual = $(".hero-visual");
        if (visual) {
            gsap.to(visual, {
                yPercent: -5,
                ease: "none",
                scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 },
            });
        }
    }

    function initCounters() {
        $$("[data-counter]").forEach(function (element) {
            var target = parseFloat(element.getAttribute("data-counter"));
            if (isNaN(target)) { return; }
            var decimals = parseInt(element.getAttribute("data-counter-decimals") || "0", 10) || 0;
            var suffix = element.getAttribute("data-counter-suffix") || "";
            var format = function (value) {
                return value.toLocaleString("en-US", {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals,
                }) + suffix;
            };

            // Render the final value first: if the animation never runs the
            // number is still correct (and readable for screen readers).
            element.textContent = format(target);
            if (!animate) { return; }

            var state = { value: 0 };
            var tween = gsap.to(state, {
                value: target,
                duration: 1.5,
                ease: "power2.out",
                paused: true,
                onUpdate: function () { element.textContent = format(state.value); },
            });

            ScrollTrigger.create({
                trigger: element,
                start: "top 95%",
                once: true,
                onEnter: function () {
                    if (tween && typeof tween.play === "function") { tween.play(); }
                },
            });
        });
    }

    /* ============================= 3. THEME ============================= */

    var root = document.documentElement;
    var themeToggle = $("#themeToggle");
    var themeMeta = document.querySelector('meta[name="theme-color"]');

    function applyTheme(theme, persist) {
        var isDark = theme === "dark";
        root.setAttribute("data-theme", theme);
        document.body.classList.toggle("dark-mode", isDark);

        if (themeToggle) {
            themeToggle.setAttribute("aria-pressed", isDark ? "true" : "false");
            themeToggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
        }
        if (themeMeta) {
            themeMeta.setAttribute("content", isDark ? "#121210" : "#f6f3eb");
        }
        if (persist) {
            try { window.localStorage.setItem("theme", theme); } catch (error) { /* blocked storage */ }
        }
    }

    function initTheme() {
        applyTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light", false);

        if (themeToggle) {
            themeToggle.addEventListener("click", function () {
                var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
                applyTheme(next, true);
                if (hasGsap && !reduceMotion) {
                    gsap.fromTo(themeToggle, { rotate: 0 }, {
                        rotate: next === "dark" ? -22 : 22,
                        duration: 0.28,
                        yoyo: true,
                        repeat: 1,
                        ease: "power2.inOut",
                        clearProps: "transform",
                    });
                }
                if (hasGsap && ScrollTrigger) { ScrollTrigger.refresh(); }
            });
        }

        // Follow the system only while the visitor has not chosen a theme.
        try {
            var media = window.matchMedia("(prefers-color-scheme: dark)");
            var onChange = function (event) {
                var stored = null;
                try { stored = window.localStorage.getItem("theme"); } catch (error) { stored = null; }
                if (!stored) { applyTheme(event.matches ? "dark" : "light", false); }
            };
            if (typeof media.addEventListener === "function") { media.addEventListener("change", onChange); }
            else if (typeof media.addListener === "function") { media.addListener(onChange); }
        } catch (error) { /* matchMedia unavailable */ }
    }

    /* ============================= 4. CUSTOM CURSOR ============================= */

    function initCursor() {
        var cursor = $(".cursor");
        if (!cursor || !finePointer) { return; }

        document.body.classList.add("has-custom-cursor");

        var mouseX = window.innerWidth / 2;
        var mouseY = window.innerHeight / 2;
        var currentX = mouseX;
        var currentY = mouseY;
        var frame = null;

        function render() {
            currentX += (mouseX - currentX) * 0.18;
            currentY += (mouseY - currentY) * 0.18;
            cursor.style.transform = "translate3d(" + currentX.toFixed(2) + "px, " + currentY.toFixed(2) + "px, 0) translate(-50%, -50%)";
            frame = window.requestAnimationFrame(render);
        }

        document.addEventListener("mousemove", function (event) {
            mouseX = event.clientX;
            mouseY = event.clientY;
            if (!frame) { render(); }
        }, { passive: true });

        render();

        var isLarge = false;
        var interactive = "a, button, input, select, textarea, [role='switch'], .blog-card";

        function sizeTo(wide) {
            if (wide === isLarge) { return; }
            isLarge = wide;
            var size = wide ? 34 : 12;
            if (hasGsap) {
                gsap.to(cursor, { width: size, height: size, duration: 0.28, ease: "power2.out" });
            } else {
                cursor.style.width = size + "px";
                cursor.style.height = size + "px";
            }
        }

        document.addEventListener("mouseover", function (event) {
            if (event.target.closest && event.target.closest(interactive)) { sizeTo(true); }
        });
        document.addEventListener("mouseout", function (event) {
            if (event.target.closest && event.target.closest(interactive)) { sizeTo(false); }
        });
        document.addEventListener("mouseleave", function () { sizeTo(false); });
    }

    /* ============================= 5. HEADER + NAV ============================= */

    var header = $("#siteHeader");
    var progressBar = $("#scrollProgressBar");
    var backToTop = $("#backToTop");
    var navLinks = $$(".header-nav a[data-nav]");
    var navSections = navLinks.map(function (link) {
        return document.getElementById(link.getAttribute("data-nav"));
    }).filter(Boolean);

    function updateActiveNav(scrollY) {
        if (!navSections.length) { return; }
        var position = scrollY + Math.round(window.innerHeight * 0.32);
        var current = null;

        navSections.forEach(function (section) {
            var top = section.getBoundingClientRect().top + (window.pageYOffset || 0);
            if (top <= position) { current = section.id; }
        });

        navLinks.forEach(function (link) {
            var active = link.getAttribute("data-nav") === current;
            link.classList.toggle("is-active", active);
            if (active) { link.setAttribute("aria-current", "page"); }
            else { link.removeAttribute("aria-current"); }
        });
    }

    function onScroll() {
        var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;

        if (header) { header.classList.toggle("is-scrolled", scrollY > 16); }

        if (progressBar) {
            var track = document.documentElement.scrollHeight - window.innerHeight;
            var ratio = track > 0 ? Math.min(1, scrollY / track) : 0;
            progressBar.style.width = (ratio * 100).toFixed(2) + "%";
        }

        if (backToTop) { backToTop.classList.toggle("is-visible", scrollY > 520); }

        updateActiveNav(scrollY);
    }

    function initHeader() {
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll, { passive: true });
        onScroll();

        if (backToTop) {
            backToTop.addEventListener("click", function () {
                try {
                    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
                } catch (error) {
                    window.scrollTo(0, 0);
                }
            });
        }
    }

    /* Mobile navigation ----------------------------------------------------- */

    var hamburger = $("#hamburgerBtn");
    var mobileNav = $("#mobileNav");
    var mobileNavClose = $("#mobileNavClose");

    function isMobileNavOpen() {
        return !!mobileNav && !mobileNav.hasAttribute("hidden");
    }

    function openMobileNav() {
        if (!mobileNav) { return; }
        mobileNav.removeAttribute("hidden");
        document.body.classList.add("nav-open");
        if (hamburger) {
            hamburger.classList.add("is-open");
            hamburger.setAttribute("aria-expanded", "true");
            hamburger.setAttribute("aria-label", "Close menu");
        }
        if (mobileNavClose) { mobileNavClose.focus({ preventScroll: true }); }
    }

    function closeMobileNav(returnFocus) {
        if (!mobileNav || !isMobileNavOpen()) { return; }
        mobileNav.setAttribute("hidden", "");
        document.body.classList.remove("nav-open");
        if (hamburger) {
            hamburger.classList.remove("is-open");
            hamburger.setAttribute("aria-expanded", "false");
            hamburger.setAttribute("aria-label", "Open menu");
            if (returnFocus !== false) { hamburger.focus({ preventScroll: true }); }
        }
    }

    function initMobileNav() {
        if (hamburger) {
            hamburger.addEventListener("click", function () {
                if (isMobileNavOpen()) { closeMobileNav(); } else { openMobileNav(); }
            });
        }
        if (mobileNavClose) { mobileNavClose.addEventListener("click", function () { closeMobileNav(); }); }

        $$("[data-close-mobile]").forEach(function (link) {
            link.addEventListener("click", function () { closeMobileNav(false); });
        });

        if (mobileNav) {
            $$("[data-open-modal]", mobileNav).forEach(function (button) {
                button.addEventListener("click", function () { closeMobileNav(); });
            });
        }
    }

    /* ============================= 6. MODALS ============================= */

    var modalIds = { trial: "trialModal" };
    var lastFocusedElement = null;

    function openModals() {
        return $$(".modal").filter(function (modal) { return !modal.hasAttribute("hidden"); });
    }

    function getFocusable(container) {
        return $$("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])", container)
            .filter(function (element) { return element.offsetParent !== null || element === document.activeElement; });
    }

    function openModal(id) {
        var modal = document.getElementById(id);
        if (!modal) { return; }

        lastFocusedElement = document.activeElement;
        modal.removeAttribute("hidden");
        document.body.classList.add("modal-open");

        if (id === "trialModal") { resetTrialForm(); }

        var focusTarget = $("[data-autofocus]", modal) || getFocusable(modal)[0] || modal;
        if (focusTarget && typeof focusTarget.focus === "function") {
            window.setTimeout(function () { focusTarget.focus({ preventScroll: true }); }, 40);
        }

    }

    function closeModal(modal) {
        if (!modal) { return; }
        modal.setAttribute("hidden", "");
        if (!openModals().length) { document.body.classList.remove("modal-open"); }
        if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
            lastFocusedElement.focus({ preventScroll: true });
        }
        lastFocusedElement = null;
    }

    function trapFocus(event) {
        var open = openModals();
        if (!open.length) { return; }
        var modal = open[open.length - 1];
        var focusable = getFocusable(modal);
        if (!focusable.length) { return; }
        var first = focusable[0];
        var last = focusable[focusable.length - 1];

        if (!modal.contains(document.activeElement)) {
            event.preventDefault();
            first.focus();
            return;
        }
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function initModals() {
        document.addEventListener("click", function (event) {
            var opener = event.target.closest ? event.target.closest("[data-open-modal]") : null;
            if (opener) {
                event.preventDefault();
                var requested = opener.getAttribute("data-open-modal");
                openModal(modalIds[requested] || requested);
                return;
            }

            var closer = event.target.closest ? event.target.closest("[data-close-modal]") : null;
            if (closer) {
                event.preventDefault();
                closeModal(closer.closest(".modal"));
                return;
            }

            var legalButton = event.target.closest ? event.target.closest("[data-legal]") : null;
            if (legalButton) {
                event.preventDefault();
                openLegal(legalButton.getAttribute("data-legal"));
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                var open = openModals();
                if (open.length) {
                    closeModal(open[open.length - 1]);
                    return;
                }
                if (isMobileNavOpen()) { closeMobileNav(); }
            }
            if (event.key === "Tab") { trapFocus(event); }
        });
    }

    /* ============================= 7. CHARTS ============================= */

    function chartPoints(series, width, height, padding) {
        var max = Math.max.apply(null, series);
        var min = Math.min.apply(null, series);
        var span = max - min || 1;
        var step = (width - padding * 2) / Math.max(1, series.length - 1);
        return series.map(function (value, index) {
            return {
                x: padding + index * step,
                y: height - padding - ((value - min) / span) * (height - padding * 2),
            };
        });
    }

    function smoothPath(points) {
        if (!points.length) { return ""; }
        var path = "M" + points[0].x.toFixed(1) + "," + points[0].y.toFixed(1);
        for (var index = 1; index < points.length; index += 1) {
            var previous = points[index - 1];
            var current = points[index];
            var controlX = (previous.x + current.x) / 2;
            path += " C" + controlX.toFixed(1) + "," + previous.y.toFixed(1) +
                " " + controlX.toFixed(1) + "," + current.y.toFixed(1) +
                " " + current.x.toFixed(1) + "," + current.y.toFixed(1);
        }
        return path;
    }

    function drawChart(svg, series, options) {
        if (!svg || !series || !series.length) { return; }
        var settings = options || {};
        var viewBox = (svg.getAttribute("viewBox") || "0 0 560 200").split(/\s+/).map(Number);
        var width = viewBox[2] || 560;
        var height = viewBox[3] || 200;
        var padding = settings.padding === undefined ? 12 : settings.padding;
        var points = chartPoints(series, width, height, padding);
        var path = smoothPath(points);
        var first = points[0];
        var last = points[points.length - 1];
        var line = svg.querySelector(".chart-line");
        var area = svg.querySelector(".chart-area");
        var point = svg.querySelector(".chart-point");

        if (line) {
            line.setAttribute("d", path);
            line.removeAttribute("stroke-dasharray");
            line.removeAttribute("stroke-dashoffset");
            if (animate && typeof line.getTotalLength === "function") {
                try {
                    var length = line.getTotalLength();
                    if (length) {
                        gsap.fromTo(line, { strokeDasharray: length, strokeDashoffset: length }, {
                            strokeDashoffset: 0,
                            duration: settings.duration || 1.2,
                            ease: "power2.out",
                            clearProps: "strokeDashoffset,strokeDasharray",
                        });
                    }
                } catch (error) { /* jsdom / older engines */ }
            }
        }

        if (area) {
            area.setAttribute("d", path + " L" + last.x.toFixed(1) + "," + height + " L" + first.x.toFixed(1) + "," + height + " Z");
        }

        if (point) {
            point.setAttribute("cx", last.x.toFixed(1));
            point.setAttribute("cy", last.y.toFixed(1));
        }
    }

    /* ============================= 8. CONTENT ============================= */

    var metrics = content.metrics || [];
    var channels = content.channels || [];
    var posts = content.posts || [];
    var integrations = content.integrations || [];
    var testimonials = content.testimonials || [];
    var activeMetricKey = null;
    var heroMetricKey = "revenue";
    var POSTS_PER_PAGE = 3;
    var blogState = { category: "all", visible: POSTS_PER_PAGE };
    var integrationState = { filter: "all", query: "" };
    var INTEGRATION_STORE = "rossell.integrations.v1";

    function metricByKey(key) {
        for (var index = 0; index < metrics.length; index += 1) {
            if (metrics[index].key === key) { return metrics[index]; }
        }
        return metrics[0] || null;
    }

    /* ---- Analytics -------------------------------------------------------- */

    function metricCard(metric) {
        var points = chartPoints(metric.series, 120, 34, 2);
        return '<article class="metric-card" data-anim="up">' +
            '<p class="metric-label">' + esc(metric.label) + "</p>" +
            '<strong class="metric-value">' + esc(formatNumber(metric.value, metric.format)) + "</strong>" +
            '<span class="delta ' + (metric.delta < 0 ? "delta--down" : "delta--up") + '">' + esc(formatDelta(metric.delta)) + "</span>" +
            '<svg class="sparkline" viewBox="0 0 120 34" preserveAspectRatio="none" aria-hidden="true">' +
            '<path d="' + smoothPath(points) + '"></path></svg>' +
            "</article>";
    }

    function renderMetricCards() {
        var grid = $("#metricCards");
        if (!grid || !metrics.length) { return; }
        grid.innerHTML = metrics.map(metricCard).join("");
        revealNew($$(".metric-card", grid), "up", grid);
    }

    function renderHeroKpis() {
        ["revenue", "active-users"].forEach(function (key) {
            var metric = metricByKey(key);
            if (!metric) { return; }
            var valueNode = $('[data-hero-value="' + key + '"]');
            var deltaNode = $('[data-hero-delta="' + key + '"]');
            if (valueNode) { valueNode.textContent = formatNumber(metric.value, metric.format); }
            if (deltaNode) {
                deltaNode.textContent = formatDelta(metric.delta);
                deltaNode.classList.toggle("delta--down", metric.delta < 0);
                deltaNode.classList.toggle("delta--up", metric.delta >= 0);
            }
        });
    }

    function applyAnalyticsMetric(key) {
        var metric = metricByKey(key);
        if (!metric) { return; }
        activeMetricKey = metric.key;

        $$("#chartTabs .chart-tab").forEach(function (tab) {
            var active = tab.getAttribute("data-metric") === metric.key;
            tab.classList.toggle("is-active", active);
            tab.setAttribute("aria-selected", active ? "true" : "false");
            tab.setAttribute("tabindex", active ? "0" : "-1");
        });

        var title = $("#chartTitle");
        if (title) { title.textContent = metric.label; }

        var delta = $("#chartDelta");
        if (delta) {
            delta.textContent = formatDelta(metric.delta);
            delta.classList.toggle("delta--down", metric.delta < 0);
            delta.classList.toggle("delta--up", metric.delta >= 0);
        }

        var timeframe = $("#chartTimeframe");
        if (timeframe) { timeframe.textContent = metric.timeframe || "Last 12 weeks"; }

        var description = $("#chartDesc");
        if (description) {
            description.textContent = "Trend line for " + metric.label.toLowerCase() + " over the last twelve weeks.";
        }

        drawChart($("#analyticsChart"), metric.series, { padding: 14 });
    }

    function initChartTabs() {
        var tabs = $("#chartTabs");
        if (!tabs) { return; }
        tabs.addEventListener("click", function (event) {
            var tab = event.target.closest ? event.target.closest(".chart-tab") : null;
            if (!tab) { return; }
            applyAnalyticsMetric(tab.getAttribute("data-metric"));
        });
    }

    function applyHeroMetric(key) {
        var metric = metricByKey(key);
        if (!metric) { return; }
        heroMetricKey = metric.key;

        $$("#heroPanel [data-hero-tab]").forEach(function (tab) {
            var active = tab.getAttribute("data-hero-tab") === metric.key;
            tab.classList.toggle("is-active", active);
            tab.setAttribute("aria-selected", active ? "true" : "false");
        });

        var chart = $("#heroChart");
        drawChart(chart, metric.series, { padding: 10, duration: 0.9 });
        if (chart) { chart.setAttribute("aria-label", metric.label + " over the last twelve weeks"); }

        var foot = $("[data-hero-foot]");
        if (foot) { foot.textContent = metric.label + " · last 12 weeks"; }
    }

    function initHeroPanel() {
        var tabs = $$("#heroPanel [data-hero-tab]");
        tabs.forEach(function (tab) {
            tab.addEventListener("click", function () { applyHeroMetric(tab.getAttribute("data-hero-tab")); });
        });
    }

    function renderChannels(items) {
        var list = $("#channelBars");
        if (!list) { return; }
        list.innerHTML = items.map(function (item) {
            return '<li class="channel-bar">' +
                '<div class="channel-bar-top"><span>' + esc(item.label) + "</span><span>" + esc(item.value) + "%</span></div>" +
                '<div class="bar-track"><span class="bar-fill" data-value="' + esc(item.value) + '"></span></div>' +
                "</li>";
        }).join("");

        var bars = $$(".bar-fill", list);
        if (!bars.length) { return; }

        if (animate) {
            gsap.fromTo(bars, { width: "0%" }, {
                width: function (index, target) { return (target.getAttribute("data-value") || 0) + "%"; },
                duration: 1.1,
                stagger: 0.08,
                ease: "power3.out",
                scrollTrigger: { trigger: list, start: "top 88%", once: true },
            });
        } else {
            bars.forEach(function (bar) { bar.style.width = (bar.getAttribute("data-value") || 0) + "%"; });
        }
    }

    function renderMetrics() {
        if (!metrics.length) { return; }
        renderMetricCards();
        renderHeroKpis();
        applyHeroMetric(heroMetricKey);
        applyAnalyticsMetric(activeMetricKey || metrics[0].key);
    }

    /* ---- Integrations ----------------------------------------------------- */

    function readIntegrationStore() {
        try { return JSON.parse(window.localStorage.getItem(INTEGRATION_STORE) || "{}") || {}; } catch (error) { return {}; }
    }

    function writeIntegrationStore(map) {
        try { window.localStorage.setItem(INTEGRATION_STORE, JSON.stringify(map)); } catch (error) { /* blocked */ }
    }

    function mergeIntegrationState(list) {
        var stored = readIntegrationStore();
        return list.map(function (item) {
            var override = stored[item.slug];
            return Object.assign({}, item, {
                connected: typeof override === "boolean" ? override : !!item.connected,
            });
        });
    }

    function connectedCount() {
        return integrations.filter(function (item) { return item.connected; }).length;
    }

    function integrationCard(item) {
        var connected = !!item.connected;
        return '<article class="integration-card' + (connected ? " is-connected" : "") + '" data-anim="up" data-slug="' + esc(item.slug) + '">' +
            '<div class="integration-top">' +
            '<span class="integration-mark" aria-hidden="true">' + esc(item.mark) + "</span>" +
            "<span><span class=\"integration-name\">" + esc(item.name) + "</span>" +
            '<span class="integration-cat">' + esc(item.category) + "</span></span>" +
            "</div>" +
            '<p class="integration-desc">' + esc(item.description) + "</p>" +
            '<div class="integration-foot">' +
            '<span class="integration-state">' + (connected ? "Connected" : "Not connected") + "</span>" +
            '<button class="switch" type="button" role="switch" aria-checked="' + (connected ? "true" : "false") + '" ' +
            'aria-label="' + (connected ? "Disconnect " : "Connect ") + esc(item.name) + '" data-toggle="' + esc(item.slug) + '"></button>' +
            "</div></article>";
    }

    function updateIntegrationSummary() {
        var count = $("#integrationCount");
        if (count) { count.textContent = connectedCount() + " of " + integrations.length + " connected"; }
        var reset = $("#integrationsReset");
        if (reset) { reset.hidden = connectedCount() === 0; }
    }

    function renderIntegrations(animateCards) {
        var grid = $("#integrationGrid");
        if (!grid) { return; }
        var query = integrationState.query.trim().toLowerCase();
        var visible = integrations.filter(function (item) {
            var matchesFilter = integrationState.filter === "all" || item.category === integrationState.filter;
            var haystack = (item.name + " " + item.category + " " + item.description).toLowerCase();
            return matchesFilter && (!query || haystack.indexOf(query) !== -1);
        });

        grid.innerHTML = visible.map(integrationCard).join("");
        updateIntegrationSummary();

        var empty = $("#integrationEmpty");
        if (empty) { empty.hidden = visible.length !== 0; }

        if (animateCards !== false) { revealNew($$(".integration-card", grid), "up", grid); }
    }

    function setIntegrationConnected(slug, connected, card) {
        var item = null;
        integrations.forEach(function (candidate) {
            if (candidate.slug === slug) { item = candidate; }
        });
        if (!item) { return; }

        item.connected = connected;
        var target = card || $('.integration-card[data-slug="' + slug + '"]');

        if (target) {
            target.classList.toggle("is-connected", connected);
            var state = $(".integration-state", target);
            if (state) { state.textContent = connected ? "Connected" : "Not connected"; }
            var toggle = $(".switch", target);
            if (toggle) {
                toggle.setAttribute("aria-checked", connected ? "true" : "false");
                toggle.setAttribute("aria-label", (connected ? "Disconnect " : "Connect ") + item.name);
            }
        }

        var stored = readIntegrationStore();
        stored[slug] = connected;
        writeIntegrationStore(stored);
        updateIntegrationSummary();

        if (api) { api.toggleIntegration(slug, connected).catch(function () { /* offline: local state is enough */ }); }
        toast(connected ? item.name + " connected" : item.name + " disconnected");
    }

    function initFilterGroup(container, callback) {
        container.addEventListener("click", function (event) {
            var chip = event.target.closest ? event.target.closest(".chip") : null;
            if (!chip || !container.contains(chip)) { return; }
            $$(".chip", container).forEach(function (button) {
                var active = button === chip;
                button.classList.toggle("is-active", active);
                button.setAttribute("aria-pressed", active ? "true" : "false");
            });
            callback(chip.getAttribute("data-filter"));
        });
    }

    function initIntegrations() {
        integrations = mergeIntegrationState(integrations);
        renderIntegrations();

        var grid = $("#integrationGrid");
        if (grid) {
            grid.addEventListener("click", function (event) {
                var toggle = event.target.closest ? event.target.closest(".switch") : null;
                if (!toggle) { return; }
                var card = toggle.closest(".integration-card");
                var slug = toggle.getAttribute("data-toggle") || (card && card.getAttribute("data-slug"));
                setIntegrationConnected(slug, toggle.getAttribute("aria-checked") !== "true", card);
            });
        }

        var filters = $("#integrationFilters");
        if (filters) {
            initFilterGroup(filters, function (value) {
                integrationState.filter = value;
                renderIntegrations();
            });
        }

        var search = $("#integrationSearch");
        if (search) {
            var searchTimer = null;
            search.addEventListener("input", function () {
                window.clearTimeout(searchTimer);
                searchTimer = window.setTimeout(function () {
                    integrationState.query = search.value;
                    renderIntegrations();
                }, 130);
            });
        }

        var reset = $("#integrationsReset");
        if (reset) {
            reset.addEventListener("click", function () {
                try { window.localStorage.removeItem(INTEGRATION_STORE); } catch (error) { /* blocked */ }
                integrations = mergeIntegrationState(content.integrations || []);
                renderIntegrations();
                toast("Connections reset to the demo defaults");
            });
        }
    }

    /* ---- Blog ------------------------------------------------------------- */

    function blogCard(post) {
        var authorName = (post.author && post.author.name) || "Rossell";
        return '<article class="blog-card" data-anim="up">' +
            '<div class="blog-media">' +
            '<img src="' + esc(post.image && post.image.src) + '" alt="' + esc((post.image && post.image.alt) || post.title) + '" loading="lazy" width="1200" height="800">' +
            "</div>" +
            '<div class="blog-body">' +
            '<p class="blog-meta"><span class="blog-cat">' + esc(post.category) + "</span><span>" + esc(post.readTime) + " min read</span></p>" +
            "<h3>" + esc(post.title) + "</h3>" +
            "<p>" + esc(post.excerpt) + "</p>" +
            '<div class="blog-author">' +
            '<span class="avatar" aria-hidden="true">' + esc(initials(authorName)) + "</span>" +
            "<span><strong>" + esc(authorName) + "</strong><br>" + esc(formatDate(post.publishedAt)) + "</span>" +
            "</div></div>" +
            '<button class="blog-open" type="button" data-slug="' + esc(post.slug) + '" aria-label="Read article: ' + esc(post.title) + '"></button>' +
            "</article>";
    }

    function filteredPosts() {
        return posts.filter(function (post) {
            return blogState.category === "all" || post.category === blogState.category;
        });
    }

    function renderBlog(animateCards) {
        var grid = $("#blogGrid");
        if (!grid) { return; }
        var list = filteredPosts();
        grid.innerHTML = list.slice(0, blogState.visible).map(blogCard).join("");

        var count = $("#blogCount");
        if (count) { count.textContent = list.length + (list.length === 1 ? " article" : " articles"); }

        var empty = $("#blogEmpty");
        if (empty) { empty.hidden = list.length !== 0; }

        var more = $("#blogMore");
        if (more) { more.hidden = blogState.visible >= list.length; }

        if (animateCards !== false) { revealNew($$(".blog-card", grid), "up", grid); }
    }

    function openArticle(slug) {
        var post = null;
        posts.forEach(function (candidate) { if (candidate.slug === slug) { post = candidate; } });
        if (!post) { return; }

        var image = $("#articleImage");
        if (image) {
            image.src = (post.image && post.image.src) || "";
            image.alt = (post.image && post.image.alt) || post.title;
        }
        var meta = $("#articleMeta");
        if (meta) {
            meta.textContent = post.category + " · " + formatDate(post.publishedAt) + " · " + post.readTime + " min read";
        }
        var title = $("#articleTitle");
        if (title) { title.textContent = post.title; }

        var author = $("#articleAuthor");
        if (author) {
            author.innerHTML = '<span class="avatar" aria-hidden="true">' + esc(initials(post.author && post.author.name)) + "</span>" +
                "<span><strong>" + esc((post.author && post.author.name) || "") + "</strong> — " + esc((post.author && post.author.role) || "") + "</span>";
        }

        var body = $("#articleContent");
        if (body) { body.innerHTML = (post.body || []).map(function (paragraph) { return "<p>" + esc(paragraph) + "</p>"; }).join(""); }

        openModal("articleModal");
        var card = $("#articleModal .modal-card");
        if (card) { card.scrollTop = 0; }
    }

    function initBlog() {
        renderBlog();

        var grid = $("#blogGrid");
        if (grid) {
            grid.addEventListener("click", function (event) {
                var trigger = event.target.closest ? event.target.closest(".blog-open") : null;
                if (!trigger) { return; }
                openArticle(trigger.getAttribute("data-slug"));
            });
        }

        var filters = $("#blogFilters");
        if (filters) {
            initFilterGroup(filters, function (value) {
                blogState.category = value;
                blogState.visible = POSTS_PER_PAGE;
                renderBlog();
            });
        }

        var more = $("#blogMore");
        if (more) {
            more.addEventListener("click", function () {
                blogState.visible += POSTS_PER_PAGE;
                renderBlog();
                toast("Showing more articles");
            });
        }
    }

    /* ---- Testimonials + FAQ ---------------------------------------------- */

    function renderTestimonials(list) {
        testimonials = list || testimonials;
        var grid = $("#testimonialGrid");
        if (!grid) { return; }
        grid.innerHTML = testimonials.map(function (item) {
            return '<figure class="quote-card" data-anim="up">' +
                "<blockquote>" + esc(item.quote) + "</blockquote>" +
                '<figcaption class="quote-foot">' +
                '<span class="avatar" aria-hidden="true">' + esc(initials(item.name)) + "</span>" +
                "<span><span class=\"quote-name\">" + esc(item.name) + "</span>" +
                '<span class="quote-role">' + esc(item.role) + ", " + esc(item.company) + "</span></span>" +
                "</figcaption></figure>";
        }).join("");
        revealNew($$(".quote-card", grid), "up", grid);
    }

    function renderFaqs() {
        var list = $("#faqList");
        var faqs = content.faqs || [];
        if (!list || !faqs.length) { return; }
        list.innerHTML = faqs.map(function (faq, index) {
            return '<div class="faq-item">' +
                '<button class="faq-question" type="button" id="faq-q-' + index + '" aria-expanded="false" aria-controls="faq-panel-' + index + '">' +
                "<span>" + esc(faq.question) + "</span>" +
                '<span class="faq-icon" aria-hidden="true">' +
                '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">' +
                '<path d="M12 5v14M5 12h14"/></svg></span></button>' +
                '<div class="faq-panel" id="faq-panel-' + index + '" role="region" aria-labelledby="faq-q-' + index + '">' +
                "<div><p>" + esc(faq.answer) + "</p></div></div></div>";
        }).join("");
        revealNew($$(".faq-item", list), "up", list);
    }

    function initFaq() {
        var list = $("#faqList");
        if (!list) { return; }
        list.addEventListener("click", function (event) {
            var question = event.target.closest ? event.target.closest(".faq-question") : null;
            if (!question) { return; }
            var item = question.closest(".faq-item");
            var wasOpen = item.classList.contains("is-open");

            $$(".faq-item", list).forEach(function (other) {
                other.classList.remove("is-open");
                var button = $(".faq-question", other);
                if (button) { button.setAttribute("aria-expanded", "false"); }
            });

            if (!wasOpen) {
                item.classList.add("is-open");
                question.setAttribute("aria-expanded", "true");
            }
        });
    }

    /* ============================= 9. FORMS ============================= */

    var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

    function setFieldError(input, message) {
        if (!input) { return; }
        var wrapper = input.closest(".field") || input.closest(".newsletter");
        var errorNode = document.querySelector('[data-error-for="' + input.id + '"]');
        if (errorNode) { errorNode.textContent = message || ""; }
        if (wrapper) { wrapper.classList.toggle("has-error", !!message); }
        input.setAttribute("aria-invalid", message ? "true" : "false");
    }

    function validateRequired(input, message) {
        var value = input ? input.value.trim() : "";
        if (!value) {
            setFieldError(input, message);
            return false;
        }
        setFieldError(input, "");
        return true;
    }

    function validateEmail(input, message) {
        var value = input ? input.value.trim() : "";
        if (!value) {
            setFieldError(input, "Please enter your email address.");
            return false;
        }
        if (!EMAIL_PATTERN.test(value)) {
            setFieldError(input, message || "That email address does not look right.");
            return false;
        }
        setFieldError(input, "");
        return true;
    }

    function validateContactMessage(input) {
        var value = input ? input.value.trim() : "";
        if (!value) {
            setFieldError(input, "Please tell us a little about what you need.");
            return false;
        }
        if (value.length < 10) {
            setFieldError(input, "A few more words, please (at least 10 characters).");
            return false;
        }
        setFieldError(input, "");
        return true;
    }

    function focusFirstError(form) {
        var invalid = form.querySelector("[aria-invalid='true']") || form.querySelector(".has-error input, .has-error textarea, .has-error select");
        if (invalid) { invalid.focus(); }
    }

    function setBusy(button, busy, idleLabel, busyLabel) {
        if (!button) { return; }
        var label = button.querySelector(".btn-label");
        if (label) {
            if (!button.getAttribute("data-idle-label")) {
                button.setAttribute("data-idle-label", label.textContent);
            }
            label.textContent = busy ? (busyLabel || "Sending…") : (idleLabel || button.getAttribute("data-idle-label"));
        }
        button.disabled = !!busy;
        button.classList.toggle("is-busy", !!busy);
    }

    function showStatus(node, message, isError) {
        if (!node) { return; }
        node.textContent = message || "";
        node.classList.toggle("is-error", !!isError);
        node.classList.toggle("is-ok", !isError && !!message);
    }

    function initContactForm() {
        var form = $("#contactForm");
        if (!form) { return; }
        var submit = $("#contactSubmit");
        var status = $("#contactStatus");
        var success = $("#contactSuccess");
        var successText = $("#contactSuccessText");
        var again = $("#contactAgain");
        var hideable = $$(".field-row, .field, #contactSubmit", form);

        if (again) {
            again.addEventListener("click", function () {
                hideable.forEach(function (node) { node.hidden = false; });
                if (success) { success.hidden = true; }
                showStatus(status, "");
                var name = $("#contactName");
                if (name) { name.focus(); }
            });
        }

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            var nameInput = $("#contactName");
            var emailInput = $("#contactEmail");
            var messageInput = $("#contactMessage");
            var valid = true;

            if (!validateRequired(nameInput, "Please enter your name.")) { valid = false; }
            if (!validateEmail(emailInput)) { valid = false; }
            if (!validateContactMessage(messageInput)) { valid = false; }
            if (!valid) { focusFirstError(form); return; }

            var payload = {
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                company: $("#contactCompany") ? $("#contactCompany").value.trim() : "",
                topic: $("#contactTopic") ? $("#contactTopic").value : "other",
                message: messageInput.value.trim(),
            };

            setBusy(submit, true, null, "Sending…");
            showStatus(status, "");

            var request = api ? api.postContact(payload) : Promise.resolve({ ok: true, offline: true });

            request.then(function (result) {
                setBusy(submit, false);

                if (!result.ok) {
                    showStatus(status, result.message || "Something went wrong. Please try again.", true);
                    return;
                }

                hideable.forEach(function (node) { node.hidden = true; });
                if (success) { success.hidden = false; }
                if (successText) {
                    successText.textContent = result.offline
                        ? "The API is offline, so your message was saved in this browser. Start the backend to deliver it."
                        : "Thanks — we will reply within one business day.";
                }

                form.reset();
                $$("[data-error-for]", form).forEach(function (node) { node.textContent = ""; });
                $$(".field", form).forEach(function (node) { node.classList.remove("has-error"); });
                showStatus(status, "");
                if (success && success.scrollIntoView) { success.scrollIntoView({ block: "nearest" }); }
            });
        });
    }

    function resetTrialForm() {
        var form = $("#trialForm");
        if (!form) { return; }
        $$(".field, .field-row, #trialSubmit, .form-fineprint, #trialStatus", form).forEach(function (node) {
            node.hidden = false;
        });
        var success = $("#trialSuccess");
        if (success) { success.hidden = true; }
        form.reset();
        $$("[data-error-for]", form).forEach(function (node) { node.textContent = ""; });
        $$(".field", form).forEach(function (node) { node.classList.remove("has-error"); });
        showStatus($("#trialStatus"), "");
    }

    function initTrialForm() {
        var form = $("#trialForm");
        if (!form) { return; }
        var submit = $("#trialSubmit");
        var status = $("#trialStatus");
        var success = $("#trialSuccess");
        var successText = $("#trialSuccessText");

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            var nameInput = $("#trialName");
            var emailInput = $("#trialEmail");
            var companyInput = $("#trialCompany");
            var valid = true;

            if (!validateRequired(nameInput, "Please enter your name.")) { valid = false; }
            if (!validateEmail(emailInput)) { valid = false; }
            if (!validateRequired(companyInput, "Please enter your company name.")) { valid = false; }
            if (!valid) { focusFirstError(form); return; }

            var payload = {
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                company: companyInput.value.trim(),
                teamSize: $("#trialSize") ? $("#trialSize").value : "11-50",
            };

            setBusy(submit, true, null, "Creating…");
            showStatus(status, "");

            var request = api ? api.postTrial(payload) : Promise.resolve({ ok: true, offline: true });

            request.then(function (result) {
                setBusy(submit, false);

                if (!result.ok) {
                    showStatus(status, result.message || "Could not create the workspace. Please try again.", true);
                    return;
                }

                $$(".field, .field-row, #trialSubmit, .form-fineprint, #trialStatus", form).forEach(function (node) { node.hidden = true; });
                if (success) { success.hidden = false; }
                if (successText) {
                    successText.textContent = result.offline
                        ? "Requests need the API. Start the backend, then " + payload.email + " will receive the workspace link."
                        : "Check " + payload.email + " for the workspace link.";
                }
            });
        });
    }

    function initNewsletterForm() {
        var form = $("#newsletterForm");
        if (!form) { return; }
        var input = $("#newsletterEmail");
        var submit = $("#newsletterSubmit");
        var status = $("#newsletterStatus");

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            if (!validateEmail(input)) { focusFirstError(form); return; }

            var email = input.value.trim();
            setBusy(submit, true, "Subscribe", "Sending…");
            showStatus(status, "");

            var request = api ? api.postSubscribe({ email: email, source: "footer" }) : Promise.resolve({ ok: true, offline: true });

            request.then(function (result) {
                setBusy(submit, false, "Subscribe");
                if (!result.ok) {
                    showStatus(status, result.message || "Subscription failed. Please try again.", true);
                    return;
                }
                form.reset();
                showStatus(status, result.offline ? "API offline — saved in this browser." : "Subscribed. Check your inbox.", false);
                toast("You are on the list");
            });
        });
    }

    function initForms() {
        initContactForm();
        initTrialForm();
        initNewsletterForm();
    }

    /* ============================= 10. UTILITIES ============================= */

    function openLegal(key) {
        var entry = (content.legal || {})[key];
        if (!entry) { return; }
        var title = $("#infoTitle");
        var body = $("#infoContent");
        if (title) { title.textContent = entry.title; }
        if (body) { body.innerHTML = entry.body.map(function (paragraph) { return "<p>" + esc(paragraph) + "</p>"; }).join(""); }
        openModal("infoModal");
    }

    function initPlaceholderLinks() {
        document.addEventListener("click", function (event) {
            var link = event.target.closest ? event.target.closest("[data-placeholder-link]") : null;
            if (!link) { return; }
            event.preventDefault();
            toast("Demo link — add the real URL in index.html (see the TODO comments).");
        });
    }

    function initReportDownload() {
        var button = $("#downloadReport");
        if (!button) { return; }
        button.addEventListener("click", function () {
            var metric = metricByKey(activeMetricKey) || metrics[0];
            if (!metric) {
                toast("No metrics available offline");
                return;
            }

            var rows = [["week", "metric", "value"]];
            metric.series.forEach(function (value, index) {
                rows.push(["W" + (index + 1), metric.key, value]);
            });
            var csv = rows.map(function (row) { return row.join(","); }).join("\n");

            try {
                var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                var url = window.URL.createObjectURL(blob);
                var link = document.createElement("a");
                link.href = url;
                link.download = "rossell-" + metric.key + "-sample.csv";
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 1500);
                toast("Sample CSV exported");
            } catch (error) {
                toast("This browser cannot export files here");
            }
        });
    }

    function initFooterYear() {
        var year = $("#footerYear");
        if (year) { year.textContent = String(new Date().getFullYear()); }
    }

    function hydrateFromApi() {
        if (!api) { return; }

        var jobs = [
            api.getMetrics().then(function (result) {
                if (result.source === "api" && result.data.length) {
                    metrics = result.data;
                    renderMetrics();
                }
            }),
            api.getIntegrations().then(function (result) {
                if (result.source === "api" && result.data.length) {
                    integrations = mergeIntegrationState(result.data);
                    renderIntegrations(false);
                }
            }),
            api.getPosts().then(function (result) {
                if (result.source === "api" && result.data.length) {
                    posts = result.data;
                    renderBlog(false);
                }
            }),
            api.getTestimonials().then(function (result) {
                if (result.source === "api" && result.data.length) {
                    renderTestimonials(result.data);
                }
            }),
        ];

        Promise.all(jobs).catch(function () { /* every read already falls back locally */ });
    }

    /* ============================= 11. BOOT ============================= */

    function boot() {
        initTheme();
        initCursor();
        initHeader();
        initMobileNav();
        initModals();

        initHeroTimeline();
        initParallax();
        initCounters();

        initChartTabs();
        initHeroPanel();
        renderMetrics();
        renderChannels(channels);

        initIntegrations();
        initBlog();
        renderTestimonials(testimonials);
        renderFaqs();
        initFaq();

        // Content exists now, so the reveals attach to the final DOM.
        initReveals();

        initForms();
        initReportDownload();
        initPlaceholderLinks();
        initFooterYear();

        hydrateFromApi();

        if (hasGsap && ScrollTrigger) {
            window.setTimeout(function () { ScrollTrigger.refresh(); }, 400);
            window.addEventListener("load", function () { ScrollTrigger.refresh(); });
            if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === "function") {
                document.fonts.ready.then(function () { ScrollTrigger.refresh(); }).catch(function () {});
            }
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})(window, document);
