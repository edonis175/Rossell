/**
 * scripts/api.js
 * ---------------------------------------------------------------------------
 * Thin client for the Express API in /server.
 *
 * Every read falls back to shared/content.js when the API is unreachable, so
 * the static site keeps working while the backend is being developed or when
 * it is deployed on its own (for example on Vercel static hosting).
 * ---------------------------------------------------------------------------
 */
(function (window, document) {
    "use strict";

    var base = ((document.documentElement.getAttribute("data-api-base")) || "/api").replace(/\/$/, "");
    var TIMEOUT = 4000;

    function localContent() {
        return window.ROSSELL_CONTENT || {
            posts: [],
            integrations: [],
            metrics: [],
            testimonials: [],
            channels: [],
            stats: [],
        };
    }

    function queue(key, payload) {
        // Offline fallback: keep submissions in the browser so nothing is lost
        // while the Express/MongoDB stack is not running.
        try {
            var existing = JSON.parse(window.localStorage.getItem(key) || "[]");
            existing.push({ payload: payload, queuedAt: new Date().toISOString() });
            window.localStorage.setItem(key, JSON.stringify(existing.slice(-25)));
        } catch (error) {
            /* storage can be blocked — the caller already shows a message */
        }
    }

    function request(path, options) {
        var controller = typeof window.AbortController === "function" ? new window.AbortController() : null;
        var timer = controller ? window.setTimeout(function () { controller.abort(); }, TIMEOUT) : null;
        var config = {
            headers: { "Content-Type": "application/json" },
            signal: controller ? controller.signal : undefined,
        };

        Object.keys(options || {}).forEach(function (key) {
            config[key] = options[key];
        });

        return window.fetch(base + path, config).then(function (response) {
            return response.json().catch(function () { return null; }).then(function (payload) {
                if (!response.ok) {
                    var error = new Error((payload && (payload.message || payload.error)) || "Request failed (" + response.status + ")");
                    error.status = response.status;
                    error.payload = payload;
                    throw error;
                }
                return payload;
            });
        }).finally(function () {
            if (timer) { window.clearTimeout(timer); }
        });
    }

    function read(path, fromApi, fromLocal) {
        return request(path).then(function (payload) {
            return { data: fromApi(payload), source: "api" };
        }).catch(function (error) {
            return { data: fromLocal(localContent()), source: "local", error: error };
        });
    }

    function listKey() {
        return function (payload) {
            var data = payload && payload.data;
            return Array.isArray(data) ? data : [];
        };
    }

    function submit(path, payload, queueKey) {
        return request(path, { method: "POST", body: JSON.stringify(payload) }).then(function (response) {
            return {
                ok: true,
                offline: false,
                id: response && response.data && response.data.id,
                message: (response && response.message) || "Thanks — we received it.",
            };
        }).catch(function (error) {
            // 400/409/422/429 are real answers from the Express API and should
            // be shown to the visitor. Anything else (no route, static host,
            // 5xx, network error, 503 from a disconnected Mongo) is treated as
            // offline so the submission is queued rather than lost.
            var answered = [400, 409, 422, 429].indexOf(error.status) !== -1;
            if (answered) {
                return { ok: false, message: error.message };
            }
            queue(queueKey, payload);
            return {
                ok: true,
                offline: true,
                message: "The API is offline, so this was saved in your browser instead.",
            };
        });
    }

    window.RossellAPI = {
        base: base,
        getPosts: function () {
            return read("/posts", listKey("posts"), function (content) { return content.posts || []; });
        },
        getIntegrations: function () {
            return read("/integrations", listKey("integrations"), function (content) { return content.integrations || []; });
        },
        getMetrics: function () {
            return read("/metrics", listKey("metrics"), function (content) { return content.metrics || []; });
        },
        getTestimonials: function () {
            return read("/testimonials", listKey("testimonials"), function (content) { return content.testimonials || []; });
        },
        toggleIntegration: function (slug, connected) {
            return request("/integrations/" + encodeURIComponent(slug), {
                method: "PATCH",
                body: JSON.stringify({ connected: connected }),
            });
        },
        postContact: function (payload) {
            return submit("/contact", payload, "rossell.contactQueue");
        },
        postTrial: function (payload) {
            return submit("/trials", payload, "rossell.trialQueue");
        },
        postSubscribe: function (payload) {
            return submit("/subscribers", payload, "rossell.subscriberQueue");
        },
    };
})(window, document);
