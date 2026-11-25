/* =====================================================================
   Rossell — 404 page behaviour
   Dependency-free: theme toggle (same storage key as the main site),
   the magnetic 404, the requested path and the zero's running joke.
   ===================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;
  var themeToggle = document.getElementById("themeToggle");
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var reduceQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  function getStoredTheme() {
    try {
      var value = window.localStorage.getItem("theme");
      return value === "dark" || value === "light" ? value : null;
    } catch (error) {
      return null;
    }
  }

  /* ------------------------------- theme ------------------------------ */

  function applyTheme(theme, persist) {
    var isDark = theme === "dark";
    root.setAttribute("data-theme", theme);
    root.classList.toggle("dark-mode", isDark);

    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", isDark ? "true" : "false");
      themeToggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    }

    if (themeMeta) {
      themeMeta.setAttribute("content", isDark ? "#121210" : "#f6f3eb");
    }

    if (persist) {
      try {
        window.localStorage.setItem("theme", theme);
      } catch (error) { /* blocked storage — the choice just will not persist */ }
    }
  }

  if (themeToggle) {
    applyTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light", false);

    themeToggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next, true);

      themeToggle.classList.remove("is-flipping");
      void themeToggle.offsetWidth; // restart the CSS animation
      themeToggle.classList.add("is-flipping");
    });

    // Follow the system only while the visitor has not picked a theme.
    if (window.matchMedia) {
      var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
      if (typeof darkQuery.addEventListener === "function") {
        darkQuery.addEventListener("change", function (event) {
          if (!getStoredTheme()) {
            applyTheme(event.matches ? "dark" : "light", false);
          }
        });
      }
    }
  }

  /* --------------------------- requested path -------------------------- */

  var pathEl = document.getElementById("lostPath");
  if (pathEl) {
    var requested = (window.location.pathname || "/") + (window.location.search || "");
    pathEl.textContent = requested.length > 64 ? requested.slice(0, 61) + "..." : requested;
  }

  /* ------------------------- the magnetic number ----------------------- */

  var digits = Array.prototype.slice.call(document.querySelectorAll("[data-magnet]"));
  var coarsePointer = window.matchMedia ? window.matchMedia("(pointer: coarse)").matches : false;
  // Touch screens get the still version: a digit jumping to a finger is noise.
  var motionEnabled = !coarsePointer && !(reduceQuery && reduceQuery.matches);
  var pointer = { x: 0, y: 0, active: false };
  var states = digits.map(function () {
    return { x: 0, y: 0, rotate: 0 };
  });
  var running = false;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function tick() {
    var viewportWidth = window.innerWidth || 1;
    var reach = Math.max(340, viewportWidth * 0.7);
    var anyBusy = false;

    digits.forEach(function (digit, index) {
      var state = states[index];
      var strength = parseFloat(digit.getAttribute("data-magnet")) || 0.4;
      var targetX = 0;
      var targetY = 0;
      var targetRotate = 0;

      if (pointer.active) {
        var rect = digit.getBoundingClientRect();
        var centerX = rect.left + rect.width / 2;
        var centerY = rect.top + rect.height / 2;
        var dx = pointer.x - centerX;
        var dy = pointer.y - centerY;
        var distance = Math.sqrt(dx * dx + dy * dy) || 1;
        // Squared falloff: a digit barely reacts until the cursor is close,
        // then it leans toward it and eases back once the cursor moves away.
        var pull = Math.max(0, 1 - distance / reach);
        pull = pull * pull;
        var shift = 76 * strength * pull;

        targetX = clamp((dx / distance) * shift, -90, 90);
        targetY = clamp((dy / distance) * shift, -90, 90);
        targetRotate = clamp((dx / viewportWidth) * 6 * strength * pull, -6, 6);
      }

      var ease = 0.14;
      state.x += (targetX - state.x) * ease;
      state.y += (targetY - state.y) * ease;
      state.rotate += (targetRotate - state.rotate) * ease;

      var settled =
        Math.abs(state.x) < 0.01 &&
        Math.abs(state.y) < 0.01 &&
        Math.abs(state.rotate) < 0.01;

      if (settled) {
        state.x = 0;
        state.y = 0;
        state.rotate = 0;
        digit.style.transform = "";
        digit.style.rotate = "";
      } else {
        anyBusy = true;
        digit.style.transform =
          "translate3d(" + state.x.toFixed(2) + "px," + state.y.toFixed(2) + "px,0)";
        digit.style.rotate = state.rotate.toFixed(2) + "deg";
      }
    });

    if (anyBusy) {
      window.requestAnimationFrame(tick);
    } else {
      running = false;
    }
  }

  function ensureLoop() {
    if (!running) {
      running = true;
      window.requestAnimationFrame(tick);
    }
  }

  function startMagnet() {
    if (!digits.length || !window.requestAnimationFrame || !motionEnabled) {
      return;
    }

    window.addEventListener("pointermove", function (event) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
      ensureLoop();
    }, { passive: true });

    window.addEventListener("pointerdown", function (event) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
      ensureLoop();
    }, { passive: true });

    function release() {
      pointer.active = false;
      ensureLoop();
    }

    window.addEventListener("pointerleave", release);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        release();
      }
    });
  }

  startMagnet();

  /* -------------------------- the zero's joke -------------------------- */

  var zero = document.getElementById("lostZero");
  var reaction = document.getElementById("lostReaction");
  var reactions = [
    "Nope. Still missing.",
    "That zero is not a door.",
    "It only spins. The button below is real.",
    "Alright, the homepage is that way."
  ];
  var reactionIndex = 0;

  if (zero) {
    zero.addEventListener("click", function () {
      if (reaction) {
        reaction.textContent = reactions[reactionIndex % reactions.length];
        reactionIndex += 1;
        reaction.classList.add("is-visible");
      }

      zero.classList.remove("is-spinning");
      void zero.offsetWidth; // restart the spin
      zero.classList.add("is-spinning");
    });

    zero.addEventListener("animationend", function (event) {
      if (event.animationName === "lost-spin") {
        zero.classList.remove("is-spinning");
      }
    });
  }
})();
