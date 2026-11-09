// Shared page layout for the tool pages: lets the user hide the left-hand
// menu on larger screens (on phones the menu already slides in and out with
// the ☰ button). The choice is remembered in this browser.
(function () {
  "use strict";
  const KEY = "sidebar_collapsed_v1";
  const topbar = document.getElementById("topbar");
  const sidebar = document.getElementById("sidebar");
  if (!topbar || !sidebar) return;

  let collapsed = false;
  try { collapsed = localStorage.getItem(KEY) === "1"; } catch (e) { /* storage unavailable */ }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "sidebar-collapse";
  btn.className = "sidebar-collapse";
  btn.setAttribute("aria-controls", "sidebar");
  topbar.insertBefore(btn, topbar.firstChild);

  function apply() {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    btn.setAttribute("aria-expanded", String(!collapsed));
    btn.innerHTML = collapsed
      ? '<span aria-hidden="true">&#9776;</span> Show menu'
      : '<span aria-hidden="true">&#171;</span> Hide menu';
    btn.title = collapsed ? "Show the menu" : "Hide the menu to make more room";
  }

  let animTimer = null;
  btn.addEventListener("click", () => {
    collapsed = !collapsed;
    document.body.classList.add("sidebar-animating");
    clearTimeout(animTimer);
    animTimer = setTimeout(() => document.body.classList.remove("sidebar-animating"), 300);
    try { localStorage.setItem(KEY, collapsed ? "1" : "0"); } catch (e) { /* storage unavailable */ }
    apply();
  });
  apply();
})();
