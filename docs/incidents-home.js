// Home page tile for the cyber incident and breach log.
// Loaded in the "incidents" REGISTER SLOT of index.html, after home.js and
// incidents-data.js. Fills in "7 incidents this year · 1 open · 1 ICO report due"
// using the same checks as the log page.
(function () {
  "use strict";
  if (!window.HomeTiles || !window.IncidentModel) return;

  // Escape all five HTML special characters (the school name comes from storage)
  const escAll = s => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  window.HomeTiles.add(({ $ }) => {
    const IM = window.IncidentModel;
    const progress = $("progress-incidents"), school = $("school-incidents");
    if (!progress || !school) return;
    const log = IM.loadState();
    if (!log.items.length) {
      progress.textContent = "";
      school.innerHTML = "";
      return;
    }
    const s = IM.summarise(log);
    const parts = [`${s.thisYear} incident${s.thisYear === 1 ? "" : "s"} this academic year`, `${s.open} open`];
    if (s.icoDue) parts.push(`${s.icoDue} ICO report${s.icoDue === 1 ? "" : "s"} due`);
    if (s.Red) parts.push(`${s.Red} need${s.Red === 1 ? "s" : ""} action now`);
    progress.textContent = parts.join(" · ");
    school.innerHTML = log.school.name
      ? `School: <strong>${escAll(log.school.name)}</strong>${log.school.urn ? " (URN " + escAll(log.school.urn) + ")" : ""}` : "";
  });
})();
