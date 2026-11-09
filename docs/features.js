// Which parts of the toolkit are released. Anything listed in COMING_SOON:
//  - shows as a greyed-out "Coming soon" card on the home page (no link), and
//  - still works if opened directly (for testing), with a "Preview" label in
//    its top bar. test-pages.html links to every page.
// To release a section, remove its id from COMING_SOON.
(function () {
  "use strict";

  const COMING_SOON = ["ce", "register", "hardware", "accounts", "backup", "incidents"];

  // id -> page, so a page can tell whether it is a preview
  const PAGES = {
    dfe: "dfe.html", ce: "ce.html", trust: "trust.html", register: "register.html",
    hardware: "hardware.html", accounts: "accounts.html", backup: "backup.html", incidents: "incidents.html"
  };

  const isLive = id => !COMING_SOON.includes(id);

  // Home page: turn each coming-soon card (marked data-feature="id") into a
  // plain, unlinked card
  function markCards() {
    document.querySelectorAll(".tracker-card[data-feature]").forEach(card => {
      if (isLive(card.dataset.feature)) return;
      card.classList.add("coming-soon");
      card.removeAttribute("href");
      card.setAttribute("aria-disabled", "true");
      const btn = card.querySelector(".btn");
      if (btn) btn.textContent = "Coming soon";
      const h = card.querySelector("h3");
      if (h && !h.querySelector(".soon-tag")) {
        const tag = document.createElement("span");
        tag.className = "soon-tag";
        tag.textContent = "Coming soon";
        h.appendChild(document.createTextNode(" "));
        h.appendChild(tag);
      }
    });
  }

  // A coming-soon page opened directly: label it as a preview
  function markPreview() {
    const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const id = Object.keys(PAGES).find(k => PAGES[k] === page);
    if (!id || isLive(id)) return;
    // Next to the title, not inside it: pages rewrite the title as you move around
    const title = document.getElementById("topbar-title");
    if (!title || document.querySelector(".preview-tag")) return;
    const tag = document.createElement("span");
    tag.className = "preview-tag";
    tag.title = "This page is not released yet. It is shown for testing only.";
    tag.textContent = "Preview: coming soon";
    title.insertAdjacentElement("afterend", tag);
  }

  window.Features = { COMING_SOON: COMING_SOON.slice(), PAGES: Object.assign({}, PAGES), isLive };

  // Run now (this script is loaded at the end of the page, after the cards)
  // and again once the page has loaded, in case it was loaded earlier
  function run() { markCards(); markPreview(); }
  run();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
})();
