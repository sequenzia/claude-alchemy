/**
 * Mermaid diagram click-to-zoom for Material for MkDocs.
 *
 * Uses MutationObserver to detect async-rendered Mermaid SVGs,
 * attaches click handlers, and works with navigation.instant.
 */
(function () {
  "use strict";

  function attachZoomHandlers() {
    document.querySelectorAll(".mermaid").forEach(function (container) {
      if (container.dataset.zoomAttached) return;
      container.dataset.zoomAttached = "true";

      container.addEventListener("click", function () {
        var svg = container.querySelector("svg");
        if (!svg) return;

        // Create overlay
        var overlay = document.createElement("div");
        overlay.className = "mermaid-zoom-overlay";

        // Hint text
        var hint = document.createElement("span");
        hint.className = "zoom-hint";
        hint.textContent = "ESC or click to close";
        overlay.appendChild(hint);

        // Clone SVG and strip inline dimensions so CSS controls sizing
        var clone = svg.cloneNode(true);
        clone.removeAttribute("width");
        clone.removeAttribute("height");
        clone.style.width = "";
        clone.style.height = "";
        clone.style.maxWidth = "";
        overlay.appendChild(clone);

        document.body.appendChild(overlay);

        // Trigger reflow then activate for transition
        overlay.offsetHeight; // eslint-disable-line no-unused-expressions
        overlay.classList.add("active");

        function close() {
          overlay.classList.remove("active");
          overlay.addEventListener("transitionend", function () {
            overlay.remove();
          });
          document.removeEventListener("keydown", onKey);
        }

        function onKey(e) {
          if (e.key === "Escape") close();
        }

        overlay.addEventListener("click", close);
        document.addEventListener("keydown", onKey);
      });
    });
  }

  // Observe DOM for async Mermaid renders
  var observer = new MutationObserver(function () {
    attachZoomHandlers();
  });

  function init() {
    observer.observe(document.body, { childList: true, subtree: true });
    attachZoomHandlers();
  }

  // Support Material's navigation.instant (SPA page transitions)
  if (typeof document$ !== "undefined") {
    document$.subscribe(function () {
      init();
    });
  } else {
    // Fallback for initial load
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }
})();
