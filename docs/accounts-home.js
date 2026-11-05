// Home page tile for the user accounts register: "62 accounts · 4 need attention",
// worked out with the same rules as the register page (accounts-data.js).
// Loaded in the accounts REGISTER SLOT of index.html, after home.js.
(function () {
  "use strict";
  if (!window.HomeTiles || !window.AccountsModel) return;
  window.HomeTiles.add(({ $, schoolLine }) => {
    const AM = window.AccountsModel;
    const progress = $("progress-accounts"), school = $("school-accounts");
    if (!progress || !school) return;
    const r = AM.loadState();
    if (!r.items.length) {
      progress.textContent = "";
      school.innerHTML = "";
      return;
    }
    const s = AM.summarise(r);
    const parts = [`${s.total} account${s.total === 1 ? "" : "s"}`,
      s.attention ? `${s.attention} need${s.attention === 1 ? "s" : ""} attention` : "nothing needs attention"];
    if (s.leavers) parts.push(`${s.leavers} leaver${s.leavers === 1 ? "" : "s"} still active`);
    // textContent, so nothing here is ever read as HTML
    progress.textContent = parts.join(" · ");
    // schoolLine escapes the name and URN itself
    school.innerHTML = schoolLine(r.school.name, r.school.urn);
  });
})();
