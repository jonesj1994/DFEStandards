// Home page tile for the hardware and asset register: "48 assets · 3 need
// attention", worked out with the same rules as the register page
// (hardware-data.js). Loaded in the hardware REGISTER SLOT of index.html,
// after home.js, which provides window.HomeTiles.
(function () {
  "use strict";
  if (!window.HomeTiles) return;
  window.HomeTiles.add(({ $, schoolLine }) => {
    const HM = window.HardwareModel;
    const progress = $("progress-hardware"), school = $("school-hardware");
    if (!HM || !progress || !school) return;
    const r = HM.loadState();
    if (!r.items.length) {
      progress.textContent = "";
      school.innerHTML = "";
      return;
    }
    const s = HM.summarise(r);
    progress.textContent = `${s.total} asset${s.total === 1 ? "" : "s"} · ` +
      (s.attention ? `${s.attention} need${s.attention === 1 ? "s" : ""} attention` : "nothing needs attention");
    // schoolLine escapes the name and URN
    school.innerHTML = schoolLine(r.school.name, r.school.urn);
  });
})();
