/**
 * Mermaid diagram click-to-zoom for Material for MkDocs.
 *
 * Material wraps rendered Mermaid SVGs in a closed shadow DOM,
 * so we patch Element.prototype.attachShadow to capture shadow root
 * references in a WeakMap, then use those to reach into the shadow
 * DOM for click-to-zoom.
 */
(function () {
  "use strict";

  // Store closed shadow roots so we can query into them later
  var shadowRoots = new WeakMap();
  var origAttachShadow = Element.prototype.attachShadow;

  Element.prototype.attachShadow = function (init) {
    var shadowRoot = origAttachShadow.call(this, init);
    shadowRoots.set(this, shadowRoot);
    return shadowRoot;
  };

  function getShadowSvg(container) {
    // Try shadow root first (closed mode), then fall back to direct query
    var root = shadowRoots.get(container);
    if (root) return root.querySelector("svg");
    return container.querySelector("svg");
  }

  function attachZoomHandlers() {
    document.querySelectorAll(".mermaid").forEach(function (container) {
      if (container.dataset.zoomAttached) return;
      container.dataset.zoomAttached = "true";

      container.addEventListener("click", function () {
        var svg = getShadowSvg(container);
        if (!svg) return;

        // Create overlay
        var overlay = document.createElement("div");
        overlay.className = "mermaid-zoom-overlay";

        // Hint text
        var hint = document.createElement("span");
        hint.className = "zoom-hint";
        hint.textContent = "ESC or click to close";
        overlay.appendChild(hint);

        // Wrapper with open shadow DOM to preserve CSS scoping
        var wrapper = document.createElement("div");
        wrapper.className = "zoom-diagram";
        var wrapperShadow = wrapper.attachShadow({ mode: "open" });

        // Clone entire shadow root content (styles + SVG + any other nodes)
        var sourceRoot = shadowRoots.get(container);
        if (sourceRoot) {
          Array.from(sourceRoot.childNodes).forEach(function (node) {
            wrapperShadow.appendChild(node.cloneNode(true));
          });
        } else {
          // Fallback: clone SVG directly from light DOM
          wrapperShadow.appendChild(svg.cloneNode(true));
        }

        // Ensure the cloned SVG has a viewBox so it scales proportionally
        var clonedSvg = wrapperShadow.querySelector("svg");
        if (clonedSvg) {
          if (!clonedSvg.getAttribute("viewBox")) {
            var rect = svg.getBoundingClientRect();
            if (rect.width && rect.height) {
              clonedSvg.setAttribute(
                "viewBox",
                "0 0 " + rect.width + " " + rect.height
              );
            }
          }
          clonedSvg.removeAttribute("width");
          clonedSvg.removeAttribute("height");
          clonedSvg.style.width = "";
          clonedSvg.style.height = "";
          clonedSvg.style.maxWidth = "";
        }

        // Inject sizing style inside shadow DOM (external CSS can't reach in)
        var sizeStyle = document.createElement("style");
        sizeStyle.textContent =
          ":host { display: block; width: 88vw; max-height: 80vh; overflow: auto; }" +
          "svg { width: 100%; height: auto; display: block; }";
        wrapperShadow.appendChild(sizeStyle);

        overlay.appendChild(wrapper);
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

  // Debounced MutationObserver to catch async Mermaid renders
  var debounceTimer = null;
  var observing = false;
  var observer = new MutationObserver(function () {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(attachZoomHandlers, 100);
  });

  function init() {
    if (!observing) {
      observer.observe(document.body, { childList: true, subtree: true });
      observing = true;
    }
    attachZoomHandlers();
  }

  // Always init on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Also subscribe to document$ for SPA navigation (navigation.instant)
  if (typeof document$ !== "undefined") {
    document$.subscribe(function () {
      init();
    });
  }
})();
