// Test pages: label each page Live or Coming soon from features.js, so this
// page always matches what the home page shows.
(function () {
  "use strict";
  const F = window.Features;
  document.querySelectorAll(".tp-item").forEach(item => {
    const id = item.dataset.feature;
    const live = !id || !F || F.isLive(id);
    const tag = document.createElement("span");
    tag.className = "tp-status " + (live ? "live" : "soon");
    tag.textContent = live ? "Live" : "Coming soon";
    const h = item.querySelector("h3");
    if (h) h.insertBefore(tag, h.querySelector(".tp-path"));
    // File it under the right heading
    const list = document.getElementById(live ? "tp-live" : "tp-soon");
    if (list && item.parentElement !== list) list.appendChild(item);
  });
  ["live", "soon"].forEach(k => {
    const list = document.getElementById("tp-" + k), h = document.getElementById("tp-" + k + "-h");
    if (list && h && !list.children.length) { list.hidden = true; h.hidden = true; }
  });
})();
