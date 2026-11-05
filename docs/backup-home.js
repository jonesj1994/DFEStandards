// Home page tile for the backup and disaster recovery register.
// Loaded in index.html's "REGISTER SLOT: backup", after home.js and backup-data.js.
// Shows e.g. "9 backups · last restore test 12 Oct 2026 · 1 needs attention",
// worked out with the same rules as the register page.
(function () {
  "use strict";
  if (!window.HomeTiles || !window.BackupModel) return;
  window.HomeTiles.add(({ esc, $, schoolLine }) => {
    const BM = window.BackupModel;
    const r = BM.loadState();
    const progress = $("progress-backup");
    const school = $("school-backup");
    if (!progress || !school) return;
    if (!r.items.length && !r.log.length) {
      progress.textContent = "";
      school.innerHTML = "";
      return;
    }
    const s = BM.summarise(r);
    const parts = [`${s.active} backup${s.active === 1 ? "" : "s"}`];
    parts.push(s.lastTest ? `last restore test ${BM.formatDateLong(s.lastTest)}` : "no restore test logged");
    const attention = s.attention + (s.plan.rag === "Red" || s.plan.rag === "Amber" ? 1 : 0);
    parts.push(attention ? `${attention} need${attention === 1 ? "s" : ""} attention` : "nothing needs attention");
    progress.textContent = parts.join(" · ");
    school.innerHTML = schoolLine(r.school.name, r.school.urn);
  });
})();
